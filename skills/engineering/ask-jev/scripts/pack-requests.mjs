#!/usr/bin/env node
// usage: node pack-requests.mjs <question-set.json> <out-dir>
// Turns the question set ask-jev writes into requests ready to send to Jev. Node built-ins only.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { inflateSync, deflateSync, crc32 } from 'node:zlib';

// Token budgets for the estimates below; when TypeSafe changes its limits, change them here.
// stateAndOneQuestion: TypeSafe documents 32k for jev-1.13.0; 30k leaves room for estimate error.
// perRequest: TypeSafe documents 64k, but a request estimated at ~42k was refused with max_tokens_exceeded
// while 30k batches passed, so this is the measured figure, not the documented one.
const BUDGET = { stateAndOneQuestion: 30_000, perRequest: 30_000 };

// Jev's image limits (https://docs.typesafe.ai/images): PNG or JPEG, each side and the total pixel count in range, inclusive.
const IMAGE = { minSide: 280, maxSide: 1568, minPixels: 78_400, maxPixels: 2_458_624 };
// Jev accepts assets only on a request sent with this header; a text-only request is sent without it.
const IMAGE_HEADER = 'TypeSafe-Danger-Zone-Images: true';

// The fixed last option of every question, which lets Jev route a question it cannot settle to the PM.
const ASK_PM = 'Only the PM can settle this: it depends on a business rule, a product decision, or information the design and common UX practice do not determine.';

class BuildError extends Error {}

// ---- PNG: 8-bit RGB/RGBA, non-interlaced, which is what Figma exports ----

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function pngChunks(buf) {
  const chunks = [];
  for (let off = 8; off < buf.length; ) {
    const len = buf.readUInt32BE(off);
    chunks.push({ type: buf.toString('ascii', off + 4, off + 8), data: buf.subarray(off + 8, off + 8 + len) });
    off += 12 + len;
  }
  return chunks;
}

function pngHeader(buf) {
  const ihdr = pngChunks(buf).find((c) => c.type === 'IHDR').data;
  return { width: ihdr.readUInt32BE(0), height: ihdr.readUInt32BE(4), bitDepth: ihdr[8], colorType: ihdr[9], interlace: ihdr[12] };
}

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

// Returns the cropped region as a new PNG whose rows all use filter 0.
function cropPng(buf, [x0, y0, w, h], where) {
  const { width, height, bitDepth, colorType, interlace } = pngHeader(buf);
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
    throw new BuildError(`${where}: can only crop 8-bit RGB or RGBA non-interlaced PNGs (this one has bit depth ${bitDepth}, colour type ${colorType}, interlace ${interlace}); export it again from Figma as PNG`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const filtered = inflateSync(Buffer.concat(pngChunks(buf).filter((c) => c.type === 'IDAT').map((c) => c.data)));
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = filtered[y * (stride + 1)];
    const src = y * (stride + 1) + 1, row = y * stride, prev = row - stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? raw[row + i - bpp] : 0;
      const b = y > 0 ? raw[prev + i] : 0;
      const c = y > 0 && i >= bpp ? raw[prev + i - bpp] : 0;
      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
      raw[row + i] = (filtered[src + i] + pred) & 255;
    }
  }
  const out = Buffer.alloc((w * bpp + 1) * h);
  for (let y = 0; y < h; y++) raw.copy(out, y * (w * bpp + 1) + 1, (y0 + y) * stride + x0 * bpp, (y0 + y) * stride + (x0 + w) * bpp);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = colorType;
  return Buffer.concat([PNG_SIGNATURE, pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(out)), pngChunk('IEND', Buffer.alloc(0))]);
}

function pngChunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// ---- JPEG: passed through as exported; only its size is read, from the first start-of-frame segment ----

function jpegSize(buf, where) {
  for (let off = 2; off + 9 < buf.length; ) {
    if (buf[off] !== 0xff) break;
    const marker = buf[off + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
    }
    off += 2 + buf.readUInt16BE(off + 2);
  }
  throw new BuildError(`${where}: cannot find the JPEG's size`);
}

// ---- images ----

