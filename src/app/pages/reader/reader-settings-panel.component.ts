import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { localized, t } from '../../i18n/i18n';
import {
  FONT_SIZE_RANGE,
  LineSpacing,
  READER_FONTS,
  READER_THEMES,
  ReaderSettingsService,
  ReaderWidth,
} from '../../services/reader-settings.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-reader-settings-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="head">
      <h2 id="settings-title">{{ t('reader.appearance') }}</h2>
      <button type="button" class="icon-btn" (click)="closed.emit()" [attr.aria-label]="t('reader.closeAppearance')"><app-icon name="x" /></button>
    </div>

    <div class="group">
      <span class="label" id="lbl-theme">{{ t('reader.theme') }}</span>
      <div class="themes" role="radiogroup" aria-labelledby="lbl-theme">
        @for (th of themes; track th.id) {
          <button
            type="button"
            role="radio"
            class="theme"
            [attr.aria-checked]="s().theme === th.id"
            (click)="svc.update({ theme: th.id })"
          >
            <span class="theme-swatch" [style.background]="th.bg" [style.color]="th.fg">Aa</span>
            <span class="theme-name">{{ th.label }}</span>
          </button>
        }
      </div>
    </div>

    <div class="group">
      <span class="label" id="lbl-size">{{ t('reader.textSize') }}</span>
      <div class="size-row">
        <button type="button" class="icon-btn step" (click)="svc.update({ fontSize: s().fontSize - 1 })" [disabled]="s().fontSize <= range.min" [attr.aria-label]="t('reader.smaller')">
          <span class="a-small">A</span>
        </button>
        <input
          type="range"
          [min]="range.min"
          [max]="range.max"
          [step]="range.step"
          [value]="s().fontSize"
          (input)="svc.update({ fontSize: +$any($event.target).value })"
          aria-labelledby="lbl-size"
          [attr.aria-valuetext]="t('reader.pixels', { count: s().fontSize })"
        />
        <button type="button" class="icon-btn step" (click)="svc.update({ fontSize: s().fontSize + 1 })" [disabled]="s().fontSize >= range.max" [attr.aria-label]="t('reader.larger')">
          <span class="a-large">A</span>
        </button>
        <span class="value">{{ s().fontSize }}</span>
      </div>
    </div>

    <div class="group">
      <span class="label" id="lbl-font">{{ t('reader.typeface') }}</span>
      <div class="fonts" role="radiogroup" aria-labelledby="lbl-font">
        @for (f of fonts; track f.id) {
          <button type="button" role="radio" class="font" [attr.aria-checked]="s().font === f.id" (click)="svc.update({ font: f.id })">
            <span class="font-sample" [style.font-family]="f.family">Ag</span>
            <span class="font-text">
              <span class="font-name">{{ f.label }}</span>
              <span class="font-note">{{ f.note }}</span>
            </span>
            @if (s().font === f.id) {
              <app-icon name="check" [size]="16" class="tick" />
            }
          </button>
        }
      </div>
    </div>

    <div class="group two">
      <div>
        <span class="label" id="lbl-spacing">{{ t('reader.lineSpacing') }}</span>
        <div class="segmented" role="radiogroup" aria-labelledby="lbl-spacing">
          @for (o of spacing; track o.id) {
            <button type="button" role="radio" [attr.aria-checked]="s().lineSpacing === o.id" (click)="svc.update({ lineSpacing: o.id })" [attr.aria-label]="o.label">
              <span class="lines" [style.gap.px]="o.gap"><i></i><i></i><i></i></span>
            </button>
          }
        </div>
      </div>
      <div class="width-group">
        <span class="label" id="lbl-width">{{ t('reader.lineWidth') }}</span>
        <div class="segmented" role="radiogroup" aria-labelledby="lbl-width">
          @for (o of widths; track o.id) {
            <button type="button" role="radio" [attr.aria-checked]="s().width === o.id" (click)="svc.update({ width: o.id })" [attr.aria-label]="o.label">
              <span class="bar" [style.width.px]="o.px"></span>
            </button>
          }
        </div>
      </div>
    </div>

    <div class="group two">
      <div>
        <span class="label" id="lbl-align">{{ t('reader.alignment') }}</span>
        <div class="segmented" role="radiogroup" aria-labelledby="lbl-align">
          <button type="button" role="radio" [attr.aria-checked]="!s().justify" (click)="svc.update({ justify: false })" [attr.aria-label]="t('reader.alignLeft')">
            <app-icon name="align-left" [size]="18" />
          </button>
          <button type="button" role="radio" [attr.aria-checked]="s().justify" (click)="svc.update({ justify: true })" [attr.aria-label]="t('reader.justify')">
            <app-icon name="align-justify" [size]="18" />
          </button>
        </div>
      </div>
      <div>
        <span class="label" id="lbl-mode">{{ t('browse.layout') }}</span>
        <div class="segmented" role="radiogroup" aria-labelledby="lbl-mode">
          <button type="button" role="radio" [attr.aria-checked]="s().mode === 'scroll'" (click)="svc.update({ mode: 'scroll' })">
            <app-icon name="scroll" [size]="17" /><span>{{ t('reader.scroll') }}</span>
          </button>
          <button type="button" role="radio" [attr.aria-checked]="s().mode === 'paged'" (click)="svc.update({ mode: 'paged' })">
            <app-icon name="columns" [size]="17" /><span>{{ t('account.modePages') }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="foot">
      <button type="button" class="btn btn-ghost btn-sm" (click)="svc.reset()"><app-icon name="reset" [size]="16" />{{ t('common.reset') }}</button>
      <button type="button" class="btn btn-ghost btn-sm shortcuts-btn" (click)="shortcuts.emit()"><app-icon name="keyboard" [size]="16" />{{ t('reader.shortcutsShort') }}</button>
    </div>
  `,
  styles: `
    :host {
      display: block;
      color: var(--r-fg);
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    h2 {
      font-family: var(--font-ui);
      font-size: 1.02rem;
      font-weight: 650;
    }
    .icon-btn {
      color: var(--r-muted);
    }
    .icon-btn:hover:not(:disabled) {
      background: var(--r-hover);
      color: var(--r-fg);
    }
    .group {
      padding: 14px 0;
      border-top: 1px solid var(--r-border);
    }
    .group.two {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .label {
      display: block;
      margin-bottom: 10px;
      font-size: 0.72rem;
      font-weight: 650;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--r-muted);
    }
    .themes {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .theme {
      display: grid;
      justify-items: center;
      gap: 6px;
      padding: 4px 0;
      border-radius: var(--radius-sm);
      font-size: 0.78rem;
      color: var(--r-muted);
    }
    .theme-swatch {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 1px solid rgb(128 128 128 / 0.35);
      font-family: var(--font-serif);
      font-weight: 600;
      font-size: 1.05rem;
      transition: box-shadow var(--dur-fast) var(--ease);
    }
    .theme[aria-checked='true'] .theme-swatch {
      box-shadow: 0 0 0 2px var(--r-panel), 0 0 0 4px var(--r-accent);
    }
    .theme[aria-checked='true'] .theme-name {
      color: var(--r-fg);
      font-weight: 600;
    }
    .size-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .size-row input {
      flex: 1;
      accent-color: var(--r-accent);
    }
    .step {
      font-family: var(--font-serif);
      font-weight: 600;
    }
    .step:disabled {
      opacity: 0.35;
    }
    .a-small {
      font-size: 0.85rem;
    }
    .a-large {
      font-size: 1.3rem;
    }
    .value {
      width: 26px;
      text-align: right;
      font-size: 0.85rem;
      font-variant-numeric: tabular-nums;
      color: var(--r-muted);
    }
    .fonts {
      display: grid;
      gap: 2px;
    }
    .font {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      text-align: left;
    }
    .font:hover {
      background: var(--r-hover);
    }
    .font[aria-checked='true'] {
      background: var(--r-hover);
    }
    .font-sample {
      width: 32px;
      font-size: 1.35rem;
      line-height: 1;
    }
    .font-text {
      display: grid;
      flex: 1;
    }
    .font-name {
      font-size: 0.92rem;
      font-weight: 600;
    }
    .font-note {
      font-size: 0.78rem;
      color: var(--r-muted);
    }
    .tick {
      color: var(--r-accent);
    }
    .segmented {
      display: flex;
      padding: 3px;
      border-radius: var(--radius-sm);
      background: var(--r-hover);
    }
    .segmented button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 36px;
      border-radius: 7px;
      color: var(--r-muted);
      font-size: 0.84rem;
      font-weight: 600;
      transition: background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
    }
    .segmented button[aria-checked='true'] {
      background: var(--r-panel);
      color: var(--r-fg);
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.15);
    }
    .lines {
      display: grid;
      width: 18px;
    }
    .lines i {
      display: block;
      height: 2px;
      border-radius: 2px;
      background: currentColor;
    }
    .bar {
      display: block;
      height: 10px;
      border-left: 2px solid currentColor;
      border-right: 2px solid currentColor;
      background: linear-gradient(currentColor, currentColor) center / 100% 2px no-repeat;
    }
    .foot {
      display: flex;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid var(--r-border);
    }
    .foot .btn {
      color: var(--r-muted);
    }
    .foot .btn:hover {
      background: var(--r-hover);
      color: var(--r-fg);
    }
    @media (max-width: 720px) {
      .width-group {
        display: none;
      }
      .group.two:has(.width-group) {
        grid-template-columns: 1fr;
      }
    }
    @media (hover: none) {
      .shortcuts-btn {
        display: none;
      }
    }
  `,
})
export class ReaderSettingsPanelComponent {
  protected readonly t = t;
  protected readonly svc = inject(ReaderSettingsService);
  protected readonly s = this.svc.settings;
  readonly closed = output<void>();
  readonly shortcuts = output<void>();

  protected readonly themes = READER_THEMES;
  protected readonly fonts = READER_FONTS;
  protected readonly range = FONT_SIZE_RANGE;
  protected readonly spacing: { id: LineSpacing; label: string; gap: number }[] = localized([
    { id: 'compact', label: 'Compact spacing', gap: 2 },
    { id: 'comfortable', label: 'Comfortable spacing', gap: 4 },
    { id: 'airy', label: 'Airy spacing', gap: 6 },
  ], 'spacing', ['label']);
  protected readonly widths: { id: ReaderWidth; label: string; px: number }[] = localized([
    { id: 'narrow', label: 'Narrow lines', px: 14 },
    { id: 'medium', label: 'Medium lines', px: 22 },
    { id: 'wide', label: 'Wide lines', px: 30 },
  ], 'lineWidth', ['label']);
}
