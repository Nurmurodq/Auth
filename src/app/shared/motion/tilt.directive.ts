import { Directive, ElementRef, OnDestroy, inject, input, numberAttribute } from '@angular/core';
import { hasFinePointer, prefersReducedMotion, rafThrottle } from './motion';

/**
 * Tilts the element toward the mouse in 3D and moves a soft glare across it, like turning a real
 * book in the light. Mouse only; touch and reduced-motion users get the element as is.
 */
@Directive({
  selector: '[appTilt]',
  host: {
    class: 'tilt',
    '(pointermove)': 'onMove($event)',
    '(pointerleave)': 'reset()',
  },
})
export class TiltDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** Maximum rotation in degrees. */
  readonly max = input(10, { alias: 'appTilt', transform: (v: unknown) => numberAttribute(v, 10) });

  private readonly apply = rafThrottle((x: number, y: number) => {
    const s = this.el.style;
    s.setProperty('--rx', `${((0.5 - y) * this.max()).toFixed(2)}deg`);
    s.setProperty('--ry', `${((x - 0.5) * this.max()).toFixed(2)}deg`);
    s.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    s.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    this.el.classList.add('tilting');
  });

  protected onMove(e: PointerEvent): void {
    if (e.pointerType !== 'mouse' || !hasFinePointer() || prefersReducedMotion()) return;
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.apply(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  }

  protected reset(): void {
    this.apply.cancel();
    this.el.classList.remove('tilting');
    for (const p of ['--rx', '--ry', '--gx', '--gy']) this.el.style.removeProperty(p);
  }

  ngOnDestroy(): void {
    this.apply.cancel();
  }
}
