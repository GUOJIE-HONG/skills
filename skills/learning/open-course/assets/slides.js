// Inlined into each Slides page by build-course.mjs. Shows one slide at a time: the left and right arrow keys
// change slide, and so do Page Up / Page Down, which presentation clickers send. Without it every slide shows in turn.
const slides = [...document.querySelectorAll('.slide')];
const count = document.querySelector('.pager-count');
let current = 0;
function show(n) {
  current = Math.max(0, Math.min(slides.length - 1, n));
  slides.forEach((slide, i) => { slide.hidden = i !== current; });
  count.textContent = `${current + 1} / ${slides.length}`;
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
document.documentElement.classList.add('presenting');
show(0);