// One crop of one exported image; questions that list the same path and crop share it.
function loadImage(image, baseDir, where, cache) {
  const path = resolve(baseDir, image.path);
  const key = JSON.stringify([path, image.crop ?? null]);
  if (cache.has(key)) return cache.get(key);
  if (!existsSync(path)) throw new BuildError(`${where}: file not found`);
  const src = readFileSync(path);
  const format = src.subarray(0, 8).equals(PNG_SIGNATURE) ? 'png' : src[0] === 0xff && src[1] === 0xd8 ? 'jpg' : null;
  if (!format) throw new BuildError(`${where}: not a PNG or JPEG`);
  let bytes = src;
  if (image.crop) {
    if (format === 'jpg') throw new BuildError(`${where}: JPEGs are attached uncropped; export the region as PNG to crop it`);
    const [x, y, w, h] = image.crop;
    const full = pngHeader(src);
    if (!(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= full.width && y + h <= full.height)) {
      throw new BuildError(`${where}: crop [${image.crop}] does not fit inside the ${full.width}x${full.height} image`);
    }
    bytes = cropPng(src, image.crop, where);
  }
  const { width, height } = format === 'png' ? pngHeader(bytes) : jpegSize(bytes, where);
  const pixels = width * height;
  if (width < IMAGE.minSide || height < IMAGE.minSide || width > IMAGE.maxSide || height > IMAGE.maxSide || pixels < IMAGE.minPixels || pixels > IMAGE.maxPixels) {
    throw new BuildError(`${where}: ${width}x${height} is outside Jev's image limits (each side ${IMAGE.minSide}-${IMAGE.maxSide} px, ${IMAGE.minPixels}-${IMAGE.maxPixels} pixels in total); crop or export it differently`);
  }
  const ref = `asset-${createHash('sha256').update(key).digest('hex').slice(0, 12)}`;
  const stem = `${basename(path, extname(path))}${image.crop ? `-${image.crop.join('-')}` : ''}`;
  const taken = [...cache.values()].some((img) => img.name === `${stem}.${format}`);
  const name = taken ? `${stem}-${ref.slice('asset-'.length)}.${format}` : `${stem}.${format}`;
  // Measured on jev-1.13.0: 1024x1412 cost ~4,000 input tokens, 1024x550 cost 1,762.
  const tokens = Math.floor(pixels / 360) + 85;
  const loaded = { ref, bytes, format, width, height, name, node: image.node, tokens };
  cache.set(key, loaded);
  return loaded;
}

// Jev replaces every occurrence of a reference string in the request with its image, so a reference that
// also occurs inside the caller's text would multiply that image.
function checkReferences(request, name) {
  const strings = [];
  const walk = (v) => {
    if (typeof v === 'string') strings.push(v);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { strings.push(k); walk(x); }
  };
  walk({ ...request, assets: undefined });
  for (const ref of Object.keys(request.assets ?? {})) {
    const clash = strings.find((s) => s !== ref && s.includes(ref));
    if (clash !== undefined) throw new BuildError(`${name}: reference ${ref} also occurs inside "${clash.slice(0, 80)}"; reword that text`);
  }
}

