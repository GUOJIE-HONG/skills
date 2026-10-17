// Run with `node --test` from this folder. Each test writes a course data file to a temp folder, runs
// build-course.mjs as a user would, and reads only its output folder, stdout, stderr, and exit code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'build-course.mjs');

function workdir() {
  return mkdtempSync(join(tmpdir(), 'build-course-'));
}

function run(dir, data, outName = 'course') {
  const dataPath = join(dir, 'course.json');
  writeFileSync(dataPath, JSON.stringify(data));
  const out = join(dir, outName);
  const r = spawnSync(process.execPath, [SCRIPT, dataPath, out], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, out };
}

const read = (path) => readFileSync(path, 'utf8');

function source(id, extra = {}) {
  return { id, title: `Title of ${id}`, author: `Author of ${id}`, url: `https://example.org/${id}`, readOn: '2026-10-01', kind: 'primary', ...extra };
}

function lesson(id, sections, extra = {}) {
  return { id, title: `Lesson ${id}`, objectives: [`Objective of ${id}`], sections, ...extra };
}

function section(heading, claims) {
  return { heading, claims };
}

function claim(text, sources) {
  return { text, sources };
}

function courseData(extra = {}) {
  return {
    course: { title: 'Intro to Tides', audience: 'High-school students', level: 'Beginner', length: '2 hours', language: 'en' },
    sources: [source('noaa'), source('book', { kind: 'secondary' })],
    lessons: [
      lesson('l1', [section('What a tide is', [claim('Tides are the rise and fall of sea levels.', ['noaa'])])]),
      lesson('l2', [section('Why the Moon matters', [claim('The Moon pulls the ocean toward it.', ['book'])])]),
    ],
    evidenceGaps: [],
    ...extra,
  };
}

test('a valid course builds a Syllabus page that links to a Handout page per Lesson', () => {
  const dir = workdir();
  const r = run(dir, courseData());
  assert.equal(r.status, 0, r.stderr);
  const syllabus = read(join(r.out, 'index.html'));
  assert.match(syllabus, /Intro to Tides/);
  for (const id of ['l1', 'l2']) {
    const handout = join(r.out, 'lessons', id, 'handout.html');
    assert.ok(existsSync(handout), `missing ${handout}`);
    assert.match(syllabus, new RegExp(`href="lessons/${id}/handout.html"`));
    assert.match(read(handout), new RegExp(`Lesson ${id}`));
  }
});

// The text of the element with this id, tags stripped, so assertions read what a learner sees.
function elementText(html, id) {
  const m = html.match(new RegExp(`<(\\w+)[^>]*\\sid="${id}"[^>]*>([\\s\\S]*?)</\\1>`));
  assert.ok(m, `no element with id ${id}`);
  return m[2].replace(/<[^>]+>/g, ' ');
}

