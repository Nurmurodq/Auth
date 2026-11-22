import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { BookRecord } from '../models/book.model';

/**
 * Typographic book cover: the upper square holds the (public-domain) artwork,
 * the lower panel carries the title in a colour sampled from that artwork.
 * Type scales with the cover width via container query units.
 */
@Component({
  selector: 'app-book-cover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--cover-bg]': 'book().cover.color',
    '[style.--cover-accent]': 'book().cover.accent',
    '[class.is-loaded]': 'loaded()',
    '[class.flat]': 'flat()',
    '[attr.aria-hidden]': 'decorative() ? "true" : null',
    '[attr.role]': 'decorative() ? null : "img"',
    '[attr.aria-label]': 'decorative() ? null : label()',
  },
  template: `
    <div class="art">
      <img
        [src]="src()"
        [attr.srcset]="srcset()"
        [attr.sizes]="sizes()"
        [attr.loading]="eager() ? 'eager' : 'lazy'"
        [attr.fetchpriority]="eager() ? 'high' : null"
        decoding="async"
        alt=""
        width="480"
        height="480"
        (load)="loaded.set(true)"
      />
    </div>
    <div class="panel">
      <span class="title" [class.long]="titleLength() > 26" [class.xlong]="titleLength() > 40">{{ book().title }}</span>
      <span class="rule"></span>
      <span class="author">{{ book().author }}</span>
    </div>
    <span class="spine"></span>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: 2 / 3;
      container-type: inline-size;
      border-radius: 3px 7px 7px 3px;
      overflow: hidden;
      background: var(--cover-bg);
      box-shadow: var(--shadow-book);
      isolation: isolate;
      transform: translateZ(0);
    }
    :host(.flat) {
      box-shadow: none;
      border-radius: 4px;
    }
    .art {
      position: absolute;
      inset: 0 0 auto 0;
      aspect-ratio: 1;
      background: color-mix(in srgb, var(--cover-bg) 70%, #fff 8%);
    }
    .art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 360ms var(--ease);
    }
    :host(.is-loaded) .art img {
      opacity: 1;
    }
    .art::after {
      content: '';
      position: absolute;
      inset: auto 0 0 0;
      height: 22%;
      background: linear-gradient(to bottom, transparent, var(--cover-bg));
    }
    .panel {
      position: absolute;
      inset: auto 0 0 0;
      height: 34%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5cqi;
      padding: 0 9cqi 3cqi;
      text-align: center;
    }
    .title {
      font-family: var(--font-display);
      font-weight: 520;
      font-size: 9.6cqi;
      line-height: 1.04;
      letter-spacing: -0.015em;
      color: #fbf6ee;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-wrap: balance;
    }
    .title.long {
      font-size: 8.2cqi;
    }
    .title.xlong {
      font-size: 7cqi;
    }
    .rule {
      width: 10cqi;
      height: max(1px, 0.5cqi);
      background: var(--cover-accent);
      opacity: 0.7;
      flex: none;
    }
    .author {
      font-family: var(--font-ui);
      font-size: 4.3cqi;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--cover-accent);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .spine {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(90deg, rgb(0 0 0 / 0.28) 0, rgb(255 255 255 / 0.1) 2.2%, rgb(0 0 0 / 0.06) 4%, transparent 8%),
        linear-gradient(160deg, rgb(255 255 255 / 0.12), transparent 38%);
    }
    :host(.flat) .spine {
      background: linear-gradient(160deg, rgb(255 255 255 / 0.08), transparent 40%);
    }
  `,
})
export class BookCoverComponent {
  readonly book = input.required<BookRecord>();
  /** CSS sizes hint for responsive image selection. */
  readonly sizes = input('(max-width: 640px) 45vw, 220px');
  readonly eager = input(false);
  readonly decorative = input(true);
  readonly flat = input(false);

  protected readonly loaded = signal(false);
  protected readonly src = computed(() => `covers/${this.book().id}-480.webp`);
  protected readonly srcset = computed(() => `covers/${this.book().id}-240.webp 240w, covers/${this.book().id}-480.webp 480w`);
  protected readonly titleLength = computed(() => this.book().title.length);
  protected readonly label = computed(() => `${this.book().title} by ${this.book().author}`);
}
