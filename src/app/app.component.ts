import { ViewportScroller } from '@angular/common';
import { t } from './i18n/i18n';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet, Scroll } from '@angular/router';
import { filter, map } from 'rxjs';
import { FooterComponent } from './layout/footer.component';
import { HeaderComponent } from './layout/header.component';
import { MobileNavComponent } from './layout/mobile-nav.component';
import { SearchPaletteComponent } from './layout/search-palette.component';
import { ToastsComponent } from './layout/toasts.component';
import { LibraryService } from './services/library.service';
import { ThemeService } from './services/theme.service';

type Layout = 'default' | 'immersive' | 'bare';

/** Best guess before the first navigation completes, so the right chrome renders immediately. */
function layoutForPath(path: string): Layout {
  if (path.startsWith('/read/')) return 'immersive';
  if (/^\/(login|register|verify-email|forgot-password|reset-password|welcome|auth\/callback)/.test(path)) return 'bare';
  return 'default';
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, MobileNavComponent, SearchPaletteComponent, ToastsComponent],
  host: { '[class.immersive]': 'layout() === "immersive"' },
  template: `
    <div class="route-progress" [class.active]="navigating()" aria-hidden="true"></div>
    <a class="skip-link" href="#main" (click)="skipToMain($event)">{{ t('app.skip') }}</a>
    @if (layout() === 'default') {
      <app-header />
    }
    <main id="main">
      <router-outlet />
    </main>
    @if (layout() === 'default') {
      <app-footer />
      <app-mobile-nav />
    }
    <app-search-palette />
    <app-toasts />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    main {
      flex: 1;
      outline: none;
    }
  `,
})
export class AppComponent {
  protected readonly t = t;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);


  private readonly routeLayout = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        let r = this.route.snapshot;
        while (r.firstChild) r = r.firstChild;
        return (r.data['layout'] as Layout | undefined) ?? 'default';
      }),
    ),
    { initialValue: layoutForPath(location.pathname) },
  );
  protected readonly layout = computed(() => this.routeLayout());

  /** True while a navigation takes longer than a moment (e.g. loading a page's code). */
  protected readonly navigating = signal(false);
  private navTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly scroller = inject(ViewportScroller);
  private lastPath = location.pathname;

  constructor() {
    // Instantiate app-wide services eagerly so the theme and user data are ready before first paint.
    inject(ThemeService);
    inject(LibraryService);

    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        clearTimeout(this.navTimer);
        this.navTimer = setTimeout(() => this.navigating.set(true), 150);
      } else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) {
        clearTimeout(this.navTimer);
        this.navigating.set(false);
      }
    });

    // Restore position on back/forward, scroll to top on a new page, but stay put when
    // only the query string changes (e.g. toggling a filter on the browse page).
    this.router.events.pipe(filter((e): e is Scroll => e instanceof Scroll)).subscribe((e) => {
      const url = e.routerEvent instanceof NavigationEnd ? e.routerEvent.urlAfterRedirects : e.routerEvent.url;
      const path = url.split(/[?#]/)[0];
      if (e.position) this.scroller.scrollToPosition(e.position);
      else if (e.anchor) this.scroller.scrollToAnchor(e.anchor);
      else if (path !== this.lastPath) this.scroller.scrollToPosition([0, 0]);
      this.lastPath = path;
    });
  }

  protected skipToMain(e: Event): void {
    e.preventDefault();
    const main = document.getElementById('main');
    if (!main) return;
    // Make <main> focusable only for this jump, so ordinary clicks don't move focus to it.
    main.setAttribute('tabindex', '-1');
    main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
    main.focus();
  }
}
