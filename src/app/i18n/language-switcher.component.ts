import { ApplicationRef, ChangeDetectionStrategy, Component, ElementRef, inject, input, signal } from '@angular/core';
import { IconComponent } from '../shared/icon.component';
import { LANGUAGES, Lang, currentLanguage, setLang, t } from './i18n';

/** Globe button with a small menu of languages. Switching cross-fades the page where supported. */
@Component({
  selector: 'app-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'open.set(false)',
  },
  template: `
    <button
      type="button"
      class="lang-btn"
      [class.labelled]="labelled()"
      (click)="open.set(!open())"
      [attr.aria-expanded]="open()"
      aria-haspopup="menu"
      [attr.aria-label]="t('lang.choose') + ' — ' + current().name"
    >
      <app-icon name="globe" [size]="18" />
      <span class="code" aria-hidden="true">{{ labelled() ? current().name : current().short }}</span>
      @if (labelled()) {
        <app-icon name="chevron-down" [size]="14" class="chev" />
      }
    </button>
    @if (open()) {
      <div class="menu" role="menu" [class.up]="placement() === 'up'" [class.start]="align() === 'start'" [attr.aria-label]="t('lang.choose')">
        @for (l of languages; track l.id) {
          <button type="button" role="menuitemradio" [attr.aria-checked]="l.id === current().id" [attr.lang]="l.locale" (click)="choose(l.id)">
            <span class="short" aria-hidden="true">{{ l.short }}</span>
            <span class="name">{{ l.name }}</span>
            <app-icon name="check" [size]="16" class="tick" />
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
    .lang-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 40px;
      padding: 0 10px;
      border-radius: var(--radius-full);
      color: var(--text-2);
      font-size: 0.8rem;
      font-weight: 650;
      letter-spacing: 0.04em;
      transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
    }
    .lang-btn.labelled {
      letter-spacing: 0;
      font-size: 0.9rem;
      font-weight: 550;
      padding: 0 12px;
      border: 1px solid var(--border);
    }
    .lang-btn:hover,
    .lang-btn[aria-expanded='true'] {
      color: var(--text);
      background: var(--surface-hover);
    }
    .lang-btn app-icon {
      transition: transform var(--dur) var(--ease-spring, var(--ease));
    }
    .lang-btn:hover app-icon:first-child {
      transform: rotate(-18deg);
    }
    .menu {
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      z-index: 60;
      min-width: 190px;
      padding: 6px;
      border-radius: var(--radius);
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      transform-origin: top right;
      animation: menu-in 220ms var(--ease-out, ease-out);
    }
    .menu.start {
      right: auto;
      left: 0;
      transform-origin: top left;
    }
    .menu.up {
      top: auto;
      bottom: calc(100% + 8px);
      transform-origin: bottom right;
    }
    .menu.up.start {
      transform-origin: bottom left;
    }
    .menu button {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.93rem;
      text-align: left;
      color: var(--text);
    }
    .menu button:hover {
      background: var(--surface);
    }
    .short {
      display: grid;
      place-items: center;
      width: 30px;
      height: 22px;
      border-radius: 6px;
      background: var(--surface);
      color: var(--text-2);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .menu button[aria-checked='true'] .short {
      background: var(--accent);
      color: var(--on-accent);
    }
    .name {
      flex: 1;
    }
    .tick {
      color: var(--accent-text);
      opacity: 0;
      transform: scale(0.6);
      transition: opacity var(--dur-fast) var(--ease), transform var(--dur) var(--ease);
    }
    .menu button[aria-checked='true'] .tick {
      opacity: 1;
      transform: none;
    }
    /* Narrow screens: just the globe. */
    @media (max-width: 480px) {
      :host(.compact-sm) .code {
        display: none;
      }
      :host(.compact-sm) .lang-btn {
        width: 40px;
        padding: 0;
        justify-content: center;
      }
    }
    @keyframes menu-in {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.96);
      }
    }
  `,
})
export class LanguageSwitcherComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly appRef = inject(ApplicationRef);
  protected readonly t = t;
  protected readonly languages = LANGUAGES;
  protected readonly current = currentLanguage;
  protected readonly open = signal(false);

  /** Show the full language name instead of the two-letter code. */
  readonly labelled = input(false);
  readonly placement = input<'down' | 'up'>('down');
  readonly align = input<'end' | 'start'>('end');

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  protected async choose(lang: Lang): Promise<void> {
    this.open.set(false);
    if (lang === this.current().id) return;
    const apply = async () => {
      await setLang(lang);
      this.appRef.tick();
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => unknown };
    if (doc.startViewTransition && !reduce) {
      document.documentElement.classList.add('lang-switching');
      const vt = doc.startViewTransition(apply) as { finished: Promise<void> };
      void vt.finished.finally(() => document.documentElement.classList.remove('lang-switching'));
    } else {
      await apply();
    }
    this.host.nativeElement.querySelector<HTMLButtonElement>('.lang-btn')?.focus();
  }
}
