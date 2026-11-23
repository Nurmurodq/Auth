import { Directive, ElementRef, OnDestroy, inject } from '@angular/core';
import { hasFinePointer, prefersReducedMotion, rafThrottle } from './motion';

/** Exposes the pointer position over the element as --px / --py (−1…1) for gentle parallax. */
@Directive({
  selector: '[appParallax]',
  host: { '(pointermove)': 'onMove($event)', '(pointerleave)': 'reset()' },
})
export class ParallaxDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly apply = rafThrottle((x: number, y: number) => {
    this.el.style.setProperty('--px', x.toFixed(3));
    this.el.style.setProperty('--py', y.toFixed(3));
  });

  protected onMove(e: PointerEvent): void {
    if (e.pointerType !== 'mouse' || !hasFinePointer() || prefersReducedMotion()) return;
    const r = this.el.getBoundingClientRect();
    this.apply(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  }

  protected reset(): void {
    this.apply.cancel();
    this.el.style.setProperty('--px', '0');
    this.el.style.setProperty('--py', '0');
  }

  ngOnDestroy(): void {
    this.apply.cancel();
  }
}
