#!/usr/bin/env node
// usage: node build-course.mjs <course.json> <out-dir>
// Builds a Course project from the course data file open-course writes. Node 20+, built-ins only.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';

class BuildError extends Error {}

// ---- checks: each takes the course data and returns its problems as { where, problem }; all run on every build ----

// The parts of the data the checks walk, as lists even when the data file got its shape wrong: list() for
// strings, items() for objects.
const list = (v) => (Array.isArray(v) ? v : []);
const items = (v) => list(v).map((x) => (x && typeof x === 'object' ? x : {}));
const blank = (v) => typeof v !== 'string' || v.trim() === '';

// Lesson ids name the Lesson's folder in the Course project.
const LESSON_ID = /^[a-z0-9][a-z0-9-]*$/;

function* lessons(data) {
  for (const [i, lesson] of items(data.lessons).entries()) yield { lesson, where: `Lesson ${i + 1} (${lesson.id ?? 'no id'})` };
}

function* sections(data) {
  for (const { lesson, where } of lessons(data)) {
    for (const [i, section] of items(lesson.sections).entries()) yield { lesson, section, where: `${where}, section ${i + 1}` };
  }
}

// Every claim in every section of every Lesson, with where it sits.
function* claims(data) {
  for (const { section, where } of sections(data)) {
    for (const [i, claim] of items(section.claims).entries()) yield { claim, where: `${where}, claim ${i + 1}` };
  }
}

