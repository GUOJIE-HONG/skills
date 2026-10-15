// Run with `node --test` from this folder. Each test writes a question set and fixture images to a temp
// folder, runs pack-requests.mjs as a user would, and reads only its output folder, stdout, and exit code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync, crc32 } from 'node:zlib';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'pack-requests.mjs');
const ASK_PM = 'Only the PM can settle this: it depends on a business rule, a product decision, or information the design and common UX practice do not determine.';

function workdir() {
  return mkdtempSync(join(tmpdir(), 'pack-requests-'));
}

function run(dir, set, outName = 'out') {
  const setPath = join(dir, 'questions.json');
  writeFileSync(setPath, JSON.stringify(set));
  const out = join(dir, outName);
  const r = spawnSync(process.execPath, [SCRIPT, setPath, out], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, out };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function questionSet(questions, extra = {}) {
  return { model: 'jev-latest', state: { product: 'Site log app.' }, questions, ...extra };
}

function question(id, images = [], extra = {}) {
  return {
    id,
    question: `Which filters should the list offer (${id})?`,
    design_facts: 'The note lists 「搜尋案件」 (search case); the mockup shows a 「狀態」 (status) dropdown.',
    options: { follow_notes: 'Search case and date range.', follow_mockup: 'Search case and status dropdown.' },
    images,
    ...extra,
  };
}

// The pixel at (x, y) of every fixture, so a crop's expected pixels come from this formula, not from the script.
function pixel(x, y, channels) {
  const px = [(x * 7) & 255, (y * 5) & 255, (x + y * 3) & 255, 255 - ((x ^ y) & 127)];
  return px.slice(0, channels);
}

const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

// Writes an 8-bit PNG whose rows cycle through all five filter types, as real exporters mix them.
function writePng(path, width, height, { channels = 4, interlace = 0, pattern = true } = {}) {
  const stride = width * channels;
  const raw = Buffer.alloc(stride * height);
  if (pattern) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) raw.set(pixel(x, y, channels), y * stride + x * channels);
  }
  const rows = [];
  for (let y = 0; y < height; y++) {
    const f = y % 5;
    const row = Buffer.alloc(stride + 1);
    row[0] = f;
    for (let i = 0; i < stride; i++) {
      const cur = raw[y * stride + i];
      const a = i >= channels ? raw[y * stride + i - channels] : 0;
      const b = y > 0 ? raw[(y - 1) * stride + i] : 0;
      const c = y > 0 && i >= channels ? raw[(y - 1) * stride + i - channels] : 0;
      let pred = 0;
      if (f === 1) pred = a;
      else if (f === 2) pred = b;
      else if (f === 3) pred = (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[i + 1] = (cur - pred) & 255;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = channels === 4 ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = interlace;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
  return path;
}

// Reads a PNG whose rows all use filter 0, the only filter the script promises to write.
function readPng(buf) {
  let off = 8, ihdr, idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8), data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') ihdr = data;
    if (type === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  const width = ihdr.readUInt32BE(0), height = ihdr.readUInt32BE(4), channels = ihdr[9] === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const at = (x, y) => {
    assert.equal(raw[y * (stride + 1)], 0, `row ${y} is not filter 0`);
    const o = y * (stride + 1) + 1 + x * channels;
    return [...raw.subarray(o, o + channels)];
  };
  return { width, height, channels, at };
}

// Every image a request carries, as decoded from its base64.
function attachedImages(request) {
  return Object.entries(request.assets ?? {}).map(([ref, a]) => ({ ref, ...a, bytes: Buffer.from(a.data_base64, 'base64') }));
}

test('a run without images writes one request with no assets and ask_pm appended to every question', () => {
  const dir = workdir();
  const r = run(dir, questionSet([question('q1'), question('q2')]));
  assert.equal(r.status, 0, r.stderr);

  const req = readJson(join(r.out, 'request-1.json'));
  assert.equal(req.model, 'jev-latest');
  assert.deepEqual(req.state, { product: 'Site log app.' });
  assert.equal('assets' in req, false);
  assert.deepEqual(Object.keys(req.questions), ['q1', 'q2']);
  for (const q of Object.values(req.questions)) {
    assert.equal(q.type, 'choice');
    assert.deepEqual(Object.keys(q.criteria), ['follow_notes', 'follow_mockup', 'ask_pm']);
    assert.equal(q.criteria.ask_pm, ASK_PM);
    assert.match(q.instructions.question, /^Which filters should the list offer/);
    assert.match(q.instructions.design_facts, /「搜尋案件」/);
  }
  assert.equal(existsSync(join(r.out, 'request-2.json')), false);
  assert.match(r.stdout, /^request-1\.json: q1, q2; 0 images; ~\d+ tokens; text only$/m);
  assert.equal(r.stdout.includes('TypeSafe-Danger-Zone-Images'), false);
});

function assertCropMatches(channels) {
  const dir = workdir();
  const src = writePng(join(dir, 'screen.png'), 400, 380, { channels });
  const r = run(dir, questionSet([question('q1', [{ path: src, node: '789:38164', crop: [37, 21, 300, 280] }])]));
  assert.equal(r.status, 0, r.stderr);

  const [img] = attachedImages(readJson(join(r.out, 'request-1.json')));
  assert.equal(img.type, 'image');
  assert.equal(img.format, 'png');
  const png = readPng(img.bytes);
  assert.deepEqual([png.width, png.height, png.channels], [300, 280, channels]);
  for (let y = 0; y < 280; y++) for (let x = 0; x < 300; x++) assert.deepEqual(png.at(x, y), pixel(37 + x, 21 + y, channels));

  const crops = readdirSync(join(r.out, 'crops'));
  assert.equal(crops.length, 1);
  assert.deepEqual(readFileSync(join(r.out, 'crops', crops[0])), img.bytes);
}

test('a crop of an 8-bit RGBA PNG has exactly the requested size and the source pixels of that region', () => {
  assertCropMatches(4);
});

test('a crop of an 8-bit RGB PNG has exactly the requested size and the source pixels of that region', () => {
  assertCropMatches(3);
});

for (const [label, size] of [['a side over 1568 px', [1600, 300]], ['a side under 256 px', [400, 200]], ['under 78,400 pixels in total', [256, 256]]]) {
  test(`an image with ${label} fails the build naming the question and the size, and writes nothing`, () => {
    const dir = workdir();
    const ok = writePng(join(dir, 'ok.png'), 400, 300, { pattern: false });
    const bad = writePng(join(dir, 'bad.png'), ...size, { pattern: false });
    const r = run(dir, questionSet([question('q1', [{ path: ok, node: '1:1' }]), question('q7', [{ path: ok, node: '1:1' }, { path: bad, node: '1:2' }])]));
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /q7/);
    assert.match(r.stderr, new RegExp(`${size[0]}\\s*[x×]\\s*${size[1]}`));
    assert.equal(existsSync(r.out) && readdirSync(r.out).length > 0, false);
  });
}

// Every key and string value in the request outside the assets map, where Jev looks for references.
function textOf(request) {
  const strings = [];
  const walk = (v) => {
    if (typeof v === 'string') strings.push(v);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { strings.push(k); walk(x); }
  };
  const { assets, ...rest } = request;
  walk(rest);
  return strings;
}

test('identical crops share one asset, and every reference is unique, attached, and appears only as itself', () => {
  const dir = workdir();
  const a = writePng(join(dir, 'list.png'), 600, 600);
  const b = writePng(join(dir, 'dialog.png'), 400, 300);
  const r = run(dir, questionSet([
    question('q1', [{ path: a, node: '789:38164', crop: [0, 0, 500, 300] }, { path: b, node: '789:38220' }]),
    question('q2', [{ path: a, node: '789:38164', crop: [0, 0, 500, 300] }, { path: a, node: '789:38164', crop: [100, 100, 400, 400] }]),
  ]));
  assert.equal(r.status, 0, r.stderr);

  const req = readJson(join(r.out, 'request-1.json'));
  const refs = Object.keys(req.assets);
  assert.equal(refs.length, 3);
  assert.equal(req.questions.q1.instructions.screenshot_1, req.questions.q2.instructions.screenshot_1);
  const screenshots = Object.values(req.questions).flatMap((q) => Object.entries(q.instructions).filter(([k]) => k.startsWith('screenshot_')).map(([, v]) => v));
  assert.deepEqual(new Set(screenshots), new Set(refs));
  for (const ref of refs) {
    assert.match(ref, /^asset-[0-9a-f]{8,}$/);
    for (const s of textOf(req)) if (s !== ref) assert.equal(s.includes(ref), false, `${ref} occurs inside "${s}"`);
  }
  assert.equal(readdirSync(join(r.out, 'crops')).length, 3);
});

test('a reference that also occurs in other request text fails the build', () => {
  const dir = workdir();
  const a = writePng(join(dir, 'list.png'), 400, 300);
  const images = [{ path: a, node: '789:38164' }];
  const first = run(dir, questionSet([question('q1', images)]), 'first');
  const ref = readJson(join(first.out, 'request-1.json')).questions.q1.instructions.screenshot_1;

  const r = run(dir, questionSet([question('q1', images), question('q2', [], { design_facts: `See ${ref} in the list.` })]), 'second');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, new RegExp(ref));
  assert.equal(existsSync(r.out) && readdirSync(r.out).length > 0, false);
});

