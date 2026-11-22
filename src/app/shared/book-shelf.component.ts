import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookRecord } from '../models/book.model';
import { BookCardComponent } from './book-card.component';
import { IconComponent } from './icon.component';

/** A titled, horizontally scrollable row of books with arrow controls. */
@Component({
  selector: 'app-book-shelf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BookCardComponent, IconComponent, RouterLink],
  template: `
    <div class="section-head">
      <div>
        <h2 class="section-title">{{ heading() }}</h2>
        @if (description()) {
          <p>{{ description() }}</p>
        }
      </div>
      <div class="controls">
        @if (link()) {
          <a class="btn btn-ghost btn-sm see-all" [routerLink]="link()!.commands" [queryParams]="link()!.query">{{ linkLabel() }}</a>
        }
        <button class="icon-btn nav" type="button" (click)="scroll(-1)" [disabled]="atStart()" aria-label="Scroll left">
          <app-icon name="chevron-left" />
        </button>
        <button class="icon-btn nav" type="button" (click)="scroll(1)" [disabled]="atEnd()" aria-label="Scroll right">
          <app-icon name="chevron-right" />
        </button>
      </div>
    </div>
    <div class="scroll-row" #row (scroll)="update()" role="list">
      @for (book of books(); track book.id) {
        <app-book-card role="listitem" class="item" [book]="book" [note]="notes()[book.id] ?? null" />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: none;
    }
    .nav {
      border: 1px solid var(--border);
    }
    .nav:disabled {
      opacity: 0.35;
    }
    .item {
      width: clamp(132px, 36vw, 176px);
    }
    .scroll-row {
      margin-inline: calc(var(--gutter) * -1);
      padding-inline: var(--gutter);
      scroll-padding-inline: var(--gutter);
      padding-top: 8px;
    }
    @media (max-width: 640px) {
      .nav {
        display: none;
      }
    }
  `,
})
export class BookShelfComponent {
  readonly heading = input.required<string>();
  readonly description = input('');
  readonly books = input.required<BookRecord[]>();
  readonly link = input<{ commands: unknown[]; query?: Record<string, string> } | null>(null);
  readonly linkLabel = input('See all');
  /** Optional per-book notes (keyed by book id), e.g. recommendation reasons. */
  readonly notes = input<Partial<Record<string, string>>>({});

  private readonly row = viewChild.required<ElementRef<HTMLElement>>('row');
  protected readonly atStart = signal(true);
  protected readonly atEnd = signal(false);

  constructor() {
    afterNextRender(() => this.update());
  }

  protected update(): void {
    const el = this.row().nativeElement;
    this.atStart.set(el.scrollLeft <= 4);
    this.atEnd.set(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  protected scroll(dir: 1 | -1): void {
    const el = this.row().nativeElement;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  }
}
