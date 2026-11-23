import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { APP_NAME } from '../config';

@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="mark" viewBox="0 0 32 32" [attr.width]="size()" [attr.height]="size()" aria-hidden="true">
      <rect width="32" height="32" rx="8" class="mark-bg" />
      <path d="M5.5 9.6c3.6-1.7 7.1-1.6 9.7.4v13.6c-2.8-1.7-6.2-1.8-9.7-.3V9.6Z" class="mark-page" />
      <path d="M26.5 9.6c-3.6-1.7-7.1-1.6-9.7.4v13.6c2.8-1.7 6.2-1.8 9.7-.3V9.6Z" class="mark-page" opacity=".82" />
    </svg>
    @if (wordmark()) {
      <span class="word">{{ name }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .mark-bg {
      fill: var(--accent);
    }
    .mark-page {
      fill: #f8efe3;
    }
    :host-context([data-theme='dark']) .mark-page {
      fill: #1c120d;
    }
    .word {
      font-family: var(--font-brand);
      font-size: 1.42rem;
      font-weight: 560;
      letter-spacing: -0.03em;
      line-height: 1;
      color: var(--text);
    }
  `,
})
export class LogoComponent {
  readonly size = input(30);
  readonly wordmark = input(true);
  protected readonly name = APP_NAME;
}
