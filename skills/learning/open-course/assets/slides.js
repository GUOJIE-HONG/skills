// Inlined into each Slides page by build-course.mjs, after rail.js. Shows one slide at a time: the left and right arrow keys
// change slide, and so do Page Up / Page Down, which presentation clickers send. The rail under the slide marks
// where you are, and its frames jump to a slide. Without it every slide shows in turn and the rail links to each.
const slides = [...document.querySelectorAll('.slide')];
const cells = [...document.querySelectorAll('.slide-rail a')];
const count = document.querySelector('.pager-count');
let current = 0;

function show(n) {
  current = Math.max(0, Math.min(slides.length - 1, n));
  slides.forEach((slide, i) => { slide.hidden = i !== current; });
  cells.forEach((cell, i) => {
    cell.classList.toggle('seen', i < current);
    if (i === current) cell.setAttribute('aria-current', 'step');
    else cell.removeAttribute('aria-current');
  });
  count.textContent = `${current + 1} / ${slides.length}`;
  centerFrame(cells[current]);
  try { history.replaceState(null, '', `#${slides[current].id}`); } catch {}
}

// The slide a #slide-<n> address names, counted from 0, or 0 for any other address.
function fromHash() {
  const n = Number(/^#slide-(\d+)$/.exec(location.hash)?.[1]);
  return n > 0 ? n - 1 : 0;
}

document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') show(current + 1);
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') show(current - 1);
  else return;
  e.preventDefault();
});
document.querySelector('.pager-prev').addEventListener('click', () => show(current - 1));
document.querySelector('.pager-next').addEventListener('click', () => show(current + 1));
cells.forEach((cell, i) => cell.addEventListener('click', (e) => { e.preventDefault(); show(i); }));
window.addEventListener('hashchange', () => show(fromHash()));
document.documentElement.classList.add('presenting');
show(fromHash());
