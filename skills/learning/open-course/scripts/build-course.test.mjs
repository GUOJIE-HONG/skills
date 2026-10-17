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

// A Lesson with one Exercise, whose answer cites what the Lesson's first claim cites, and Slides that restate
// its Handout: one slide per section, one point per claim.
function lesson(id, sections, extra = {}) {
  const exercises = [exercise(`Question of ${id}?`, `Answer of ${id}.`, sections?.[0]?.claims?.[0]?.sources ?? [])];
  const slides = list(sections).map((s) => slide(s.heading, s.claims.map((c) => point(c.text, [...c.sources]))));
  return { id, title: `Lesson ${id}`, objectives: [`Objective of ${id}`], sections, exercises, slides, ...extra };
}

const list = (v) => (Array.isArray(v) ? v : []);

function slide(title, points) {
  return { title, points };
}

function point(text, sources) {
  return { text, sources };
}

function section(heading, claims) {
  return { heading, claims };
}

function claim(text, sources) {
  return { text, sources };
}

function exercise(question, answer, sources) {
  return { question, answer, sources };
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

test('a valid course builds Slides for each Lesson, linked from the Syllabus and from that Lesson\'s Handout', () => {
  const dir = workdir();
  const r = run(dir, courseData());
  assert.equal(r.status, 0, r.stderr);
  const syllabus = read(join(r.out, 'index.html'));
  for (const id of ['l1', 'l2']) {
    const slides = join(r.out, 'lessons', id, 'slides.html');
    assert.ok(existsSync(slides), `missing ${slides}`);
    assert.match(syllabus, new RegExp(`href="lessons/${id}/slides.html"`));
    assert.match(read(join(r.out, 'lessons', id, 'handout.html')), /href="slides.html"/);
    assert.match(read(slides), new RegExp(`Lesson ${id}`));
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
function citationsAfter(html, text, link = /href="#([^"]+)"/g) {
  const at = html.indexOf(text);
  assert.ok(at >= 0, `claim not on the page: ${text}`);
  const rest = html.slice(at + text.length);
  const end = rest.search(/Claim |<\/p>|<\/li>/);
  return [...rest.slice(0, end).matchAll(link)].map((m) => m[1]);
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

test('each slide shows its title and points, and each point\'s citation markers link to the cited Source in the Handout', () => {
  const dir = workdir();
  const data = courseData({
    sources: [source('noaa'), source('book', { kind: 'secondary' }), source('atlas')],
    lessons: [
      lesson('l1', [section('What a tide is', [claim('The sea rises.', ['book']), claim('The sea falls.', ['noaa']), claim('Maps show it.', ['atlas'])])], {
        slides: [
          slide('Rise and fall', [point('Claim A: the sea rises and falls.', ['noaa', 'book'])]),
          slide('Twice a day', [point('Claim B: most coasts see two tides.', ['noaa'])]),
        ],
      }),
    ],
  });
  const r = run(dir, data);
  assert.equal(r.status, 0, r.stderr);
  const slides = read(join(r.out, 'lessons', 'l1', 'slides.html'));
  const handout = read(join(r.out, 'lessons', 'l1', 'handout.html'));
  assert.ok(slides.indexOf('Rise and fall') < slides.indexOf('Twice a day'), 'slides out of order or missing');
  const expected = { 'Claim A: the sea rises and falls.': ['noaa', 'book'], 'Claim B: most coasts see two tides.': ['noaa'] };
  for (const [text, ids] of Object.entries(expected)) {
    const targets = citationsAfter(slides, text, /href="handout\.html#([^"]+)"/g);
    assert.equal(targets.length, ids.length, `markers after "${text}"`);
    targets.forEach((target, i) => assert.ok(elementText(handout, target).includes(`Title of ${ids[i]}`), `${target} is not ${ids[i]} in the Handout`));
  }
  const listed = slides.slice(slides.lastIndexOf('class="slide'));
  for (const id of ['noaa', 'book']) assert.ok(listed.includes(`Title of ${id}`), `the last slide does not list ${id}`);
  assert.ok(!slides.includes('Title of atlas'), 'the Slides list a Source no slide cites');
});

test('each Handout ends with its Lesson\'s Exercises, each answer collapsed until opened, with no script needed', () => {
  const dir = workdir();
  const data = courseData();
  data.lessons[0].exercises = [exercise('Question A1?', 'Answer A1.', ['noaa']), exercise('Question A2?', 'Answer A2.', ['noaa'])];
  data.lessons[1].exercises = [exercise('Question B1?', 'Answer B1.', ['book'])];
  const r = run(dir, data);
  assert.equal(r.status, 0, r.stderr);
  for (const l of data.lessons) {
    const html = read(join(r.out, 'lessons', l.id, 'handout.html'));
    const lastClaim = html.lastIndexOf(l.sections.at(-1).claims.at(-1).text);
    let previous = lastClaim;
    for (const e of l.exercises) {
      const at = html.indexOf(e.question);
      assert.ok(at > previous, `${l.id}: "${e.question}" is missing or out of order after the Lesson's sections`);
      previous = at;
      const details = [...html.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)].find((m) => m[2].includes(e.answer));
      assert.ok(details, `${l.id}: "${e.answer}" is not inside a collapsible element`);
      assert.doesNotMatch(details[1], /\bopen\b/, `${l.id}: "${e.answer}" starts open`);
    }
    for (const other of data.lessons.filter((x) => x !== l)) for (const e of other.exercises) assert.ok(!html.includes(e.question), `${l.id} shows another Lesson's Exercise`);
    assert.doesNotMatch(html, /<script\b/i, `${l.id} needs a script`);
  }
});

test('each citation marker on an Exercise answer links to its Source entry, even for a Source only the answer cites', () => {
  const dir = workdir();
  const data = courseData({
    sources: [source('noaa'), source('book', { readOn: '2026-09-15', kind: 'secondary' }), source('atlas')],
    lessons: [
      lesson('l1', [section('What a tide is', [claim('Claim one cites the book.', ['book'])])], {
        exercises: [exercise('Question one?', 'Claim answer one cites NOAA and the atlas.', ['noaa', 'atlas']), exercise('Question two?', 'Claim answer two cites the book.', ['book'])],
      }),
    ],
  });
  const r = run(dir, data);
  assert.equal(r.status, 0, r.stderr);
  const html = read(join(r.out, 'lessons', 'l1', 'handout.html'));
  for (const e of data.lessons[0].exercises) {
    const targets = citationsAfter(html, e.answer);
    assert.equal(targets.length, e.sources.length, `markers after "${e.answer}"`);
    targets.forEach((target, i) => {
      const s = data.sources.find((x) => x.id === e.sources[i]);
      const entry = elementText(html, target);
      for (const field of [s.title, s.author, s.url, s.readOn]) assert.ok(entry.includes(field), `${target} lacks ${field}`);
    });
  }
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

test('a slide point that cites no Source, or a Source its Lesson\'s Handout does not cite, is refused, naming the Lesson and slide', () => {
  const dir = workdir();
  const data = courseData();
  data.lessons[0].slides.push(slide('Extra', [point('Uncited point.', []), point('Point from elsewhere.', ['book'])]));
  data.lessons[1].slides[0].points[0].sources = ['ghost'];
  assertRefused(
    run(dir, data),
    dir,
    [/\bl1\b/, /slide 2\b/, /point 1\b/, /cites no Source/],
    [/\bl1\b/, /slide 2\b/, /point 2\b/, /\bbook\b/, /Handout/],
    [/\bl2\b/, /slide 1\b/, /point 1\b/, /\bghost\b/],
  );
});

test('a Lesson without Slides, a slide without a title or points, and a point without text are refused, each where it is missing', () => {
  const dir = workdir();
  const data = courseData();
  delete data.lessons[0].slides;
  data.lessons[1].slides.push(slide('', []), slide('Fine', [{ sources: ['book'] }]));
  assertRefused(
    run(dir, data),
    dir,
    [/\bl1\b/, /Slides/],
    [/\bl2\b/, /slide 2\b/, /title/],
    [/\bl2\b/, /slide 2\b/, /points/],
    [/\bl2\b/, /slide 3\b/, /point 1\b/, /text/],
  );
});

test('an Exercise answer that cites no Source, or a Source missing from the Source list, is refused, naming its Lesson and Exercise', () => {
  const dir = workdir();
  const data = courseData();
  data.lessons[0].exercises.push(exercise('Uncited question?', 'Uncited answer.', []));
  data.lessons[1].exercises[0].sources = ['ghost'];
  assertRefused(run(dir, data), dir, [/\bl1\b/, /Exercise 2\b/, /answer cites no Source/], [/\bl2\b/, /Exercise 1\b/, /\bghost\b/]);
});

test('a Lesson without Exercises, or an Exercise without a question or answer, is refused, naming its Lesson and Exercise', () => {
  const dir = workdir();
  const data = courseData();
  delete data.lessons[0].exercises;
  data.lessons[1].exercises.push({ answer: 'An answer.', sources: ['book'] }, exercise('A question?', '  ', ['book']));
  assertRefused(run(dir, data), dir, [/\bl1\b/, /no Exercises/], [/\bl2\b/, /Exercise 2\b/, /question/], [/\bl2\b/, /Exercise 3\b/, /answer/]);
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
    lessons: [lesson('l1', [section(`H ${evil}`, [claim(`Claim ${evil}`, ['noaa'])])], { title: `L ${evil}`, objectives: [`O ${evil}`], exercises: [exercise(`Q ${evil}`, `A ${evil}`, ['noaa'])] })],
  });
  const r = run(dir, data);
  assert.equal(r.status, 0, r.stderr);
  for (const page of ['index.html', join('lessons', 'l1', 'handout.html'), join('lessons', 'l1', 'slides.html')]) {
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