// Every Exercise of every Lesson, with where it sits.
function* exercises(data) {
  for (const { lesson, where } of lessons(data)) {
    for (const [i, exercise] of items(lesson.exercises).entries()) yield { exercise, where: `${where}, Exercise ${i + 1}` };
  }
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
  function lessonsHaveTheirParts(data) {
    if (items(data.lessons).length === 0) return [{ where: 'Lessons', problem: 'the Course has no Lessons' }];
    const problems = [];
    const repeated = new Set(duplicates(items(data.lessons).map((l) => l.id)));
    for (const { lesson, where } of lessons(data)) {
      if (typeof lesson.id !== 'string' || !LESSON_ID.test(lesson.id)) problems.push({ where, problem: 'id must be lowercase letters, digits, and hyphens, as it names the Lesson folder' });
      else if (repeated.has(lesson.id)) problems.push({ where, problem: `id ${lesson.id} appears more than once` });
      if (blank(lesson.title)) problems.push({ where, problem: 'has no title' });
      if (list(lesson.objectives).length === 0 || list(lesson.objectives).some(blank)) problems.push({ where, problem: 'needs objectives: a list of learning objectives, none blank' });
      if (items(lesson.sections).length === 0) problems.push({ where, problem: 'has no sections' });
    }
    for (const { section, where } of sections(data)) {
      if (blank(section.heading)) problems.push({ where, problem: 'has no heading' });
      if (items(section.claims).length === 0) problems.push({ where, problem: 'has no claims' });
    }
    for (const { claim, where } of claims(data)) if (blank(claim.text)) problems.push({ where, problem: 'has no text' });
    return problems;
  },
  function sourcesHaveTheirDetails(data) {
    const repeated = new Set(duplicates(items(data.sources).map((s) => s.id)));
    return items(data.sources).flatMap((s, i) => {
      const where = `Source ${s.id ?? i + 1}`;
      const problems = [];
      if (blank(s.id)) problems.push({ where, problem: 'has no id' });
      else if (repeated.has(s.id)) problems.push({ where, problem: `id ${s.id} appears more than once` });
      if (blank(s.title)) problems.push({ where, problem: 'has no title' });
      if (blank(s.author)) problems.push({ where, problem: 'has no author' });
      if (s.kind !== 'primary' && s.kind !== 'secondary') problems.push({ where, problem: 'kind must be primary or secondary' });
      return problems;
    });
  },
  function everyClaimCitesASource(data) {
    return [...claims(data)].filter(({ claim }) => list(claim.sources).length === 0).map(({ where }) => ({ where, problem: 'cites no Source' }));
  },
  function everyCitedSourceIsListed(data) {
    const listed = new Set(items(data.sources).map((s) => s.id));
    return [...claims(data)].flatMap(({ claim, where }) =>
      list(claim.sources).filter((id) => !listed.has(id)).map((id) => ({ where, problem: `cites Source "${id}", which is not in the Source list` })),
    );
  },
  // The URL becomes a link on the page, so only schemes that open a document pass; javascript: and the like do not.
  function everySourceHasAUrlAndReadDate(data) {
    return items(data.sources).flatMap((s, i) => {
      const where = `Source ${s.id ?? i + 1}`;
      const problems = [];
      if (!s.url) problems.push({ where, problem: 'has no URL' });
      else if (!isDocumentUrl(s.url)) problems.push({ where, problem: `URL "${s.url}" is not an http, https, or file address` });
      if (!s.readOn) problems.push({ where, problem: 'has no read date (readOn)' });
      else if (!isIsoDate(s.readOn)) problems.push({ where, problem: `read date "${s.readOn}" is not a YYYY-MM-DD date` });
      return problems;
    });
  },
  function exercisesHaveTheirParts(data) {
    const problems = [];
    for (const { lesson, where } of lessons(data)) if (items(lesson.exercises).length === 0) problems.push({ where, problem: 'has no Exercises' });
    for (const { exercise, where } of exercises(data)) {
      if (blank(exercise.question)) problems.push({ where, problem: 'has no question' });
      if (blank(exercise.answer)) problems.push({ where, problem: 'has no answer' });
    }
    return problems;
  },
  // An Exercise answer is held to the same citation rule as a claim.
  function everyExerciseAnswerCitesListedSources(data) {
    const listed = new Set(items(data.sources).map((s) => s.id));
    return [...exercises(data)].flatMap(({ exercise, where }) =>
      list(exercise.sources).length === 0
        ? [{ where, problem: 'answer cites no Source' }]
        : list(exercise.sources).filter((id) => !listed.has(id)).map((id) => ({ where, problem: `answer cites Source "${id}", which is not in the Source list` })),
    );
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
const piece = (v) => (v instanceof Markup ? v.text : Array.isArray(v) ? v.map(piece).join('') : v == null || v === false ? '' : escape(v));
const html = (strings, ...values) => new Markup(strings.reduce((out, s, i) => out + s + (i < values.length ? piece(values[i]) : ''), ''));

const CSS = new Markup(readFileSync(new URL('../assets/course.css', import.meta.url), 'utf8'));

// Page labels in the Course's language, and what goes between two sentences; a language without its own labels gets English.
const LABELS = {
  en: { audience: 'Audience', level: 'Level', length: 'Total length', lessons: 'Lessons', lesson: (n) => `Lesson ${n}`, objectives: 'You will be able to', sources: 'Sources', read: (date) => `read ${date}`, between: ' ', exercises: 'Exercises', answer: 'Show answer' },
  zh: { audience: '學員', level: '程度', length: '總時數', lessons: '課程內容', lesson: (n) => `第 ${n} 課`, objectives: '學完這一課，你能夠', sources: '資料來源', read: (date) => `${date} 閱讀`, between: '', exercises: '練習題', answer: '看答案' },
};
const labelsFor = (language = 'en') => LABELS[language.toLowerCase().split('-')[0]] ?? LABELS.en;

function page({ language, title, body }) {
  return html`<!doctype html>
<html lang="${language ?? 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`.text;
}

const objectivesBlock = (lesson, t) =>
  html`<div class="objectives"><p class="objectives-title">${t.objectives}</p><ul>${lesson.objectives.map((o) => html`<li>${o}</li>`)}</ul></div>`;

function syllabusPage(data) {
  const { course } = data;
  const t = labelsFor(course.language);
  const facts = [[t.audience, course.audience], [t.level, course.level], [t.length, course.length]].map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`);
  const lessons = data.lessons.map(
    (l, i) => html`<li>
<p class="eyebrow">${t.lesson(i + 1)}</p>
<h3><a href="lessons/${l.id}/handout.html">${l.title}</a></h3>
${objectivesBlock(l, t)}
<ul class="topics">${l.sections.map((s) => html`<li>${s.heading}</li>`)}</ul>
</li>`,
  );
  return page({
    language: course.language,
    title: course.title,
    body: html`<header><h1>${course.title}</h1><dl class="facts">${facts}</dl></header>
<h2>${t.lessons}</h2>
<ol class="lessons">${lessons}</ol>`,
  });
}

// Numbers the Sources a Handout cites, claims then Exercise answers, in order of first citation; the Handout lists only those.
function citationNumbers(lesson) {
  const numbers = new Map();
  const cited = [...lesson.sections.flatMap((s) => s.claims), ...lesson.exercises].flatMap((x) => x.sources);
  for (const id of cited) if (!numbers.has(id)) numbers.set(id, numbers.size + 1);
  return numbers;
}

// A Lesson's Exercises, each answer in a closed <details> so learners try the question first, with no script.
const exercisesBlock = (lesson, t, markers) =>
  html`<section class="exercises"><h2>${t.exercises}</h2><ol>${lesson.exercises.map(
    (e, i) => html`<li id="exercise-${i + 1}"><p>${e.question}</p><details><summary>${t.answer}</summary><p>${e.answer}${markers(e.sources)}</p></details></li>`,
  )}</ol></section>`;

function handoutPage(data, lesson, index) {
  const t = labelsFor(data.course.language);
  const numbers = citationNumbers(lesson);
  const markers = (ids) => ids.map((id) => html`<sup class="cite"><a href="#source-${numbers.get(id)}">[${numbers.get(id)}]</a></sup>`);
  const sections = lesson.sections.map(
    (s, i) => html`<section id="section-${i + 1}">
<h2>${s.heading}</h2>
<p>${s.claims.map((c, j) => html`${j > 0 ? t.between : ''}${c.text}${markers(c.sources)}`)}</p>
</section>`,
  );
  const sources = [...numbers].map(([id, n]) => {
    const s = data.sources.find((x) => x.id === id);
    return html`<li id="source-${n}">${s.author}. <cite>${s.title}</cite>. <a href="${s.url}">${s.url}</a> <span class="read">(${t.read(s.readOn)})</span></li>`;
  });
  return page({
    language: data.course.language,
    title: `${lesson.title} · ${data.course.title}`,
    body: html`<nav class="crumb"><a href="../../index.html">${data.course.title}</a></nav>
<header><p class="eyebrow">${t.lesson(index + 1)}</p><h1>${lesson.title}</h1>${objectivesBlock(lesson, t)}</header>
${sections}
${exercisesBlock(lesson, t, markers)}
<section class="sources"><h2>${t.sources}</h2><ol>${sources}</ol></section>`,
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
  data.lessons.forEach((lesson, i) => { pages[`lessons/${lesson.id}/handout.html`] = handoutPage(data, lesson, i); });
  writeProject(outDir, pages);
  console.log(`Course project: ${outDir}`);
  for (const path of Object.keys(pages)) console.log(`  ${path}`);
  const gaps = list(data.evidenceGaps).length;
  console.log(`${gaps} Evidence gap${gaps === 1 ? '' : 's'} in the data, on no page; report them to the user.`);
}

// Writes into a temporary sibling folder and renames it into place, so no half-built Course project is left.
function writeProject(outDir, pages) {
  const target = resolve(outDir);
  mkdirSync(dirname(target), { recursive: true });
  const temp = mkdtempSync(join(dirname(target), `.${basename(target)}-building-`));
  try {
    for (const [path, html] of Object.entries(pages)) {
      mkdirSync(dirname(join(temp, path)), { recursive: true });
      writeFileSync(join(temp, path), html);
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
