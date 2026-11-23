import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { t } from '../i18n/i18n';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { ThemeService } from '../services/theme.service';
import { ToastService } from '../services/toast.service';
import { UiService } from '../services/ui.service';
import { IconComponent } from '../shared/icon.component';
import { LogoComponent } from '../shared/logo.component';
import { LanguageSwitcherComponent } from '../i18n/language-switcher.component';
import { initials } from '../utils/format';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent, LogoComponent, LanguageSwitcherComponent],
  host: {
    role: 'banner',
    '[class.scrolled]': 'scrolled()',
    '(window:scroll)': 'onScroll()',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
  template: `
    <div class="container bar">
      <a routerLink="/" class="brand" [attr.aria-label]="t('header.home')"><app-logo /></a>

      <nav class="nav" [attr.aria-label]="t('header.primaryNav')">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">{{ t('nav.home') }}</a>
        <a routerLink="/browse" routerLinkActive="active">{{ t('nav.browse') }}</a>
        <a routerLink="/library" routerLinkActive="active">{{ t('nav.library') }}</a>
      </nav>

      <div class="actions">
        <button type="button" class="search-pill" (click)="ui.openSearch()" [attr.aria-label]="t('header.searchLabel', { shortcut })">
          <app-icon name="search" [size]="18" />
          <span class="search-text">{{ t('header.searchPlaceholder') }}</span>
          <span class="kbd">{{ shortcut }}</span>
        </button>
        <button type="button" class="icon-btn search-icon" (click)="ui.openSearch()" [attr.aria-label]="t('header.search')">
          <app-icon name="search" />
        </button>
        <button
          type="button"
          class="icon-btn"
          (click)="theme.toggle()"
          [attr.aria-label]="theme.resolved() === 'dark' ? t('theme.toLight') : t('theme.toDark')"
        >
          <app-icon [name]="theme.resolved() === 'dark' ? 'sun' : 'moon'" />
        </button>
        <app-language-switcher class="lang" />

        @if (auth.user(); as user) {
          <div class="account" #menuRoot>
            <button
              type="button"
              class="avatar-btn"
              (click)="menuOpen.set(!menuOpen())"
              [attr.aria-expanded]="menuOpen()"
              aria-haspopup="menu"
              [attr.aria-label]="t('header.accountMenu')"
            >
              <span class="avatar">{{ userInitials() }}</span>
              <app-icon name="chevron-down" [size]="16" class="chev" />
            </button>
            @if (menuOpen()) {
              <div class="menu" role="menu">
                <div class="menu-head">
                  <span class="avatar lg">{{ userInitials() }}</span>
                  <div class="who">
                    <strong>{{ user.name }}</strong>
                    <span>{{ user.email }}</span>
                  </div>
                </div>
                <a role="menuitem" routerLink="/library" (click)="menuOpen.set(false)"><app-icon name="library" [size]="18" />{{ t('nav.library') }}</a>
                <a role="menuitem" routerLink="/library" [queryParams]="{ tab: 'bookmarks' }" (click)="menuOpen.set(false)"
                  ><app-icon name="bookmark" [size]="18" />{{ t('nav.bookmarks') }}</a
                >
                <a role="menuitem" routerLink="/account" (click)="menuOpen.set(false)"><app-icon name="user" [size]="18" />{{ t('nav.account') }}</a>
                <hr class="divider" />
                <button role="menuitem" type="button" (click)="signOut()"><app-icon name="log-out" [size]="18" />{{ t('auth.signOut') }}</button>
              </div>
            }
          </div>
        } @else if (auth.ready()) {
          <a routerLink="/login" class="btn btn-ghost btn-sm signin">{{ t('auth.signIn') }}</a>
          <a routerLink="/register" class="btn btn-dark btn-sm join">{{ t('auth.getStarted') }}</a>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      position: sticky;
      top: 0;
      z-index: 50;
      display: block;
      height: var(--header-h);
      background: color-mix(in srgb, var(--bg) 82%, transparent);
      backdrop-filter: saturate(1.6) blur(16px);
      -webkit-backdrop-filter: saturate(1.6) blur(16px);
      border-bottom: 1px solid transparent;
      transition: border-color var(--dur) var(--ease), background-color var(--dur) var(--ease);
    }
    :host(.scrolled) {
      border-bottom-color: var(--border);
    }
    .bar {
      height: 100%;
      display: flex;
      align-items: center;
      gap: 28px;
    }
    .brand {
      flex: none;
      border-radius: var(--radius-sm);
    }
    .nav {
      display: flex;
      gap: 4px;
    }
    .nav a {
      position: relative;
      padding: 8px 14px;
      border-radius: var(--radius-full);
      font-size: 0.93rem;
      font-weight: 550;
      color: var(--text-2);
      transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
    }
    .nav a:hover {
      color: var(--text);
      background: var(--surface-hover);
    }
    .nav a.active {
      color: var(--text);
      background: var(--surface);
    }
    .actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .search-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 40px;
      width: 280px;
      padding: 0 8px 0 14px;
      margin-right: 6px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text-3);
      font-size: 0.9rem;
      transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
    }
    .search-pill:hover {
      border-color: var(--border-strong);
      box-shadow: var(--shadow-sm);
    }
    .search-text {
      flex: 1;
      text-align: left;
    }
    .search-icon {
      display: none;
    }
    .account {
      position: relative;
      margin-left: 4px;
    }
    .avatar-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 6px 3px 3px;
      border-radius: var(--radius-full);
      color: var(--text-2);
      transition: background-color var(--dur-fast) var(--ease);
    }
    .avatar-btn:hover,
    .avatar-btn[aria-expanded='true'] {
      background: var(--surface-hover);
    }
    .avatar {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(140deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #3a1d10));
      color: #fff;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .avatar.lg {
      width: 42px;
      height: 42px;
      font-size: 0.95rem;
    }
    .menu {
      position: absolute;
      right: 0;
      top: calc(100% + 10px);
      width: 260px;
      padding: 8px;
      border-radius: var(--radius);
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      animation: fade-up 180ms var(--ease) both;
      transform-origin: top right;
    }
    .menu-head {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 8px 8px 12px;
    }
    .who {
      display: grid;
      min-width: 0;
    }
    .who strong {
      font-size: 0.95rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .who span {
      font-size: 0.82rem;
      color: var(--text-3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .menu a,
    .menu button {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 10px;
      border-radius: var(--radius-sm);
      font-size: 0.92rem;
      font-weight: 500;
      color: var(--text);
      text-align: left;
    }
    .menu a:hover,
    .menu button:hover,
    .menu a:focus-visible,
    .menu button:focus-visible {
      background: var(--surface);
    }
    .menu app-icon {
      color: var(--text-3);
    }
    .menu .divider {
      margin: 6px 4px;
    }
    .search-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @media (max-width: 1100px) {
      .search-pill {
        width: 220px;
      }
      .search-pill .kbd {
        display: none;
      }
    }
    @media (max-width: 860px) {
      .search-pill {
        display: none;
      }
      .search-icon {
        display: inline-grid;
      }
    }
    @media (max-width: 767px) {
      .nav,
      .join,
      .account {
        display: none;
      }
      .bar {
        gap: 12px;
      }
    }
  `,
})
export class HeaderComponent {
  protected readonly t = t;
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly ui = inject(UiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly menuRoot = viewChild<ElementRef<HTMLElement>>('menuRoot');

  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly userInitials = computed(() => initials(this.auth.user()?.name ?? ''));
  protected readonly shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K';

  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 4);
  }

  protected onDocumentClick(event: MouseEvent): void {
    const root = this.menuRoot()?.nativeElement;
    if (this.menuOpen() && root && !root.contains(event.target as Node)) this.menuOpen.set(false);
  }

  protected async signOut(): Promise<void> {
    this.menuOpen.set(false);
    await this.auth.signOut();
    this.toast.show(t('toast.signedOut'));
    void this.router.navigate(['/']);
  }
}
