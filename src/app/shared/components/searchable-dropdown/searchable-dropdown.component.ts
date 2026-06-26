import {
  Component,
  Input,
  forwardRef,
  signal,
  computed,
  HostListener,
  ElementRef,
  inject,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DropdownOption } from '../../../core/interfaces/components.interface';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { SVG_ICON_CHEVRON_DOWN } from '../../icons/svg-icons';

/**
 * Enterprise-grade searchable dropdown — ControlValueAccessor-compatible.
 *
 * Generic parameter `T` represents the type of option values.
 * Defaults to `number` for backward compatibility; set explicitly
 * when working with strings or objects.
 *
 * Features
 * ────────
 * • Single and multi-select with chip display
 * • Debounced search (150 ms) backed by a computed signal
 * • O(1) label look-up via a precomputed Map
 * • Keyboard navigation: ↑ ↓ Enter Space Escape Tab
 * • ARIA: role="combobox/listbox/option", aria-expanded, aria-activedescendant
 * • compareWith input for object value equality
 * • valueMode input ('single' | 'array') controls what is emitted for single-select
 * • loading / empty states
 */
@Component({
  selector: 'app-searchable-dropdown',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SvgIconComponent],
  templateUrl: './searchable-dropdown.component.html',
  styleUrls: ['./searchable-dropdown.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableDropdownComponent),
      multi: true,
    },
  ],
})
export class SearchableDropdownComponent<T = number> implements ControlValueAccessor {
  readonly chevronDownIcon = SVG_ICON_CHEVRON_DOWN;
  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  // ── Inputs ───────────────────────────────────────────────────────

  @Input() label = '';
  @Input() required = false;
  @Input() placeholder = 'Select an option...';
  @Input() isMulti = false;
  @Input() searchable = true;
  @Input() maxSelections: number | null = null;

  /** Show a spinner and disable interaction while options are loading asynchronously. */
  @Input() loading = false;

  /**
   * Controls what is emitted for single-select:
   * - 'single' (default) → emits T         (e.g. 42)
   * - 'array'            → emits T[]        (e.g. [42])
   * Multi-select always emits T[] regardless of valueMode.
   */
  @Input() valueMode: 'single' | 'array' = 'single';

  /**
   * Custom equality comparator for option values.
   * Required when T is an object. Defaults to strict reference equality.
   * @example [compareWith]="(a, b) => a.id === b.id"
   */
  @Input() compareWith: (a: T, b: T) => boolean = (a, b) => a === b;

  // ── Options (signal-backed so computed can react to changes) ─────

  private readonly _options = signal<DropdownOption<T>[]>([]);

  @Input()
  set options(val: DropdownOption<T>[]) {
    this._options.set(val ?? []);
  }
  get options(): DropdownOption<T>[] {
    return this._options();
  }

  // ── Internal signals ─────────────────────────────────────────────

  readonly isOpen = signal(false);
  readonly selectedValues = signal<T[]>([]);
  readonly isDisabled = signal(false);
  readonly hasSelection = computed(() => this.selectedValues().length > 0);

  /** Index of the keyboard-focused option inside the open list (-1 = none). */
  readonly focusedIndex = signal(-1);

  // ── Precomputed label map (O(1) chip look-ups) ────────────────────

  /**
   * Map rebuilt whenever options change.
   * Avoids O(n) Array.find() calls during chip and displayValue rendering.
   */
  readonly labelMap = computed<Map<T, string>>(() => {
    const map = new Map<T, string>();
    for (const opt of this._options()) {
      map.set(opt.value, opt.label);
    }
    return map;
  });

  // ── Debounced search ─────────────────────────────────────────────

  readonly searchCtrl = new FormControl<string>('', { nonNullable: true });

  /** Debounced, lowercase query — drives filteredOptions computed. */
  private readonly searchQuery = signal('');

