import { Directive, ElementRef, OnDestroy, OnInit, inject, input, numberAttribute } from '@angular/core';
import { prefersReducedMotion } from './motion';

/* One observer for the whole app: each element is revealed once, the first time it scrolls into view. */
let observer: IntersectionObserver | null = null;
const pending = new Map<Element, () => void>();

function watch(el: Element, reveal: () => void): void {
  if (typeof IntersectionObserver === 'undefined') return reveal();
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer!.unobserve(entry.target);
        pending.get(entry.target)?.();
        pending.delete(entry.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
  );
  pending.set(el, reveal);
  observer.observe(el);
}

/**
 * Fades and lifts an element in when it first scrolls into view. Pass a number to stagger siblings:
 * `<li [appReveal]="$index">`. Content stays visible without JavaScript and with reduced motion.
 */
@Directive({
  selector: '[appReveal]',
  host: { class: 'reveal', '[style.--reveal-i]': 'index()' },
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly index = input(0, { alias: 'appReveal', transform: (v: unknown) => numberAttribute(v, 0) });

  ngOnInit(): void {
    if (prefersReducedMotion()) {
      this.el.classList.add('is-revealed', 'no-anim');
      return;
    }
    watch(this.el, () => this.el.classList.add('is-revealed'));
  }

  ngOnDestroy(): void {
    observer?.unobserve(this.el);
    pending.delete(this.el);
  }
}
