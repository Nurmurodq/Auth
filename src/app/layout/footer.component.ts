import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../services/catalog.service';
import { LogoComponent } from '../shared/logo.component';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LogoComponent],
  host: { role: 'contentinfo' },
  template: `
    <div class="container">
      <div class="top">
        <div class="brand">
          <app-logo />
          <p>Great books, beautifully read. A calm, ad-free home for {{ catalog.books.length }} timeless works.</p>
        </div>
        <nav class="cols" aria-label="Footer">
          <div>
            <h2>Explore</h2>
            <a routerLink="/browse">All books</a>
            @for (g of topGenres; track g.id) {
              <a routerLink="/browse" [queryParams]="{ genre: g.id }">{{ g.name }}</a>
            }
          </div>
          <div>
            <h2>Your reading</h2>
            <a routerLink="/library">My Library</a>
            <a routerLink="/library" [queryParams]="{ tab: 'bookmarks' }">Bookmarks</a>
            <a routerLink="/account">Account & stats</a>
          </div>
          <div>
            <h2>About</h2>
            <a href="https://standardebooks.org" target="_blank" rel="noopener">Standard Ebooks</a>
            <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener">CC0 licence</a>
          </div>
        </nav>
      </div>
      <div class="bottom">
        <p>
          Texts and cover artwork courtesy of <a href="https://standardebooks.org" target="_blank" rel="noopener">Standard Ebooks</a>, dedicated to the
          public domain. Folio is not affiliated with Standard Ebooks.
        </p>
        <p>© {{ year }} Folio</p>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      margin-top: clamp(64px, 10vw, 120px);
      padding: 56px 0 32px;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    .top {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
      gap: 48px;
    }
    .brand p {
      margin-top: 14px;
      max-width: 34ch;
      color: var(--text-2);
      font-size: 0.94rem;
    }
    .cols {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
    }
    .cols div {
      display: grid;
      align-content: start;
      gap: 10px;
    }
    h2 {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-3);
      margin-bottom: 4px;
    }
    .cols a {
      font-size: 0.92rem;
      color: var(--text-2);
      width: fit-content;
    }
    .cols a:hover {
      color: var(--text);
    }
    .bottom {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      font-size: 0.84rem;
      color: var(--text-3);
    }
    .bottom a {
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    @media (max-width: 860px) {
      .top {
        grid-template-columns: 1fr;
      }
      .bottom {
        flex-direction: column;
      }
    }
    @media (max-width: 767px) {
      :host {
        padding-bottom: calc(32px + var(--mobile-nav-h));
      }
      .cols {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class FooterComponent {
  protected readonly catalog = inject(CatalogService);
  protected readonly topGenres = this.catalog.genres.slice(0, 4);
  protected readonly year = new Date().getFullYear();
}