function main([setPath, outDir]) {
  if (!setPath || !outDir) throw new BuildError('usage: node pack-requests.mjs <question-set.json> <out-dir>');
  if (existsSync(outDir) && readdirSync(outDir).length > 0) throw new BuildError(`${outDir} is not empty; give a new or empty folder`);
  let set;
  try {
    set = JSON.parse(readFileSync(setPath, 'utf8'));
  } catch (e) {
    throw new BuildError(`cannot read the question set ${setPath}: ${e.message}`);
  }
  if (!set.model || set.state == null || !Array.isArray(set.questions) || set.questions.length === 0) throw new BuildError('the question set needs model, state, and a non-empty questions list');
  const baseDir = dirname(resolve(setPath));
  const seen = new Set();
  for (const q of set.questions) {
    if (!q.id || !q.question || !q.design_facts || !q.options || Object.keys(q.options).length === 0) {
      throw new BuildError(`question ${q.id ?? '(no id)'} needs id, question, design_facts, and options`);
    }
    if ('ask_pm' in q.options) throw new BuildError(`${q.id}: remove the ask_pm option; the script adds it with the fixed wording`);
    if (seen.has(q.id)) throw new BuildError(`question id ${q.id} appears more than once`);
    seen.add(q.id);
  }

  // Build and check everything in memory first, so a failed build leaves the out folder untouched.
  const cache = new Map();
  const stateTokens = textTokens(set.state);
  const packed = set.questions.map((q) => {
    const images = (q.images ?? []).map((image, i) => loadImage(image, baseDir, `${q.id} image ${i + 1} (${image.path})`, cache));
    const instructions = {
      question: `${q.question} Base the answer on \`design_facts\`, ${images.length ? 'the screenshots, ' : ''}and the shared spec in \`state\`.`,
      design_facts: q.design_facts,
    };
    images.forEach((img, i) => { instructions[`screenshot_${i + 1}`] = img.ref; });
    const body = { type: 'choice', instructions, criteria: { ...q.options, ask_pm: ASK_PM } };
    // Jev expands each reference where it occurs, so an image costs once per question that uses it.
    const tokens = textTokens({ [q.id]: body }) + images.reduce((sum, img) => sum + img.tokens, 0);
    if (stateTokens + tokens > BUDGET.stateAndOneQuestion) {
      throw new BuildError(`${q.id}: state plus this question is ~${fmt(stateTokens + tokens)} tokens, over the ${fmt(BUDGET.stateAndOneQuestion)} budget for state plus one question; drop or shrink its screenshots`);
    }
    return { id: q.id, body, images, tokens };
  });

  const batches = [];
  for (const q of packed) {
    const last = batches.at(-1);
    if (last && last.tokens + q.tokens <= BUDGET.perRequest) {
      last.questions.push(q);
      last.tokens += q.tokens;
    } else {
      batches.push({ questions: [q], tokens: stateTokens + q.tokens });
    }
  }

  const files = batches.map((batch, i) => {
    const name = `request-${i + 1}.json`;
    const images = [...new Map(batch.questions.flatMap((q) => q.images).map((img) => [img.ref, img])).values()];
    const request = { model: set.model, state: set.state, questions: Object.fromEntries(batch.questions.map((q) => [q.id, q.body])) };
    const readable = { ...request };
    if (images.length > 0) {
      request.assets = Object.fromEntries(images.map((img) => [img.ref, { type: 'image', format: img.format, data_base64: img.bytes.toString('base64') }]));
      readable.assets = Object.fromEntries(images.map((img) => [img.ref, { type: 'image', format: img.format, file: `crops/${img.name}`, node: img.node }]));
    }
    checkReferences(request, name);
    return { name, request, readable, images, batch };
  });

  mkdirSync(join(outDir, 'crops'), { recursive: true });
  for (const img of cache.values()) writeFileSync(join(outDir, 'crops', img.name), img.bytes);
  for (const { name, request, readable, images, batch } of files) {
    writeFileSync(join(outDir, name), JSON.stringify(request));
    writeFileSync(join(outDir, name.replace(/\.json$/, '.readable.json')), JSON.stringify(readable, null, 2));
    const send = images.length > 0 ? `add -H "${IMAGE_HEADER}"` : 'text only';
    console.log(`${name}: ${batch.questions.map((q) => q.id).join(', ')}; ${images.length} images; ~${fmt(batch.tokens)} tokens; ${send}`);
  }
  console.log(`state: ~${fmt(stateTokens)} tokens, counted in every request`);
}

const fmt = (n) => n.toLocaleString('en-US');

// Hangul Jamo; CJK symbols and punctuation, Hiragana, Katakana; Hangul compatibility Jamo; CJK Unified Ideographs
// and Extension A; Hangul syllables; halfwidth and fullwidth forms.
const CJK = /[\u1100-\u11ff\u3000-\u30ff\u3130-\u318f\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uff00-\uffef]/;

// Text costs about one token per three non-CJK characters and one per CJK character.
function textTokens(value) {
  let cjk = 0, other = 0;
  for (const ch of JSON.stringify(value)) CJK.test(ch) ? cjk++ : other++;
  return Math.floor(other / 3) + cjk;
}

try {
  main(process.argv.slice(2));
} catch (e) {
  if (!(e instanceof BuildError)) throw e;
  console.error(`pack-requests: ${e.message}`);
  process.exit(1);
}
