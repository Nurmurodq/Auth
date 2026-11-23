import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { prefersReducedMotion } from './motion';

/** A little burst of colour and a heartbeat when the bound flag turns on (e.g. favouriting a book). */
@Directive({ selector: '[appBurst]', host: { class: 'burst-host' } })
export class BurstDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly active = input(false, { alias: 'appBurst' });
  private previous: boolean | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const on = this.active();
      if (this.previous === false && on && !prefersReducedMotion()) this.play();
      this.previous = on;
    });
  }

  private play(): void {
    clearTimeout(this.timer);
    this.el.classList.remove('bursting');
    void this.el.offsetWidth; // restart the animation
    this.el.classList.add('bursting');
    this.timer = setTimeout(() => this.el.classList.remove('bursting'), 800);
  }
}