  /** Filtered list recomputed when options or search query change. */
  readonly filteredOptions = computed<DropdownOption<T>[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!this.searchable || !q) return this._options();
    return this._options().filter((o) => o.label.toLowerCase().includes(q));
  });

  // ── ARIA IDs ─────────────────────────────────────────────────────

  private static nextId = 0;
  /** Unique ID shared between trigger (aria-controls) and listbox (id). */
  readonly listboxId = `sd-listbox-${++SearchableDropdownComponent.nextId}`;

  // ── CVA callbacks (typed) ─────────────────────────────────────────

  private _onChange: (value: T | T[] | null) => void = () => {};
  private _onTouched: () => void = () => {};

  constructor() {
    // Wire the search text-box to the debounced signal
    this.searchCtrl.valueChanges
      .pipe(debounceTime(150), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.searchQuery.set(q));
  }

  // ── ControlValueAccessor ─────────────────────────────────────────

  writeValue(value: T | T[] | null | undefined): void {
    if (value == null) {
      this.selectedValues.set([]);
      return;
    }

    if (Array.isArray(value)) {
      this.selectedValues.set(value.filter((v) => !this.isEmptySelectionValue(v)));
      return;
    }

    this.selectedValues.set(this.isEmptySelectionValue(value) ? [] : [value]);
  }

  private isEmptySelectionValue(value: unknown): boolean {
    return value == null || (typeof value === 'string' && value.trim() === '');
  }

  registerOnChange(fn: (value: T | T[] | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
    disabled
      ? this.searchCtrl.disable({ emitEvent: false })
      : this.searchCtrl.enable({ emitEvent: false });
    if (disabled) this.isOpen.set(false);
  }

  // ── Dropdown open / close ────────────────────────────────────────

  toggleDropdown(): void {
    if (this.isDisabled() || this.loading) return;
    this.isOpen() ? this.close() : this.open();
  }

  open(): void {
    this.isOpen.set(true);
    this.focusedIndex.set(-1);
    this._resetSearch();
    this._onTouched();
    if (this.searchable) {
      requestAnimationFrame(() => {
        const input = (this.elementRef.nativeElement as Element).querySelector<HTMLElement>(
          '.sd-search-input',
        );
        input?.focus();
      });
    }
  }

  close(): void {
    this.isOpen.set(false);
    this._resetSearch();
  }

  private _resetSearch(): void {
    this.searchCtrl.setValue('', { emitEvent: false });
    this.searchQuery.set('');
  }

  // ── Selection ─────────────────────────────────────────────────────

  selectOption(option: DropdownOption<T>): void {
    if (this.isOptionDisabled(option) || this.isDisabled()) return;

    if (this.isMulti) {
      const current = this.selectedValues();
      const existing = current.findIndex((v) => this.compareWith(v, option.value));
      if (existing === -1 && this.maxSelections !== null && current.length >= this.maxSelections) {
        return;
      }
      const next =
        existing === -1 ? [...current, option.value] : current.filter((_, i) => i !== existing);
      this.selectedValues.set(next);
      this._onChange(next);
    } else {
      this.selectedValues.set([option.value]);
      this._onChange(this.valueMode === 'array' ? [option.value] : option.value);
      this.close();
    }
  }

  /** Remove a single chip (multi-select). */
  removeChip(value: T, event: Event): void {
    if (this.isDisabled()) return;
    event.stopPropagation();
    const next = this.selectedValues().filter((v) => !this.compareWith(v, value));
    this.selectedValues.set(next);
    this._onChange(next);
  }

  clearSelection(event: Event): void {
    if (this.isDisabled()) return;
    event.stopPropagation();
    this.selectedValues.set([]);
    this._onChange(this.isMulti || this.valueMode === 'array' ? [] : null);
    this.isOpen.set(false);
  }

  isSelected(value: T): boolean {
    return this.selectedValues().some((v) => this.compareWith(v, value));
  }

  isOptionDisabled(option: DropdownOption<T>): boolean {
    if (option.disabled) return true;
    if (!this.isMulti || this.maxSelections === null) return false;
    if (this.isSelected(option.value)) return false;
    return this.selectedValues().length >= this.maxSelections;
  }

  // ── Display helpers ──────────────────────────────────────────────

  get displayValue(): string {
    const sel = this.selectedValues();
    if (sel.length === 0) return '';
    return this.labelMap().get(sel[0]) ?? String(sel[0]);
  }

  getChipLabel(value: T): string {
    return this.labelMap().get(value) ?? String(value);
  }

  /** Returns the DOM element ID for an option at a given list index. */
  getOptionId(index: number): string {
    return `${this.listboxId}-opt-${index}`;
  }

  get activeDescendantId(): string | null {
    const i = this.focusedIndex();
    return i >= 0 ? this.getOptionId(i) : null;
  }

  // ── Keyboard navigation ──────────────────────────────────────────

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.isDisabled() || this.loading) return;

    switch (event.key) {
      case 'Enter':
        if (!this.isOpen()) {
          this.open();
          event.preventDefault();
        } else {
          const opt = this.filteredOptions()[this.focusedIndex()];
          if (opt) {
            this.selectOption(opt);
            event.preventDefault();
          }
        }
        break;

      case ' ':
        // Space opens dropdown only when the search input is not the active element
        if (!this.isOpen()) {
          this.open();
          event.preventDefault();
        }
        break;

      case 'Escape':
        if (this.isOpen()) {
          this.close();
          event.preventDefault();
        }
        break;

      case 'ArrowDown':
        if (!this.isOpen()) {
          this.open();
        } else {
          this.focusedIndex.update((i) => Math.min(i + 1, this.filteredOptions().length - 1));
        }
        event.preventDefault();
        break;

      case 'ArrowUp':
        if (this.isOpen()) {
          this.focusedIndex.update((i) => Math.max(i - 1, 0));
          event.preventDefault();
        }
        break;

      case 'Tab':
        if (this.isOpen()) this.close();
        break;
    }
  }

  // ── Close on outside click ────────────────────────────────────────

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      if (this.isOpen()) this.close();
    }
  }
}