test('the readable copy of a request carries no base64 and names each crop file and Figma node', () => {
  const dir = workdir();
  const a = writePng(join(dir, 'list.png'), 600, 600);
  const b = writePng(join(dir, 'dialog.png'), 400, 300);
  const r = run(dir, questionSet([
    question('q1', [{ path: a, node: '789:38164', crop: [0, 0, 500, 300] }]),
    question('q2', [{ path: b, node: '789:38220' }]),
  ]));
  assert.equal(r.status, 0, r.stderr);

  const req = readJson(join(r.out, 'request-1.json'));
  const text = readFileSync(join(r.out, 'request-1.readable.json'), 'utf8');
  const readable = JSON.parse(text);
  for (const a of Object.values(req.assets)) assert.equal(text.includes(a.data_base64.slice(0, 40)), false);
  assert.deepEqual({ ...readable, assets: undefined }, { ...req, assets: undefined });

  const nodes = { [req.questions.q1.instructions.screenshot_1]: '789:38164', [req.questions.q2.instructions.screenshot_1]: '789:38220' };
  assert.deepEqual(Object.keys(readable.assets).sort(), Object.keys(nodes).sort());
  for (const [ref, asset] of Object.entries(readable.assets)) {
    assert.equal(asset.node, nodes[ref]);
    assert.match(asset.file, /^crops\/[^/]+\.png$/);
    assert.deepEqual(readFileSync(join(r.out, asset.file)), Buffer.from(req.assets[ref].data_base64, 'base64'));
    assert.equal('data_base64' in asset, false);
  }
});