// The fragment targets of the citation markers between a claim's text and the next claim or paragraph end.
// Claims in these tests all start with "Claim ".
function citationsAfter(html, text) {
  const at = html.indexOf(text);
  assert.ok(at >= 0, `claim not on the page: ${text}`);
  const rest = html.slice(at + text.length);
  const end = rest.search(/Claim |<\/p>/);
  return [...rest.slice(0, end).matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
}

test('each citation marker in a Handout links to its Source entry, which shows title, author, URL, and read date', () => {
  const dir = workdir();
  const data = courseData({
    sources: [source('noaa'), source('book', { readOn: '2026-09-15', kind: 'secondary' }), source('unused')],
    lessons: [
      lesson('l1', [
        section('What a tide is', [claim('Claim one cites the book.', ['book']), claim('Claim two cites NOAA.', ['noaa'])]),
        section('Tidal range', [claim('Claim three cites both.', ['noaa', 'book'])]),
      ]),
    ],
  });
  const r = run(dir, data);
  assert.equal(r.status, 0, r.stderr);
  const html = read(join(r.out, 'lessons', 'l1', 'handout.html'));
  const expected = { 'Claim one cites the book.': ['book'], 'Claim two cites NOAA.': ['noaa'], 'Claim three cites both.': ['noaa', 'book'] };
  for (const [text, ids] of Object.entries(expected)) {
    const targets = citationsAfter(html, text);
    assert.equal(targets.length, ids.length, `markers after "${text}"`);
    targets.forEach((target, i) => {
      const s = data.sources.find((x) => x.id === ids[i]);
      const entry = elementText(html, target);
      for (const field of [s.title, s.author, s.url, s.readOn]) assert.ok(entry.includes(field), `${target} lacks ${field}`);
    });
  }
  assert.ok(!html.includes('Title of unused'), 'a Source the Handout does not cite is listed');
});

// A refused build exits non-zero, writes nothing next to the data file, and names each problem on its own
// stderr line; each problem is given as the patterns that line must all match.
function assertRefused(r, dir, ...problems) {
  assert.notEqual(r.status, 0, 'the build was not refused');
  assert.deepEqual(readdirSync(dir), ['course.json'], 'a refused build wrote files');
  const lines = r.stderr.split(/\r?\n/);
  for (const patterns of problems) {
    assert.ok(lines.some((line) => patterns.every((p) => p.test(line))), `no stderr line matches ${patterns.join(' and ')}:\n${r.stderr}`);
  }
}

test('a claim that cites no Source is refused, naming its Lesson, section, and claim', () => {
  const dir = workdir();
  const data = courseData();
  data.lessons[1].sections[0].claims.push(claim('An uncited claim.', []));
  assertRefused(run(dir, data), dir, [/\bl2\b/, /section 1\b/, /claim 2\b/, /cites no Source/]);
});

test('a claim that cites a Source id missing from the Source list is refused, naming the id and where it is cited', () => {
  const dir = workdir();
  const data = courseData();
  data.lessons[0].sections[0].claims[0].sources.push('ghost');
  assertRefused(run(dir, data), dir, [/\bl1\b/, /section 1\b/, /claim 1\b/, /\bghost\b/]);
});

test('a Source without a URL or without a read date is refused, naming the Source', () => {
  for (const [field, pattern] of [['url', /URL/], ['readOn', /read date/]]) {
    const dir = workdir();
    const data = courseData();
    delete data.sources[1][field];
    assertRefused(run(dir, data), dir, [/Source book\b/, pattern]);
  }
});

test('a Source URL that is not a web or file address, or a read date that is not YYYY-MM-DD, is refused', () => {
  const dir = workdir();
  const data = courseData();
  data.sources[0].url = 'javascript:alert(1)';
  data.sources[1].readOn = 'last week';
  assertRefused(run(dir, data), dir, [/Source noaa\b/, /URL/], [/Source book\b/, /read date/]);
});

test('a data file with several problems is refused with all of them listed at once', () => {
  const dir = workdir();
  const data = courseData();
  data.lessons[0].sections[0].claims.push(claim('Uncited.', []));
  data.lessons[1].sections[0].claims[0].sources = ['ghost'];
  data.sources[0].readOn = '2026-13-45';
  assertRefused(
    run(dir, data),
    dir,
    [/\bl1\b/, /section 1\b/, /claim 2\b/, /cites no Source/],
    [/\bl2\b/, /section 1\b/, /claim 1\b/, /\bghost\b/],
    [/Source noaa\b/, /read date/],
  );
});

test('an output folder that already exists, even empty, is refused and left as it was', () => {
  for (const contents of [{ 'notes.txt': 'keep me' }, {}]) {
    const dir = workdir();
    const out = join(dir, 'course');
    mkdirSync(out);
    for (const [name, text] of Object.entries(contents)) writeFileSync(join(out, name), text);
    const r = run(dir, courseData());
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /already exists/);
    assert.deepEqual(readdirSync(out).sort(), Object.keys(contents).sort());
    for (const [name, text] of Object.entries(contents)) assert.equal(read(join(out, name)), text);
    assert.deepEqual(readdirSync(dir).sort(), ['course', 'course.json']);
  }
});

