import {
  ApplicationConfig,
  Injectable,
  effect,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  untracked,
} from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { Title } from '@angular/platform-browser';
import {
  PreloadAllModules,
  RouterStateSnapshot,
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { APP_NAME } from './config';
import { MessageKey, currentLang, initI18n, t } from './i18n/i18n';
import { CatalogService } from './services/catalog.service';

/** Translates route titles (message keys or "book:<id>") and re-applies them when the language changes. */
@Injectable({ providedIn: 'root' })
class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly catalog = inject(CatalogService);
  private last: RouterStateSnapshot | null = null;

  constructor() {
    super();
    effect(() => {
      currentLang();
      untracked(() => this.last && this.updateTitle(this.last));
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.last = snapshot;
    const raw = this.buildTitle(snapshot);
    let page: string | null = null;
    if (raw?.startsWith('book:')) {
      const book = this.catalog.get(raw.slice(5));
      page = book ? t('card.label', { title: book.title, author: book.author }) : t('title.bookMissing');
    } else if (raw) {
      page = t(raw as MessageKey);
    }
    this.title.setTitle(page ? `${page} · ${APP_NAME}` : `${APP_NAME} — ${t('title.home')}`);
    this.meta.updateTag({ name: 'description', content: t('meta.description') });
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // Load the reader's language before the first render so nothing flashes in English.
    provideAppInitializer(() => initI18n()),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Scroll handling is customised in AppComponent (keep position when only query params change).
      withInMemoryScrolling({ scrollPositionRestoration: 'disabled', anchorScrolling: 'enabled' }),
      withViewTransitions({ skipInitialTransition: true }),
      withPreloading(PreloadAllModules),
    ),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
