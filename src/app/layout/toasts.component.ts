import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toast, ToastService } from '../services/toast.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="stack" role="status" aria-live="polite" aria-atomic="false">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class.success]="t.tone === 'success'" [class.error]="t.tone === 'error'">
          @if (t.tone === 'success') {
            <app-icon name="check" [size]="18" class="tone" />
          } @else if (t.tone === 'error') {
            <app-icon name="alert" [size]="18" class="tone" />
          }
          <span class="msg">{{ t.message }}</span>
          @if (t.action) {
            <button type="button" class="action" (click)="run(t)">{{ t.action.label }}</button>
          }
          <button type="button" class="close" (click)="toasts.dismiss(t.id)" aria-label="Dismiss notification">
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed;
      left: 50%;
      bottom: 24px;
      z-index: 200;
      display: grid;
      gap: 10px;
      width: min(440px, calc(100vw - 24px));
      transform: translateX(-50%);
      pointer-events: none;
    }
    @media (max-width: 767px) {
      .stack {
        bottom: calc(var(--mobile-nav-h) + 14px + env(safe-area-inset-bottom));
      }
    }
    :host-context(.immersive) .stack {
      bottom: 88px;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 10px 12px 16px;
      border-radius: var(--radius);
      background: #211d18;
      color: #f6f1ea;
      box-shadow: var(--shadow-lg);
      font-size: 0.92rem;
      pointer-events: auto;
      animation: toast-in 260ms var(--ease) both;
    }
    :host-context([data-theme='dark']) .toast {
      background: #f2ede5;
      color: #1d1a16;
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
      }
    }
    .tone {
      flex: none;
    }
    .success .tone {
      color: #7fd1a7;
    }
    .error .tone {
      color: #ff9b91;
    }
    :host-context([data-theme='dark']) .success .tone {
      color: #2c6a4c;
    }
    :host-context([data-theme='dark']) .error .tone {
      color: #b3261e;
    }
    .msg {
      flex: 1;
      line-height: 1.4;
    }
    .action {
      padding: 6px 10px;
      border-radius: var(--radius-xs);
      font-weight: 700;
      color: #f0a184;
    }
    :host-context([data-theme='dark']) .action {
      color: #9c3d24;
    }
    .action:hover {
      background: rgb(255 255 255 / 0.08);
    }
    .close {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      opacity: 0.6;
    }
    .close:hover {
      opacity: 1;
    }
  `,
})
export class ToastsComponent {
  protected readonly toasts = inject(ToastService);

  protected run(t: Toast): void {
    t.action?.run();
    this.toasts.dismiss(t.id);
  }
}