test('HTML markup anywhere in the data shows as text on every page', () => {
  const dir = workdir();
  const evil = '<script>alert("x")</script> & <b>bold</b>';
  const data = courseData({
    course: { title: `Tides ${evil}`, audience: `Kids ${evil}`, level: `Low ${evil}`, length: `1h ${evil}`, language: 'en' },
    sources: [source('noaa', { title: `T ${evil}`, author: `A ${evil}`, url: 'https://example.org/a"onmouseover="alert(1)' })],
    lessons: [lesson('l1', [section(`H ${evil}`, [claim(`Claim ${evil}`, ['noaa'])])], { title: `L ${evil}`, objectives: [`O ${evil}`] })],
  });
  const r = run(dir, data);
  assert.equal(r.status, 0, r.stderr);
  for (const page of ['index.html', join('lessons', 'l1', 'handout.html')]) {
    const html = read(join(r.out, page));
    assert.ok(!html.includes('<script>alert'), `${page} runs a script from the data`);
    assert.ok(!html.includes('<b>bold'), `${page} renders markup from the data`);
    assert.ok(!/"onmouseover=/.test(html), `${page} lets a URL break out of its attribute`);
    assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &lt;b&gt;bold&lt;/b&gt;'), `${page} does not show the markup as text`);
  }
});

test('missing Course details, Lesson parts, and Source title, author, or kind are refused, each where it is missing', () => {
  const dir = workdir();
  const data = courseData();
  delete data.course.audience;
  delete data.sources[0].author;
  data.sources[1].title = '';
  data.sources[1].kind = 'blog';
  data.lessons[0].title = '';
  data.lessons[0].sections.push(section('', []));
  data.lessons[1].sections[0].claims.push({ sources: ['noaa'] });
  data.lessons[1].objectives = [];
  assertRefused(
    run(dir, data),
    dir,
    [/^- Course\b/, /audience/],
    [/Source noaa\b/, /author/],
    [/Source book\b/, /title/],
    [/Source book\b/, /primary or secondary/],
    [/\bl1\b/, /title/],
    [/\bl1\b/, /section 2\b/, /heading/],
    [/\bl1\b/, /section 2\b/, /no claims/],
    [/\bl2\b/, /section 1\b/, /claim 2\b/, /text/],
    [/\bl2\b/, /objectives/],
  );
});

test('a Lesson id that is repeated or unsafe as a folder name is refused, and so is a repeated Source id', () => {
  const dir = workdir();
  const data = courseData();
  data.lessons.push(lesson('l1', [section('Again', [claim('Claim again.', ['noaa'])])]));
  data.lessons.push(lesson('../escape', [section('Out', [claim('Claim out.', ['noaa'])])]));
  data.sources.push(source('noaa'));
  assertRefused(run(dir, data), dir, [/Lesson 3\b/, /\bl1\b/, /more than once/], [/escape/, /id/], [/Source noaa\b/, /more than once/]);
});

test('a data file without Lessons, with parts of the wrong shape, or that is not JSON, is refused', () => {
  const dir = workdir();
  assertRefused(run(dir, courseData({ lessons: [] })), dir, [/Lesson/]);
  const odd = workdir();
  assertRefused(run(odd, courseData({ lessons: [null, lesson('l2', 'not a list')], sources: 'not a list' })), odd, [/Lesson 1\b/, /\bid\b/], [/\bl2\b/, /sections/]);
  const bad = workdir();
  writeFileSync(join(bad, 'course.json'), '{ not json');
  const r = spawnSync(process.execPath, [SCRIPT, join(bad, 'course.json'), join(bad, 'course')], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /course\.json/);
  assert.deepEqual(readdirSync(bad), ['course.json']);
});

// Every file the build wrote, as paths relative to the Course project.
function projectFiles(root, sub = '') {
  return readdirSync(join(root, sub), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? projectFiles(root, join(sub, e.name)) : [join(sub, e.name)],
  );
}

test('no Evidence gap appears on any page', () => {
  const dir = workdir();
  const data = courseData({ evidenceGaps: [{ lesson: 'l1', point: 'GAP-MARKER-7f3: spring tides double the range' }] });
  const r = run(dir, data);
  assert.equal(r.status, 0, r.stderr);
  for (const file of projectFiles(r.out)) assert.ok(!read(join(r.out, file)).includes('GAP-MARKER-7f3'), `${file} shows an Evidence gap`);
});

test('no page loads a script, stylesheet, or font from another address', () => {
  const dir = workdir();
  const r = run(dir, courseData());
  assert.equal(r.status, 0, r.stderr);
  for (const file of projectFiles(r.out).filter((f) => f.endsWith('.html'))) {
    const html = read(join(r.out, file));
    assert.doesNotMatch(html, /<script[^>]*\ssrc=/i, `${file} loads a script file`);
    assert.doesNotMatch(html, /<link[^>]*rel="?(stylesheet|preload|preconnect)/i, `${file} loads a stylesheet or font`);
    assert.doesNotMatch(html, /@import|url\(\s*['"]?(https?:)?\/\//i, `${file} pulls a resource from another address in CSS`);
  }
});

test('a successful build prints where the Course project is and how many Evidence gaps the data holds', () => {
  const dir = workdir();
  const r = run(dir, courseData({ evidenceGaps: [{ lesson: 'l1', point: 'one' }, { lesson: 'l2', point: 'two' }] }));
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes(r.out), r.stdout);
  assert.match(r.stdout, /2 Evidence gaps?/);
});

// A stand-in for the player page `am video -o` writes, so tests never call am.
function fakeVideo(dir, name = 'video.html') {
  const path = join(dir, 'videos-temp', name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `<!doctype html><title>fake player ${name}</title><p>VIDEO-MARKER-${name}</p>`);
  return path;
}

// The Syllabus topic line that shows this section heading, tags stripped.
function topicLine(html, heading) {
  const m = [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => x[1]).find((li) => li.includes(heading) && !li.includes('<li>'));
  assert.ok(m, `no topic line for ${heading}`);
  return m.replace(/<[^>]+>/g, ' ');
}

test('a section with an Explainer video gets the video copied into the Course project, embedded in its Handout section, and marked on the Syllabus', () => {
  const dir = workdir();
  const video = fakeVideo(dir);
  const data = courseData();
  data.lessons[0].sections.push({ ...section('How big a tide gets', [claim('Claim about range.', ['noaa'])]), video });
  const r = run(dir, data);
  assert.equal(r.status, 0, r.stderr);
  const copied = join(r.out, 'lessons', 'l1', 'videos', 'section-2.html');
  assert.equal(read(copied), read(video), 'the video in the Course project differs from the one made');
  const handout = read(join(r.out, 'lessons', 'l1', 'handout.html'));
  assert.match(elementHtml(handout, 'section-2'), /<iframe[^>]*\ssrc="videos\/section-2\.html"/);
  assert.doesNotMatch(elementHtml(handout, 'section-1'), /<iframe/);
  assert.doesNotMatch(read(join(r.out, 'lessons', 'l2', 'handout.html')), /<iframe/);
  const syllabus = read(join(r.out, 'index.html'));
  assert.match(topicLine(syllabus, 'How big a tide gets'), /Video/);
  assert.doesNotMatch(topicLine(syllabus, 'What a tide is'), /Video/);
  assert.doesNotMatch(topicLine(syllabus, 'Why the Moon matters'), /Video/);
});

test('a section marked for a video whose file does not exist, or is not a player page, is refused naming its Lesson and section', () => {
  const dir = workdir();
  const data = courseData();
  data.lessons[0].sections[0].video = join(dir, 'videos-temp', 'never-made.html');
  data.lessons[1].sections[0].video = fakeVideo(workdir(), 'clip.mp4');
  assertRefused(run(dir, data), dir, [/\bl1\b/, /section 1\b/, /video/, /never-made\.html/], [/\bl2\b/, /section 1\b/, /video/, /clip\.mp4/]);
});

// The markup inside the element with this id.
function elementHtml(html, id) {
  const m = html.match(new RegExp(`<(\\w+)[^>]*\\sid="${id}"[^>]*>([\\s\\S]*?)</\\1>`));
  assert.ok(m, `no element with id ${id}`);
  return m[2];
}

test('the output folder may sit in a folder that does not exist yet, as courses/<topic>/ often does', () => {
  const dir = workdir();
  const r = run(dir, courseData(), join('courses', 'tides'));
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(r.out, 'index.html')));
  assert.deepEqual(readdirSync(join(dir, 'courses')), ['tides'], 'the build left a temporary folder behind');
});
