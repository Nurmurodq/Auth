import { Directive, ElementRef, OnDestroy, effect, inject, input, untracked } from '@angular/core';
import { formatNumberLocale } from '../../i18n/i18n';
import { prefersReducedMotion } from './motion';

const DURATION = 1400;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Counts a number up from zero the first time it scrolls into view; later changes (or a language
 * switch) update it instantly. The element's text is owned by the directive, so leave it empty.
 */
@Directive({ selector: '[appCountUp]' })
export class CountUpDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly value = input.required<number>({ alias: 'appCountUp' });
  /** Formats the (possibly fractional) running value; defaults to a localised whole number. */
  readonly format = input<(n: number) => string>((n) => formatNumberLocale(Math.round(n)));

  private played = false;
  private frame = 0;
  private io: IntersectionObserver | null = null;

  constructor() {
    effect(() => {
      const value = this.value();
      const format = this.format();
      untracked(() => (this.played ? this.render(value, format) : this.arm(value, format)));
    });
  }

  private render(value: number, format: (n: number) => string): void {
    cancelAnimationFrame(this.frame);
    this.el.textContent = format(value);
  }

  private arm(value: number, format: (n: number) => string): void {
    this.el.textContent = format(value);
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined' || value <= 0) {
      this.played = true;
      return;
    }
    this.io?.disconnect();
    this.io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        this.io?.disconnect();
        this.played = true;
        this.play(value, format);
      },
      { threshold: 0.4 },
    );
    this.io.observe(this.el);
  }

  private play(value: number, format: (n: number) => string): void {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      this.el.textContent = format(t >= 1 ? value : value * easeOut(t));
      if (t < 1) this.frame = requestAnimationFrame(tick);
    };
    this.el.textContent = format(0);
    this.frame = requestAnimationFrame(tick);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.io?.disconnect();
  }
}
