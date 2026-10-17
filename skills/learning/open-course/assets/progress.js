// Inlined into the Syllabus after rail.js. Remembers, in this browser only, which Lessons the reader opened and which
// one last, and marks them on the rail. The Syllabus keeps the record itself, in its own storage, because pages opened
// from disk may not share storage with one another. It records a Lesson opened from here, and the Lesson a Handout or
// Slides page names in its link back here (#from=<lesson id>). Without script or storage the page reads the same, unmarked.
(() => {
  const key = `open-course:${document.body.dataset.course}`;
  const cells = [...document.querySelectorAll('.rail a[data-lesson]')];
  const lessons = new Set(cells.map((cell) => cell.dataset.lesson));
  let seen = [];
  let last = null;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved?.seen)) seen = saved.seen.filter((id) => lessons.has(id));
    if (lessons.has(saved?.last)) last = saved.last;
  } catch {}

  function record(id) {
    if (!lessons.has(id)) return;
    seen = [...new Set([...seen, id])];
    last = id;
    try { localStorage.setItem(key, JSON.stringify({ seen, last })); } catch {}
  }

  function mark() {
    for (const cell of cells) {
      cell.classList.toggle('seen', seen.includes(cell.dataset.lesson));
      cell.classList.toggle('last', cell.dataset.lesson === last);
    }
    for (const frame of document.querySelectorAll('.frame')) frame.classList.toggle('last', frame.dataset.lesson === last);
    const cell = cells.find((c) => c.dataset.lesson === last);
    const resume = document.querySelector('.resume');
    resume.hidden = !cell;
    if (!cell) return;
    resume.href = cell.href;
    resume.textContent = `${document.querySelector('.rail').dataset.flag}　${cell.title}`;
    centerFrame(cell);
  }

  // A Lesson opened from here: any link into lessons/<id>/, by click or middle click.
  const opened = (e) => {
    const id = /^lessons\/([^/]+)\//.exec(e.target.closest('a')?.getAttribute('href') ?? '')?.[1];
    if (id) record(id);
  };
  document.addEventListener('click', opened);
  document.addEventListener('auxclick', opened);

  const from = /^#from=(.+)$/.exec(location.hash)?.[1];
  if (from) {
    record(decodeURIComponent(from));
    try { history.replaceState(null, '', location.pathname + location.search); } catch {}
  }
  mark();
  // Back from a Lesson, the browser may show this page from its cache; mark what was opened since.
  addEventListener('pageshow', (e) => { if (e.persisted) mark(); });
})();
