import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, inject, input, model, output } from '@angular/core';
import { TocChapter } from '../../models/book.model';
import { Bookmark } from '../../models/user.model';
import { IconComponent } from '../../shared/icon.component';
import { formatRelative, readingMinutes } from '../../utils/format';

@Component({
  selector: 'app-reader-contents-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="head">
      <div class="book">
        <strong>{{ bookTitle() }}</strong>
        <span>{{ author() }}</span>
      </div>
      <button type="button" class="icon-btn" (click)="closed.emit()" aria-label="Close contents"><app-icon name="x" /></button>
    </div>

    <div class="tabs" role="tablist">
      <button type="button" role="tab" [attr.aria-selected]="tab() === 'contents'" (click)="tab.set('contents')">Contents</button>
      <button type="button" role="tab" [attr.aria-selected]="tab() === 'bookmarks'" (click)="tab.set('bookmarks')">
        Bookmarks
        @if (bookmarks().length) {
          <span class="count">{{ bookmarks().length }}</span>
        }
      </button>
    </div>

    <div class="body" role="tabpanel">
      @if (tab() === 'contents') {
        <ol class="toc">
          @for (row of rows(); track row.index) {
            @if (row.showPart) {
              <li class="part" aria-hidden="true">{{ row.part }}</li>
            }
            <li>
              <button
                type="button"
                class="row"
                [class.current]="row.index === current()"
                [class.read]="row.index < current()"
                [attr.aria-current]="row.index === current() ? 'true' : null"
                (click)="goChapter.emit(row.index)"
              >
                <span class="title">{{ row.title }}</span>
                @if (row.index === current()) {
                  <span class="here">{{ currentPercent() }}%</span>
                } @else {
                  <span class="mins">{{ row.minutes }} min</span>
                }
              </button>
            </li>
          }
        </ol>
      } @else {
        @if (!signedIn()) {
          <div class="empty">
            <app-icon name="bookmark" [size]="26" />
            <p>Sign in to bookmark passages and find them again on any visit.</p>
          </div>
        } @else if (!bookmarks().length) {
          <div class="empty">
            <app-icon name="bookmark" [size]="26" />
            <p>No bookmarks yet. Tap the bookmark icon (or press <span class="kbd">B</span>) to save your place.</p>
          </div>
        } @else {
          <ul class="marks">
            @for (m of bookmarks(); track m.id) {
              <li class="mark">
                <button type="button" class="mark-main" (click)="goBookmark.emit(m)">
                  <span class="mark-meta">{{ chapterTitle(m.chapter) }} · {{ relative(m.createdAt) }}</span>
                  <span class="mark-excerpt">“{{ m.excerpt }}”</span>
                </button>
                <button type="button" class="icon-btn del" (click)="removeBookmark.emit(m.id)" aria-label="Delete bookmark">
                  <app-icon name="trash" [size]="16" />
                </button>
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      color: var(--r-fg);
    }
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 14px 12px 22px;
    }
    .book {
      display: grid;
      min-width: 0;
    }
    .book strong {
      font-family: var(--font-display);
      font-weight: 550;
      font-size: 1.15rem;
      line-height: 1.25;
    }
    .book span {
      font-size: 0.85rem;
      color: var(--r-muted);
    }
    .icon-btn {
      color: var(--r-muted);
    }
    .icon-btn:hover {
      background: var(--r-hover);
      color: var(--r-fg);
    }
    .tabs {
      display: flex;
      gap: 4px;
      margin: 0 16px;
      padding: 3px;
      border-radius: var(--radius-sm);
      background: var(--r-hover);
    }
    .tabs button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 36px;
      border-radius: 7px;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--r-muted);
    }
    .tabs button[aria-selected='true'] {
      background: var(--r-panel);
      color: var(--r-fg);
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.15);
    }
    .count {
      padding: 1px 7px;
      border-radius: var(--radius-full);
      background: var(--r-accent);
      color: var(--r-bg);
      font-size: 0.72rem;
    }
    .body {
      flex: 1;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 10px 10px 24px;
    }
    .toc,
    .marks {
      list-style: none;
      padding: 0;
    }
    .part {
      padding: 16px 12px 6px;
      font-size: 0.7rem;
      font-weight: 650;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--r-muted);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      text-align: left;
      font-size: 0.93rem;
    }
    .row:hover {
      background: var(--r-hover);
    }
    .row .title {
      flex: 1;
      min-width: 0;
    }
    .row.read .title {
      color: var(--r-muted);
    }
    .row.current {
      background: var(--r-hover);
      font-weight: 650;
    }
    .row.current .title {
      color: var(--r-accent);
    }
    .mins,
    .here {
      font-size: 0.78rem;
      color: var(--r-muted);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .here {
      color: var(--r-accent);
    }
    .empty {
      display: grid;
      justify-items: center;
      gap: 10px;
      padding: 48px 24px;
      text-align: center;
      color: var(--r-muted);
      font-size: 0.92rem;
    }
    .kbd {
      background: transparent;
      color: inherit;
      border-color: currentColor;
    }
    .mark {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      border-radius: var(--radius-sm);
    }
    .mark:hover {
      background: var(--r-hover);
    }
    .mark-main {
      flex: 1;
      display: grid;
      gap: 4px;
      padding: 12px;
      text-align: left;
      min-width: 0;
    }
    .mark-meta {
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--r-muted);
    }
    .mark-excerpt {
      font-family: var(--r-font);
      font-size: 0.95rem;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .del {
      margin-top: 8px;
      opacity: 0.6;
    }
    .del:hover {
      opacity: 1;
    }
  `,
})
export class ReaderContentsPanelComponent {
  private readonly host = inject(ElementRef);

  readonly bookTitle = input.required<string>();
  readonly author = input.required<string>();
  readonly chapters = input.required<TocChapter[]>();
  readonly current = input.required<number>();
  readonly currentPercent = input(0);
  readonly bookmarks = input.required<Bookmark[]>();
  readonly signedIn = input(false);
  readonly tab = model<'contents' | 'bookmarks'>('contents');

  readonly closed = output<void>();
  readonly goChapter = output<number>();
  readonly goBookmark = output<Bookmark>();
  readonly removeBookmark = output<string>();

  protected readonly rows = computed(() =>
    this.chapters().map((c, index, all) => ({
      ...c,
      index,
      minutes: readingMinutes(c.words),
      showPart: !!c.part && c.part !== all[index - 1]?.part,
    })),
  );

  constructor() {
    afterNextRender(() => {
      (this.host.nativeElement as HTMLElement).querySelector('.row.current')?.scrollIntoView({ block: 'center' });
    });
  }

  protected chapterTitle(i: number): string {
    return this.chapters()[i]?.title ?? `Chapter ${i + 1}`;
  }

  protected relative(iso: string): string {
    return formatRelative(iso);
  }
}
