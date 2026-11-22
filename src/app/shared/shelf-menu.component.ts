import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { Shelf } from '../models/user.model';
import { LibraryService } from '../services/library.service';
import { ToastService } from '../services/toast.service';
import { IconComponent } from './icon.component';

const LABELS: Record<Shelf, string> = { want: 'Want to read', reading: 'Currently reading', finished: 'Finished' };

/** Button + menu for placing a book on a shelf or removing it from the library. */
@Component({
  selector: 'app-shelf-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    '(document:click)': 'onDocClick($event)',
    '(keydown.escape)': 'open.set(false)',
  },
  template: `
    <button
      type="button"
      class="btn btn-secondary trigger"
      [class.btn-sm]="compact()"
      [class.has-shelf]="!!shelf()"
      (click)="toggleMenu()"
      [attr.aria-expanded]="open()"
      aria-haspopup="menu"
    >
      <app-icon [name]="shelf() ? 'check' : 'plus'" [size]="compact() ? 16 : 18" />
      <span>{{ shelf() ? labels[shelf()!] : 'Add to library' }}</span>
      <app-icon name="chevron-down" [size]="16" class="chev" />
    </button>
    @if (open()) {
      <div class="menu" role="menu" [class.up]="direction() === 'up'">
        @for (s of shelves; track s) {
          <button type="button" role="menuitemradio" [attr.aria-checked]="shelf() === s" (click)="choose(s)">
            <span class="radio" aria-hidden="true">@if (shelf() === s) {<app-icon name="check" [size]="15" [stroke]="2.5" />}</span>
            {{ labels[s] }}
          </button>
        }
        @if (entry()) {
          <hr class="divider" />
          <button type="button" role="menuitem" class="danger" (click)="remove()">
            <span class="radio" aria-hidden="true"><app-icon name="trash" [size]="15" /></span>
            Remove from library
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: inline-block;
    }
    .trigger.has-shelf {
      background: var(--surface);
      border-color: var(--border);
    }
    .chev {
      margin-left: -2px;
      opacity: 0.6;
    }
    .menu {
      position: absolute;
      left: 0;
      top: calc(100% + 8px);
      z-index: 30;
      width: 232px;
      padding: 6px;
      border-radius: var(--radius);
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      animation: fade-up 160ms var(--ease) both;
    }
    .menu.up {
      top: auto;
      bottom: calc(100% + 8px);
    }
    .menu button {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px;
      border-radius: var(--radius-xs);
      font-size: 0.92rem;
      font-weight: 500;
      text-align: left;
    }
    .menu button:hover,
    .menu button:focus-visible {
      background: var(--surface);
    }
    .radio {
      display: grid;
      place-items: center;
      width: 18px;
      color: var(--accent);
    }
    .danger {
      color: var(--danger);
    }
    .danger .radio {
      color: var(--danger);
    }
    .divider {
      margin: 4px;
    }
  `,
})
export class ShelfMenuComponent {
  private readonly library = inject(LibraryService);
  private readonly toast = inject(ToastService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly bookId = input.required<string>();
  readonly title = input('');
  readonly compact = input(false);
  readonly direction = input<'down' | 'up'>('down');

  protected readonly open = signal(false);
  protected readonly shelves: Shelf[] = ['want', 'reading', 'finished'];
  protected readonly labels = LABELS;
  protected readonly entry = computed(() => this.library.data().library[this.bookId()]);
  protected readonly shelf = computed(() => this.entry()?.shelf ?? null);

  protected toggleMenu(): void {
    if (!this.library.requireAccount()) return;
    this.open.set(!this.open());
  }

  protected choose(shelf: Shelf): void {
    this.library.setShelf(this.bookId(), shelf);
    this.open.set(false);
    this.toast.success(`Moved to ${LABELS[shelf]}`);
  }

  protected remove(): void {
    const prev = this.library.removeFromLibrary(this.bookId());
    this.open.set(false);
    this.toast.show(`Removed ${this.title() ? `“${this.title()}”` : 'book'} from your library`, {
      action: prev ? { label: 'Undo', run: () => this.library.restoreEntry(prev) } : undefined,
    });
  }

  protected onDocClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }
}
