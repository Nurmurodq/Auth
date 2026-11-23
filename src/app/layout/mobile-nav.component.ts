import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { t } from '../i18n/i18n';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { UiService } from '../services/ui.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-mobile-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <nav [attr.aria-label]="t('header.primaryNav')">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
        <app-icon name="home" [size]="22" />
        <span>{{ t('nav.home') }}</span>
      </a>
      <a routerLink="/browse" routerLinkActive="active">
        <app-icon name="compass" [size]="22" />
        <span>{{ t('nav.browse') }}</span>
      </a>
      <button type="button" (click)="ui.openSearch()">
        <app-icon name="search" [size]="22" />
        <span>{{ t('nav.search') }}</span>
      </button>
      <a routerLink="/library" routerLinkActive="active">
        <app-icon name="library" [size]="22" />
        <span>{{ t('nav.libraryShort') }}</span>
      </a>
      @if (auth.isAuthenticated()) {
        <a routerLink="/account" routerLinkActive="active">
          <app-icon name="user" [size]="22" />
          <span>{{ t('nav.accountShort') }}</span>
        </a>
      } @else {
        <a routerLink="/login" routerLinkActive="active">
          <app-icon name="user" [size]="22" />
          <span>{{ t('auth.signIn') }}</span>
        </a>
      }
    </nav>
  `,
  styles: `
    :host {
      position: fixed;
      inset: auto 0 0 0;
      z-index: 60;
      display: none;
      padding-bottom: env(safe-area-inset-bottom);
      background: color-mix(in srgb, var(--bg-elevated) 88%, transparent);
      backdrop-filter: saturate(1.6) blur(18px);
      -webkit-backdrop-filter: saturate(1.6) blur(18px);
      border-top: 1px solid var(--border);
    }
    @media (max-width: 767px) {
      :host {
        display: block;
      }
    }
    nav {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      height: var(--mobile-nav-h);
    }
    a,
    button {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      color: var(--text-3);
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      -webkit-tap-highlight-color: transparent;
      transition: color var(--dur-fast) var(--ease);
    }
    a.active {
      color: var(--accent);
    }
    a:active app-icon,
    button:active app-icon {
      transform: scale(0.9);
    }
    app-icon {
      transition: transform var(--dur-fast) var(--ease);
    }
  `,
})
export class MobileNavComponent {
  protected readonly t = t;
  protected readonly auth = inject(AuthService);
  protected readonly ui = inject(UiService);
}
