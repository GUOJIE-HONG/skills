// Inlined first into every page by build-course.mjs. On a narrow screen a rail scrolls sideways; centerFrame brings
// one of its frames into view without moving the page. The frame marked as this page starts in view.
function centerFrame(cell) {
  const strip = cell?.closest('ol');
  if (strip && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = cell.parentElement.offsetLeft - (strip.clientWidth - cell.offsetWidth) / 2;
}
centerFrame(document.querySelector('.rail [aria-current]'));
