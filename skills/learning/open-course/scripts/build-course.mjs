#!/usr/bin/env node
// usage: node build-course.mjs <course.json> <out-dir>
// Builds a Course project from the course data file open-course writes. Node 20+, built-ins only.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';

class BuildError extends Error {}

// ---- checks: each takes the course data and returns its problems as { where, problem }; all run on every build ----

// The parts of the data the checks walk, as arrays even when the data file got its shape wrong: arrayOf() for
// strings, objectsOf() for objects.
const arrayOf = (v) => (Array.isArray(v) ? v : []);
const objectsOf = (v) => arrayOf(v).map((x) => (x && typeof x === 'object' ? x : {}));
const blank = (v) => typeof v !== 'string' || v.trim() === '';

// Lesson ids name the Lesson's folder in the Course project.
const LESSON_ID = /^[a-z0-9][a-z0-9-]*$/;

function* lessons(data) {
  for (const [i, lesson] of objectsOf(data.lessons).entries()) yield { lesson, where: `Lesson ${i + 1} (${lesson.id ?? 'no id'})` };
}

function* sections(data) {
  for (const { lesson, where } of lessons(data)) {
    for (const [i, section] of objectsOf(lesson.sections).entries()) yield { lesson, section, where: `${where}, section ${i + 1}` };
  }
}

// Every claim in every section of every Lesson, with where it sits.
function* claims(data) {
  for (const { section, where } of sections(data)) {
    for (const [i, claim] of objectsOf(section.claims).entries()) yield { claim, where: `${where}, claim ${i + 1}` };
  }
}

// Every Exercise of every Lesson, with where it sits.
function* exercises(data) {
  for (const { lesson, where } of lessons(data)) {
    for (const [i, exercise] of objectsOf(lesson.exercises).entries()) yield { exercise, where: `${where}, Exercise ${i + 1}` };
  }
}

// Every slide of every Lesson, numbered as the Slides page counts it: the title slide is 1, so the first slide in the data is 2.
function* slides(data) {
  for (const { lesson, where } of lessons(data)) {
    for (const [i, slide] of objectsOf(lesson.slides).entries()) yield { lesson, slide, where: `${where}, slide ${i + 2}` };
  }
}

// Every point on every slide of every Lesson, with its Lesson and where it sits.
function* points(data) {
  for (const { lesson, slide, where } of slides(data)) {
    for (const [i, point] of objectsOf(slide.points).entries()) yield { lesson, point, where: `${where}, point ${i + 1}` };
  }
}

// The Sources a Lesson's Handout cites, claims then Exercise answers, in order of first citation: exactly its Source list.
function handoutSources(lesson) {
  const citing = [...objectsOf(lesson.sections).flatMap((s) => objectsOf(s.claims)), ...objectsOf(lesson.exercises)];
  return [...new Set(citing.flatMap((x) => arrayOf(x.sources)))];
}

const listedSources = (data) => new Set(objectsOf(data.sources).map((s) => s.id));

// The citation rule claims, Exercise answers, and slide points share: cite at least one Source, and only Sources in `allowed`.
function citationProblems({ where, cites = 'cites', sources, allowed, outside }) {
  if (arrayOf(sources).length === 0) return [{ where, problem: `${cites} no Source` }];
  return arrayOf(sources).filter((id) => !allowed.has(id)).map((id) => ({ where, problem: `${cites} Source "${id}", ${outside}` }));
}

function duplicates(ids) {
  return ids.filter((id, i) => id !== undefined && ids.indexOf(id) !== i);
}