// A 1568x1568 image is estimated at 2,458,624 / 360 + 85 = 6,914 tokens, so with short text four questions
// carrying one each fit the 30,000 per-request budget and a fifth does not.
test('questions are packed in order into as few requests as stay under the per-request budget', () => {
  const dir = workdir();
  const a = writePng(join(dir, 'a.png'), 1568, 1568, { pattern: false });
  const b = writePng(join(dir, 'b.png'), 1568, 1568, { channels: 3, pattern: false });
  const ids = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'];
  const r = run(dir, questionSet(ids.map((id, i) => question(id, [{ path: i % 2 ? b : a, node: '1:1' }]))));
  assert.equal(r.status, 0, r.stderr);

  const requests = [1, 2, 3].map((n) => readJson(join(r.out, `request-${n}.json`)));
  assert.equal(existsSync(join(r.out, 'request-4.json')), false);
  assert.deepEqual(requests.map((q) => Object.keys(q.questions)), [['q1', 'q2', 'q3', 'q4'], ['q5', 'q6', 'q7', 'q8'], ['q9']]);
  assert.deepEqual(requests.map((q) => Object.keys(q.assets).length), [2, 2, 1]);
  for (const q of requests) assert.deepEqual(q.state, { product: 'Site log app.' });

  const lines = r.stdout.split('\n').filter((l) => l.startsWith('request-'));
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^request-1\.json: q1, q2, q3, q4; 2 images; ~(2[89]|30),?\d{3} tokens/);
  assert.match(lines[2], /^request-3\.json: q9; 1 images; ~[67],?\d{3} tokens/);
  for (const line of lines) assert.ok(line.trimEnd().endsWith('; add -H "TypeSafe-Danger-Zone-Images: true"'), line);
});

test('a question over the per-question budget fails the build with its estimated size', () => {
  const dir = workdir();
  const big = writePng(join(dir, 'big.png'), 1568, 1568, { pattern: false });
  const images = [0, 1, 2, 3, 4].map((y) => ({ path: big, node: '1:1', crop: [0, y, 1568, 1560] }));
  const r = run(dir, questionSet([question('q1'), question('q2', images)]));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /q2/);
  assert.match(r.stderr, /3[45],?\d{3}/);
  assert.equal(existsSync(r.out) && readdirSync(r.out).length > 0, false);
});

// The smallest JPEG header that states a size: SOI, a SOF0 segment with height and width, EOI.
function writeJpeg(path, width, height) {
  const sof = Buffer.from([0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
  const app0 = Buffer.from([0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  writeFileSync(path, Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.from([0xff, 0xd9])]));
  return path;
}

test('a JPEG is attached unchanged as format jpg and still checked against the limits', () => {
  const dir = workdir();
  const ok = writeJpeg(join(dir, 'photo.jpg'), 800, 600);
  const r = run(dir, questionSet([question('q1', [{ path: ok, node: '2:1' }])]));
  assert.equal(r.status, 0, r.stderr);
  const [img] = attachedImages(readJson(join(r.out, 'request-1.json')));
  assert.equal(img.format, 'jpg');
  assert.deepEqual(img.bytes, readFileSync(ok));

  const big = writeJpeg(join(dir, 'big.jpg'), 2000, 600);
  const bad = run(dir, questionSet([question('q4', [{ path: big, node: '2:2' }])]), 'bad');
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /q4/);
  assert.match(bad.stderr, /2000\s*[x×]\s*600/);
});

test('a crop on a JPEG or on a PNG the script cannot decode fails with the question id', () => {
  const dir = workdir();
  const jpg = writeJpeg(join(dir, 'photo.jpg'), 800, 600);
  const interlaced = writePng(join(dir, 'interlaced.png'), 400, 300, { interlace: 1 });
  for (const [id, path] of [['q5', jpg], ['q6', interlaced]]) {
    const r = run(dir, questionSet([question(id, [{ path, node: '2:1', crop: [0, 0, 300, 280] }])]), id);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, new RegExp(id));
  }
});

