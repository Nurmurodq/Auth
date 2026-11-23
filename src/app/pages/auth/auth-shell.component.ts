import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { t } from '../../i18n/i18n';
import { RouterLink } from '@angular/router';
import { BookRecord } from '../../models/book.model';
import { AuthService } from '../../services/auth/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { BookCoverComponent } from '../../shared/book-cover.component';
import { IconComponent } from '../../shared/icon.component';
import { LogoComponent } from '../../shared/logo.component';
import { LanguageSwitcherComponent } from '../../i18n/language-switcher.component';

const COLLAGE = [
  'jane-eyre',
  'the-great-gatsby',
  'dracula',
  'the-time-machine',
  'pride-and-prejudice',
  'the-picture-of-dorian-gray',
  'moby-dick',
  'alices-adventures-in-wonderland',
  'the-hound-of-the-baskervilles',
  'frankenstein',
  'anna-karenina',
  'the-odyssey',
];

/** Split-screen frame shared by the sign-in, sign-up and password pages. */
@Component({
  selector: 'app-auth-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookCoverComponent, IconComponent, LogoComponent, LanguageSwitcherComponent],
  template: `
    <div class="shell">
      <section class="form-side">
        <div class="top">
          <a routerLink="/" [attr.aria-label]="t('header.home')"><app-logo /></a>
          <div class="top-actions">
            <app-language-switcher />
            <a routerLink="/" class="back"><app-icon name="arrow-left" [size]="16" />{{ t('auth.backToLibrary') }}</a>
          </div>
        </div>
        <div class="form-wrap fade-up">
          <h1 class="display">{{ heading() }}</h1>
          @if (subheading()) {
            <p class="sub">{{ subheading() }}</p>
          }
          <ng-content />
        </div>
        <p class="mode-note">
          <app-icon name="shield" [size]="15" />
          @if (auth.onDeviceFallback()) {
            {{ t('auth.deviceNotice') }}
          } @else if (auth.backendKind === 'local') {
            {{ t('auth.storedLocal') }}
          } @else {
            {{ t('auth.syncs') }}
          }
        </p>
      </section>

      <aside class="art-side" aria-hidden="true">
        <div class="collage">
          @for (book of books; track book.id; let i = $index) {
            <app-book-cover [book]="book" [style.--i]="i" class="tile" sizes="160px" />
          }
        </div>
        <div class="art-overlay"></div>
        <figure class="art-quote">
          <blockquote class="display">{{ t('auth.quote') }}</blockquote>
          <figcaption>{{ t('auth.quoteAuthor') }}</figcaption>
        </figure>
      </aside>
    </div>
  `,
  styles: `
    .shell {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
      min-height: 100dvh;
    }
    .form-side {
      display: flex;
      flex-direction: column;
      padding: 28px clamp(20px, 5vw, 64px);
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .top-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.88rem;
      font-weight: 550;
      color: var(--text-2);
    }
    .back:hover {
      color: var(--text);
    }
    .form-wrap {
      width: 100%;
      max-width: 420px;
      margin: auto;
      padding: 48px 0;
    }
    h1 {
      font-size: clamp(2rem, 1.6rem + 1.4vw, 2.6rem);
      letter-spacing: -0.03em;
    }
    .sub {
      margin-top: 10px;
      color: var(--text-2);
      font-size: 1rem;
    }
    .mode-note {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 0.8rem;
      color: var(--text-3);
      text-align: center;
    }
    .art-side {
      position: relative;
      overflow: hidden;
      background: #1b1713;
      border-radius: 0;
    }
    .collage {
      position: absolute;
      inset: -12% -18%;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 22px;
      transform: rotate(-9deg);
      animation: drift 60s linear infinite alternate;
    }
    .tile {
      opacity: 0.92;
    }
    .tile:nth-child(4n + 2) {
      translate: 0 -18%;
    }
    .tile:nth-child(4n + 3) {
      translate: 0 12%;
    }
    @keyframes drift {
      to {
        transform: rotate(-9deg) translateY(-6%);
      }
    }
    .art-overlay {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(to top, rgb(20 16 12 / 0.92) 0%, rgb(20 16 12 / 0.35) 45%, rgb(20 16 12 / 0.15) 100%),
        radial-gradient(80% 60% at 20% 100%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 70%);
    }
    .art-quote {
      position: absolute;
      left: clamp(28px, 5vw, 64px);
      right: clamp(28px, 5vw, 64px);
      bottom: clamp(32px, 6vw, 72px);
      color: #f7f1e8;
    }
    .art-quote blockquote {
      font-size: clamp(1.4rem, 1rem + 1.3vw, 2.1rem);
      font-style: italic;
      font-weight: 400;
      line-height: 1.25;
      letter-spacing: -0.015em;
      max-width: 22ch;
    }
    .art-quote figcaption {
      margin-top: 14px;
      font-size: 0.9rem;
      color: rgb(247 241 232 / 0.7);
    }
    @media (max-width: 900px) {
      .shell {
        grid-template-columns: 1fr;
      }
      .art-side {
        display: none;
      }
      .form-wrap {
        padding: 36px 0;
      }
    }
  `,
})
export class AuthShellComponent {
  protected readonly t = t;
  protected readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  readonly heading = input.required<string>();
  readonly subheading = input('');
  protected readonly books: BookRecord[] = COLLAGE.map((id) => this.catalog.get(id)).filter((b): b is BookRecord => !!b);
}