const CHECKS = [
  function courseHasItsDetails(data) {
    return ['title', 'audience', 'level', 'length', 'language']
      .filter((field) => blank(data.course?.[field]))
      .map((field) => ({ where: 'Course', problem: `has no ${field}` }));
  },
  // The URL becomes a link on the page, so only schemes that open a document pass; javascript: and the like do not.
  function sourcesHaveTheirDetails(data) {
    const repeated = new Set(duplicates(objectsOf(data.sources).map((s) => s.id)));
    return objectsOf(data.sources).flatMap((s, i) => {
      const where = `Source ${s.id ?? i + 1}`;
      const problems = [];
      if (blank(s.id)) problems.push({ where, problem: 'has no id' });
      else if (repeated.has(s.id)) problems.push({ where, problem: `id ${s.id} appears more than once` });
      if (blank(s.title)) problems.push({ where, problem: 'has no title' });
      if (blank(s.author)) problems.push({ where, problem: 'has no author' });
      if (s.kind !== 'primary' && s.kind !== 'secondary') problems.push({ where, problem: 'kind must be primary or secondary' });
      if (!s.url) problems.push({ where, problem: 'has no URL' });
      else if (!isDocumentUrl(s.url)) problems.push({ where, problem: `URL "${s.url}" is not an http, https, or file address` });
      if (!s.readOn) problems.push({ where, problem: 'has no read date (readOn)' });
      else if (!isIsoDate(s.readOn)) problems.push({ where, problem: `read date "${s.readOn}" is not a YYYY-MM-DD date` });
      return problems;
    });
  },
  function lessonsHaveTheirParts(data) {
    if (objectsOf(data.lessons).length === 0) return [{ where: 'Lessons', problem: 'the Course has no Lessons' }];
    const problems = [];
    const repeated = new Set(duplicates(objectsOf(data.lessons).map((l) => l.id)));
    for (const { lesson, where } of lessons(data)) {
      if (typeof lesson.id !== 'string' || !LESSON_ID.test(lesson.id)) problems.push({ where, problem: 'id must be lowercase letters, digits, and hyphens, as it names the Lesson folder' });
      else if (repeated.has(lesson.id)) problems.push({ where, problem: `id ${lesson.id} appears more than once` });
      if (blank(lesson.title)) problems.push({ where, problem: 'has no title' });
      if (arrayOf(lesson.objectives).length === 0 || arrayOf(lesson.objectives).some(blank)) problems.push({ where, problem: 'needs objectives: a list of learning objectives, none blank' });
      if (objectsOf(lesson.sections).length === 0) problems.push({ where, problem: 'has no sections' });
    }
    for (const { section, where } of sections(data)) {
      if (blank(section.heading)) problems.push({ where, problem: 'has no heading' });
      if (objectsOf(section.claims).length === 0) problems.push({ where, problem: 'has no claims' });
    }
    for (const { claim, where } of claims(data)) if (blank(claim.text)) problems.push({ where, problem: 'has no text' });
    return problems;
  },
  function everyClaimCitesListedSources(data) {
    const allowed = listedSources(data);
    return [...claims(data)].flatMap(({ claim, where }) => citationProblems({ where, sources: claim.sources, allowed, outside: 'which is not in the Source list' }));
  },
  function exercisesHaveTheirParts(data) {
    const problems = [];
    for (const { lesson, where } of lessons(data)) if (objectsOf(lesson.exercises).length === 0) problems.push({ where, problem: 'has no Exercises' });
    for (const { exercise, where } of exercises(data)) {
      if (blank(exercise.question)) problems.push({ where, problem: 'has no question' });
      if (blank(exercise.answer)) problems.push({ where, problem: 'has no answer' });
    }
    return problems;
  },
  function everyExerciseAnswerCitesListedSources(data) {
    const allowed = listedSources(data);
    return [...exercises(data)].flatMap(({ exercise, where }) =>
      citationProblems({ where, cites: 'answer cites', sources: exercise.sources, allowed, outside: 'which is not in the Source list' }),
    );
  },
  function slidesHaveTheirParts(data) {
    const problems = [];
    for (const { lesson, where } of lessons(data)) if (objectsOf(lesson.slides).length === 0) problems.push({ where, problem: 'has no Slides' });
    for (const { slide, where } of slides(data)) {
      if (blank(slide.title)) problems.push({ where, problem: 'has no title' });
      if (objectsOf(slide.points).length === 0) problems.push({ where, problem: 'has no points' });
    }
    for (const { point, where } of points(data)) if (blank(point.text)) problems.push({ where, problem: 'has no text' });
    return problems;
  },
  // Slides say only what their Lesson's Handout says, so a point may cite only Sources that Handout cites.
  function everySlidePointCitesItsHandout(data) {
    return [...points(data)].flatMap(({ lesson, point, where }) =>
      citationProblems({ where, sources: point.sources, allowed: new Set(handoutSources(lesson)), outside: "which the Lesson's Handout does not cite" }),
    );
  },
  // The Handout frames the video, so it must be the player page `am video` writes, not a bare video file.
  function everyVideoIsAPlayerPageThatExists(data) {
    return [...sections(data)].flatMap(({ section, where }) => {
      if (section.video === undefined) return [];
      if (blank(section.video) || !section.video.toLowerCase().endsWith('.html')) return [{ where, problem: `video "${section.video}" is not the path of the .html player page am video wrote` }];
      if (!statSync(section.video, { throwIfNoEntry: false })?.isFile()) return [{ where, problem: `video file ${section.video} does not exist` }];
      return [];
    });
  },
];

