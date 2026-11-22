import { ApplicationConfig, Injectable, inject, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · ${APP_NAME}` : `${APP_NAME} — Great books, beautifully read`);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
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
