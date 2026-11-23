import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { t } from '../i18n/i18n';
import { RouterLink } from '@angular/router';
import { UiService } from '../services/ui.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <section class="container wrap fade-up">
      <p class="code display" aria-hidden="true">404</p>
      <h1 class="display">{{ t('notFound.title') }}</h1>
      <p class="quote">{{ t('notFound.quote') }}</p>
      <div class="actions">
        <a routerLink="/" class="btn btn-primary btn-lg"><app-icon name="home" [size]="18" />{{ t('notFound.home') }}</a>
        <button type="button" class="btn btn-secondary btn-lg" (click)="ui.openSearch()"><app-icon name="search" [size]="18" />{{ t('notFound.search') }}</button>
      </div>
    </section>
  `,
  styles: `
    .wrap {
      display: grid;
      justify-items: center;
      gap: 14px;
      padding-top: clamp(56px, 10vw, 120px);
      text-align: center;
    }
    .code {
      font-size: clamp(5rem, 3rem + 10vw, 10rem);
      line-height: 0.9;
      font-style: italic;
      font-weight: 400;
      color: var(--accent-text);
      opacity: 0.9;
    }
    h1 {
      font-size: clamp(1.7rem, 1.2rem + 2vw, 2.6rem);
      letter-spacing: -0.025em;
      max-width: 20ch;
    }
    .quote {
      color: var(--text-2);
      max-width: 44ch;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      margin-top: 18px;
    }
  `,
})
export class NotFoundPage {
  protected readonly t = t;
  protected readonly ui = inject(UiService);
}