test('same-named exports from different folders keep separate crop files', () => {
  const dir = workdir();
  mkdirSync(join(dir, 'a')); mkdirSync(join(dir, 'b'));
  const a = writePng(join(dir, 'a', 'screen.png'), 400, 300);
  const b = writePng(join(dir, 'b', 'screen.png'), 300, 400);
  const r = run(dir, questionSet([question('q1', [{ path: a, node: '1:1' }, { path: b, node: '1:2' }])]));
  assert.equal(r.status, 0, r.stderr);
  const readable = readJson(join(r.out, 'request-1.readable.json'));
  const files = Object.values(readable.assets).map((x) => x.file);
  assert.equal(new Set(files).size, 2);
  assert.deepEqual(files.map((f) => readFileSync(join(r.out, f))).sort(Buffer.compare), [readFileSync(a), readFileSync(b)].sort(Buffer.compare));
});

test('a question set that repeats a question id fails the build', () => {
  const dir = workdir();
  const r = run(dir, questionSet([question('q1'), question('q2'), question('q1')]));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /q1/);
});

test('a question whose options include ask_pm fails the build, since the script adds that option itself', () => {
  const dir = workdir();
  const r = run(dir, questionSet([question('q1'), question('q2', [], { options: { follow_notes: 'Search case.', ask_pm: 'Ask the PM.' } })]));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /q2/);
  assert.match(r.stderr, /ask_pm/);
  assert.equal(existsSync(r.out) && readdirSync(r.out).length > 0, false);
});

test('a question set without state fails the build with a message naming state', () => {
  const dir = workdir();
  const { state, ...set } = questionSet([question('q1')]);
  const r = run(dir, set);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^pack-requests: .*\bstate\b/);
  assert.equal(existsSync(r.out) && readdirSync(r.out).length > 0, false);
});

// A 1568x1568 image is ~6,914 tokens and 75,000 characters of text ~25,000, so the two questions need two requests.
test('the summary names the image header only for requests that carry images', () => {
  const dir = workdir();
  const big = writePng(join(dir, 'big.png'), 1568, 1568, { pattern: false });
  const r = run(dir, questionSet([question('q1', [{ path: big, node: '1:1' }]), question('q2', [], { design_facts: 'x'.repeat(75_000) })]));
  assert.equal(r.status, 0, r.stderr);
  assert.equal('assets' in readJson(join(r.out, 'request-2.json')), false);
  const lines = r.stdout.split('\n').map((l) => l.trimEnd()).filter((l) => l.startsWith('request-'));
  assert.match(lines[0], /^request-1\.json: q1; 1 images; .*; add -H "TypeSafe-Danger-Zone-Images: true"$/);
  assert.match(lines[1], /^request-2\.json: q2; 0 images; .*; text only$/);
});

// CJK text costs about a token per character, other text about a token per three characters, so 31,500 characters
// are over the 30,000 per-question budget when they are CJK and well under it when they are not.
test('the token estimate counts CJK characters, and only CJK characters, at one token each', () => {
  const dir = workdir();
  const cjk = '中㐀。あア한！'.repeat(4_500);
  const over = run(dir, questionSet([question('q1', [], { design_facts: cjk })]), 'cjk');
  assert.notEqual(over.status, 0);
  assert.match(over.stderr, /q1.*3[12],?\d{3}/);

  const emoji = '\u{1F4CC}'.repeat(31_500);
  const ok = run(dir, questionSet([question('q1', [], { design_facts: emoji })]), 'emoji');
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /~1[01],?\d{3} tokens/);
});

test('a crop is checked against the limits, not the image it is cut from', () => {
  const dir = workdir();
  const src = writePng(join(dir, 'tall.png'), 1024, 2000, { pattern: false });
  const r = run(dir, questionSet([question('q3', [{ path: src, node: '1:1', crop: [0, 0, 1024, 200] }])]));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /q3/);
  assert.match(r.stderr, /1024\s*[x×]\s*200/);
});
