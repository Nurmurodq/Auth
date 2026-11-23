import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { t } from '../i18n/i18n';
import { RouterLink } from '@angular/router';
import { BookRecord } from '../models/book.model';
import { formatPercent, formatReadingTime, formatYear } from '../utils/format';
import { BookCoverComponent } from './book-cover.component';

@Component({
  selector: 'app-book-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookCoverComponent],
  template: `
    <a class="book-card" [routerLink]="['/book', book().id]" [attr.aria-label]="ariaLabel()">
      <div class="cover-wrap">
        <app-book-cover [book]="book()" [eager]="eager()" [sizes]="sizes()" />
        @if (badge()) {
          <span class="badge">{{ badge() }}</span>
        }
      </div>
      @if (progress() !== null) {
        <div class="progress-row">
          <div class="progress" aria-hidden="true"><span [style.width.%]="(progress() ?? 0) * 100"></span></div>
          <span class="pct">{{ percentLabel() }}</span>
        </div>
      }
      <div class="text">
        <span class="title">{{ book().title }}</span>
        <span class="author">{{ book().author }}</span>
        @if (note()) {
          <span class="note">{{ note() }}</span>
        } @else if (showMeta()) {
          <span class="meta">{{ year() }} · {{ time() }}</span>
        }
      </div>
    </a>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .book-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-radius: var(--radius);
      outline-offset: 6px;
    }
    .cover-wrap {
      position: relative;
      transition: transform var(--dur) var(--ease);
      will-change: transform;
    }
    .cover-wrap app-book-cover {
      transition: box-shadow var(--dur) var(--ease);
    }
    @media (hover: hover) {
      .book-card:hover .cover-wrap {
        transform: translateY(-5px) rotate(-0.4deg);
      }
      .book-card:hover app-book-cover {
        box-shadow: var(--shadow-lg);
      }
      .book-card:hover .title {
        color: var(--accent-text);
      }
    }
    .badge {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 9px;
      border-radius: var(--radius-full);
      background: rgb(20 16 12 / 0.72);
      backdrop-filter: blur(6px);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 650;
      letter-spacing: 0.02em;
    }
    .progress-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: -2px;
    }
    .progress-row .progress {
      flex: 1;
    }
    .pct {
      font-size: 0.74rem;
      font-weight: 650;
      color: var(--text-2);
      font-variant-numeric: tabular-nums;
    }
    .text {
      display: grid;
      gap: 2px;
      min-width: 0;
    }
    .title {
      font-weight: 620;
      font-size: 0.95rem;
      line-height: 1.3;
      letter-spacing: -0.01em;
      color: var(--text);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      transition: color var(--dur-fast) var(--ease);
    }
    .author {
      font-size: 0.86rem;
      color: var(--text-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .note {
      margin-top: 3px;
      font-size: 0.78rem;
      font-weight: 550;
      line-height: 1.3;
      color: var(--accent-text);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .meta {
      font-size: 0.78rem;
      color: var(--text-3);
      margin-top: 2px;
    }
  `,
})
export class BookCardComponent {
  readonly book = input.required<BookRecord>();
  readonly progress = input<number | null>(null);
  readonly badge = input<string | null>(null);
  readonly showMeta = input(true);
  /** Short personal note shown under the author (e.g. why it was recommended). */
  readonly note = input<string | null>(null);
  readonly eager = input(false);
  readonly sizes = input('(max-width: 640px) 45vw, 200px');

  protected readonly year = computed(() => formatYear(this.book().year));
  protected readonly time = computed(() => formatReadingTime(this.book().words));
  protected readonly percentLabel = computed(() => formatPercent(this.progress() ?? 0));
  protected readonly ariaLabel = computed(() => {
    const b = this.book();
    const p = this.progress();
    return p !== null ? t('card.labelProgress', { title: b.title, author: b.author, percent: formatPercent(p) }) : t('card.label', { title: b.title, author: b.author });
  });
}
