import { Directive, ElementRef, OnDestroy, inject } from '@angular/core';
import { hasFinePointer, rafThrottle } from './motion';

/** A soft accent-coloured light that follows the mouse across a card. */
@Directive({
  selector: '[appSpotlight]',
  host: { class: 'spotlight', '(pointermove)': 'onMove($event)' },
})
export class SpotlightDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly apply = rafThrottle((x: number, y: number) => {
    this.el.style.setProperty('--mx', `${x}px`);
    this.el.style.setProperty('--my', `${y}px`);
  });

  protected onMove(e: PointerEvent): void {
    if (e.pointerType !== 'mouse' || !hasFinePointer()) return;
    const r = this.el.getBoundingClientRect();
    this.apply(Math.round(e.clientX - r.left), Math.round(e.clientY - r.top));
  }

  ngOnDestroy(): void {
    this.apply.cancel();
  }
}
