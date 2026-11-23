import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';
import { prefersReducedMotion } from './motion';

/*
 * Shared-element transition: the cover a reader clicks morphs into the large cover on the book page
 * (View Transitions API; browsers without it simply navigate). Only one element may carry the
 * transition name at a time, so it is assigned to the clicked cover just before navigating and to
 * the book page's cover once it has rendered, then removed again.
 */
const NAME = 'book-cover';
let source: HTMLElement | null = null;
let forget: ReturnType<typeof setTimeout> | undefined;

function clearSource(): void {
  if (source) source.style.viewTransitionName = '';
  source = null;
  clearTimeout(forget);
}

/** Call on a plain left-click of a book link, with the cover element that should fly. */
export function markCoverSource(cover: HTMLElement | null, event?: MouseEvent): void {
  clearSource();
  if (!cover || prefersReducedMotion() || !('startViewTransition' in document)) return;
  if (event && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
  cover.style.viewTransitionName = NAME;
  source = cover;
  // If no navigation follows (e.g. it was cancelled), don't leave the name behind.
  forget = setTimeout(clearSource, 2000);
}

function leaf(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  let r = route;
  while (r.firstChild) r = r.firstChild;
  return r;
}

/** Passed to withViewTransitions({ onViewTransitionCreated }). */
export function onViewTransitionCreated({ transition, to }: ViewTransitionInfo): void {
  const from = source;
  const toBook = leaf(to).routeConfig?.path === 'book/:id';
  if (!from || !toBook) {
    clearSource();
    return;
  }
  clearTimeout(forget);
  source = null;
  transition.updateCallbackDone
    .then(() => {
      from.style.viewTransitionName = '';
      const target = document.querySelector<HTMLElement>('[data-cover-target]');
      if (!target) return;
      target.closest('.cover-3d')?.classList.add('no-entrance');
      target.style.viewTransitionName = NAME;
      void transition.finished.finally(() => (target.style.viewTransitionName = ''));
    })
    .catch(() => (from.style.viewTransitionName = ''));
}
