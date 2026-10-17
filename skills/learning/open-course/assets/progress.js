// Inlined into the Syllabus and each Handout by build-course.mjs. Remembers, in this browser only, which Lessons were
// opened and which one last, and marks them on the rail. Without it, or without storage, the pages read the same, unmarked.
(() => {
  const body = document.body;
  const key = `open-course:${body.dataset.course}`;
  let seen = [];
  let last = null;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved?.seen)) seen = saved.seen;
    if (typeof saved?.last === 'string') last = saved.last;
  } catch {}

  const here = body.dataset.lesson;
  if (here) {
    seen = [...new Set([...seen, here])];
    last = here;
    try { localStorage.setItem(key, JSON.stringify({ seen, last })); } catch {}
  }

  const rail = document.querySelector('.rail');
  if (!rail) return;
  const strip = rail.querySelector('ol');
  let focus = rail.querySelector('[aria-current="page"]');
  for (const cell of rail.querySelectorAll('a[data-lesson]')) {
    if (seen.includes(cell.dataset.lesson)) cell.classList.add('seen');
    if (!here && cell.dataset.lesson === last) {
      cell.classList.add('last');
      focus = cell;
      document.querySelector(`.frame[data-lesson="${CSS.escape(last)}"]`)?.classList.add('last');
      const resume = document.querySelector('.resume');
      if (resume) {
        resume.href = cell.href;
        resume.textContent = `${rail.dataset.flag}　${cell.title}`;
        resume.hidden = false;
      }
    }
  }
  // On a narrow screen the rail scrolls sideways; bring the marked frame into view without moving the page.
  if (focus && strip.scrollWidth > strip.clientWidth) {
    strip.scrollLeft = focus.parentElement.offsetLeft - (strip.clientWidth - focus.offsetWidth) / 2;
  }
})();