function isDocumentUrl(url) {
  try {
    return ['http:', 'https:', 'file:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function isIsoDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

function validate(data, outDir) {
  const problems = CHECKS.flatMap((check) => check(data));
  if (existsSync(outDir)) problems.unshift({ where: outDir, problem: 'already exists; pick another name or path' });
  if (problems.length > 0) {
    throw new BuildError(`refused, ${problems.length} problem(s); nothing was written:\n${problems.map((p) => `- ${p.where}: ${p.problem}`).join('\n')}`);
  }
}

// ---- pages: every value from the data goes through html``, which escapes it, so data text never becomes markup ----

class Markup {
  constructor(text) { this.text = text; }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (text) => String(text).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
const toMarkup = (v) => (v instanceof Markup ? v.text : Array.isArray(v) ? v.map(toMarkup).join('') : v == null || v === false ? '' : escape(v));
const html = (strings, ...values) => new Markup(strings.reduce((out, s, i) => out + s + (i < values.length ? toMarkup(values[i]) : ''), ''));
// Body text from the data: escaped like any value, then each span in backticks shown as code.
const prose = (text) => new Markup(escape(text).replace(/`([^`]+)`/g, '<code>$1</code>'));

const CSS = new Markup(readFileSync(new URL('../assets/course.css', import.meta.url), 'utf8'));
const SLIDES_SCRIPT = new Markup(readFileSync(new URL('../assets/slides.js', import.meta.url), 'utf8'));

// Page labels in the Course's language, and what goes between two sentences; a language without its own labels gets English.
const LABELS = {
  en: { audience: 'Audience', level: 'Level', length: 'Total length', lessons: 'Lessons', lesson: (n) => `Lesson ${n}`, objectives: 'You will be able to', contents: 'Contents', sources: 'Sources', read: (date) => `read ${date}`, between: ' ', exercises: 'Exercises', answer: 'Show answer', video: 'Video', slides: 'Slides', handout: 'Handout', previous: 'Previous slide', next: 'Next slide' },
  zh: { audience: '學員', level: '程度', length: '總時數', lessons: '課程內容', lesson: (n) => `第 ${n} 課`, objectives: '學完這一課，你能夠', contents: '本課內容', sources: '資料來源', read: (date) => `${date} 閱讀`, between: '', exercises: '練習題', answer: '看答案', video: '影片', slides: '投影片', handout: '講義', previous: '上一張', next: '下一張' },
};
const labelsFor = (language) => LABELS[language.toLowerCase().split('-')[0]] ?? LABELS.en;

function page({ language, title, body, layout }) {
  return html`<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>
<main${layout && html` class="${layout}"`}>
${body}
</main>
</body>
</html>
`.text;
}

const objectivesBlock = (lesson, labels) =>
  html`<div class="objectives"><p class="objectives-title">${labels.objectives}</p><ul>${lesson.objectives.map((o) => html`<li>${prose(o)}</li>`)}</ul></div>`;

function syllabusPage(data) {
  const { course } = data;
  const labels = labelsFor(course.language);
  const facts = [[labels.audience, course.audience], [labels.level, course.level], [labels.length, course.length]].map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`);
  const lessonEntries = data.lessons.map(
    (l, i) => html`<li>
<p class="eyebrow">${labels.lesson(i + 1)}</p>
<h3><a href="lessons/${l.id}/handout.html">${l.title}</a></h3>
<p class="lesson-links"><a href="lessons/${l.id}/slides.html">${labels.slides}</a></p>
${objectivesBlock(l, labels)}
<ul class="topics">${l.sections.map((s) => html`<li>${s.heading}${s.video && html` <span class="has-video">${labels.video}</span>`}</li>`)}</ul>
</li>`,
  );
  return page({
    language: course.language,
    title: course.title,
    body: html`<header><h1>${course.title}</h1><dl class="facts">${facts}</dl></header>
<h2>${labels.lessons}</h2>
<ol class="lessons">${lessonEntries}</ol>`,
  });
}

// The Sources a Lesson's Handout cites, each with the number its citation markers show, and those markers;
// `handout` is the Handout's address from the page the markers go on.
function citations(data, lesson, handout = '') {
  const cited = handoutSources(lesson).map((id, i) => ({ id, number: i + 1, source: data.sources.find((s) => s.id === id) }));
  const numberOf = (id) => cited.find((c) => c.id === id).number;
  const markers = (ids) => ids.map((id) => html`<sup class="cite"><a href="${handout}#source-${numberOf(id)}">[${numberOf(id)}]</a></sup>`);
  return { cited, markers };
}

const sourceEntry = (source) => html`${source.author}. <cite>${source.title}</cite>. <a href="${source.url}">${source.url}</a>`;

// Where a section's Explainer video sits, relative to its Lesson folder; named like the section's anchor.
const videoPath = (sectionIndex) => `videos/section-${sectionIndex + 1}.html`;

// A Lesson's Exercises, each answer in a closed <details> so learners try the question first, with no script.
const exercisesBlock = (lesson, labels, markers) =>
  html`<section class="exercises" id="exercises"><h2>${labels.exercises}</h2><ol>${lesson.exercises.map(
    (e, i) => html`<li id="exercise-${i + 1}"><p>${prose(e.question)}</p><details><summary>${labels.answer}</summary><p>${prose(e.answer)}${markers(e.sources)}</p></details></li>`,
  )}</ol></section>`;

// A section's claims in order, two to a paragraph, so a long section does not read as one block of text.
function paragraphs(claims, labels, markers) {
  const out = [];
  for (let i = 0; i < claims.length; i += 2) {
    out.push(html`<p>${claims.slice(i, i + 2).map((c, j) => html`${j > 0 ? labels.between : ''}${prose(c.text)}${markers(c.sources)}`)}</p>`);
  }
  return out;
}

// On a wide screen the Handout reads in three columns: contents, text, and its Source list beside the text.
function handoutPage(data, lesson, index) {
  const labels = labelsFor(data.course.language);
  const { cited, markers } = citations(data, lesson);
  const sectionBlocks = lesson.sections.map(
    (s, i) => html`<section id="section-${i + 1}">
<h2>${s.heading}</h2>
${paragraphs(s.claims, labels, markers)}
${s.video && html`<figure class="video"><iframe src="${videoPath(i)}" title="${labels.video}: ${s.heading}" allowfullscreen></iframe></figure>`}
</section>`,
  );
  const contents = [...lesson.sections.map((s, i) => [`section-${i + 1}`, s.heading]), ['exercises', labels.exercises], ['sources', labels.sources]];
  const sourceList = cited.map(({ number, source }) => html`<li id="source-${number}">${sourceEntry(source)} <span class="read">(${labels.read(source.readOn)})</span></li>`);
  return page({
    language: data.course.language,
    title: `${lesson.title} · ${data.course.title}`,
    layout: 'handout',
    body: html`<nav class="toc" aria-label="${labels.contents}"><p class="toc-title">${labels.contents}</p>${contents.map(([id, text]) => html`<a href="#${id}">${text}</a>`)}</nav>
<div class="handout-text">
<nav class="crumb"><a href="../../index.html">${data.course.title}</a> · <a href="slides.html">${labels.slides}</a></nav>
<header><p class="eyebrow">${labels.lesson(index + 1)}</p><h1>${lesson.title}</h1>${objectivesBlock(lesson, labels)}</header>
${sectionBlocks}
${exercisesBlock(lesson, labels, markers)}
</div>
<aside class="sources" id="sources"><h2>${labels.sources}</h2><ol>${sourceList}</ol></aside>`,
  });
}

// Slides number their citations as the Handout does and link each marker to the Source entry there.
function slidesPage(data, lesson, index) {
  const labels = labelsFor(data.course.language);
  const { cited, markers } = citations(data, lesson, 'handout.html');
  const slideBlocks = lesson.slides.map(
    (s) => html`<section class="slide">
<h2>${s.title}</h2>
<ul class="points">${s.points.map((p) => html`<li>${prose(p.text)}${markers(p.sources)}</li>`)}</ul>
</section>`,
  );
  const onSlides = cited.filter(({ id }) => lesson.slides.some((s) => s.points.some((p) => p.sources.includes(id))));
  const sourceList = onSlides.map(({ number, source }) => html`<li value="${number}">${sourceEntry(source)}</li>`);
  return page({
    language: data.course.language,
    title: `${labels.slides} · ${lesson.title} · ${data.course.title}`,
    body: html`<nav class="pager"><span class="crumb"><a href="../../index.html">${data.course.title}</a> · <a href="handout.html">${labels.handout}</a></span>
<span class="pager-controls"><button type="button" class="pager-prev" aria-label="${labels.previous}">←</button> <span class="pager-count"></span> <button type="button" class="pager-next" aria-label="${labels.next}">→</button></span></nav>
<section class="slide"><p class="eyebrow">${labels.lesson(index + 1)}</p><h1>${lesson.title}</h1>${objectivesBlock(lesson, labels)}</section>
${slideBlocks}
<section class="slide sources"><h2>${labels.sources}</h2><ol>${sourceList}</ol></section>
<script>${SLIDES_SCRIPT}</script>`,
  });
}

function main([dataPath, outDir]) {
  if (!dataPath || !outDir) throw new BuildError('usage: node build-course.mjs <course.json> <out-dir>');
  let data;
  try {
    data = JSON.parse(readFileSync(dataPath, 'utf8'));
  } catch (e) {
    throw new BuildError(`cannot read the course data file ${dataPath}: ${e.message}`);
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) throw new BuildError(`the course data file ${dataPath} must hold one JSON object`);
  validate(data, outDir);
  const pages = { 'index.html': syllabusPage(data) };
  data.lessons.forEach((lesson, i) => {
    const folder = `lessons/${lesson.id}`;
    pages[`${folder}/handout.html`] = handoutPage(data, lesson, i);
    pages[`${folder}/slides.html`] = slidesPage(data, lesson, i);
    lesson.sections.forEach((s, j) => { if (s.video) pages[`${folder}/${videoPath(j)}`] = readFileSync(s.video); });
  });
  writeProject(outDir, pages);
  console.log(`Course project: ${outDir}`);
  for (const path of Object.keys(pages)) console.log(`  ${path}`);
  const gaps = arrayOf(data.evidenceGaps).length;
  console.log(`${gaps} Evidence gap${gaps === 1 ? '' : 's'} in the data, on no page; report them to the user.`);
}

// Writes into a temporary sibling folder and renames it into place, so no half-built Course project is left.
function writeProject(outDir, pages) {
  const target = resolve(outDir);
  mkdirSync(dirname(target), { recursive: true });
  const temp = mkdtempSync(join(dirname(target), `.${basename(target)}-building-`));
  try {
    for (const [path, content] of Object.entries(pages)) {
      mkdirSync(dirname(join(temp, path)), { recursive: true });
      writeFileSync(join(temp, path), content);
    }
    renameSync(temp, target);
  } catch (e) {
    rmSync(temp, { recursive: true, force: true });
    throw e;
  }
}

try {
  main(process.argv.slice(2));
} catch (e) {
  if (!(e instanceof BuildError)) throw e;
  console.error(`build-course: ${e.message}`);
  process.exit(1);
}
