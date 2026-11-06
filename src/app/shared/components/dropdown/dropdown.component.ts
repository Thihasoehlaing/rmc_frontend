import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DropdownOption } from '../../../core/interfaces/components.interface';
import { SearchableDropdownComponent } from '../searchable-dropdown/searchable-dropdown.component';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [FormsModule, SearchableDropdownComponent],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DropdownComponent), multi: true },
  ],
  template: `<app-searchable-dropdown
    [label]="label"
    [ariaLabel]="ariaLabel"
    [placeholder]="placeholder"
    [options]="pickerOptions"
    [searchable]="false"
    [isMulti]="isMulti"
    [required]="required"
    [maxSelections]="maxSelections"
    [optionListTitle]="optionListTitle"
    [optionListCount]="optionListCount"
    [allowClear]="false"
    [loading]="loading"
    [disabled]="disabled || formDisabled"
    [ngModel]="selectedKey"
    (ngModelChange)="choose($event)"
    (openChange)="touch()"
  />`,
  styles: [':host { display: block; min-width: 0; width: 100%; }'],
})
export class DropdownComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() ariaLabel = '';
  @Input() required = false;
  @Input() maxSelections: number | null = null;
  @Input() optionListTitle = '';
  @Input() optionListCount: number | null = null;
  private compare = Object.is;
  @Input() set compareWith(compare: (left: unknown, right: unknown) => boolean) { this.compare = compare ?? Object.is; this.syncSelection(); }
  private multi = false;
  @Input() set isMulti(value: boolean) {
    this.multi = value;
    this.rebuildOptions();
  }
  get isMulti(): boolean {
    return this.multi;
  }
  @Input() placeholder = 'Select an option';
  @Input() loading = false;
  @Input() disabled = false;
  private providedOptions: readonly DropdownOption<unknown>[] = [];
  private emptyLabel: string | null = null;
  @Input() set emptyOptionLabel(label: string | null) {
    this.emptyLabel = label;
    this.rebuildOptions();
  }
  @Input() set options(options: readonly DropdownOption<unknown>[]) {
    this.providedOptions = options ?? [];
    this.rebuildOptions();
  }
  private rebuildOptions(): void {
    this.sourceOptions =
      this.emptyLabel &&
      !this.isMulti &&
      !this.providedOptions.some((option) => option.value === null)
        ? [{ value: null, label: this.emptyLabel }, ...this.providedOptions]
        : this.providedOptions;
    this.pickerOptions = this.sourceOptions.map((option, index) => ({
      ...option,
      value: String(index),
    }));
    this.syncSelection();
  }
  private sourceOptions: readonly DropdownOption<unknown>[] = [];
  pickerOptions: DropdownOption<string>[] = [];
  selectedKey: string | string[] | null = null;
  formDisabled = false;
  private value: unknown;
  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};
  writeValue(value: unknown): void {
    this.value = value;
    this.syncSelection();
  }
  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.formDisabled = disabled;
  }
  touch(): void {
    this.onTouched();
  }
  choose(key: string | string[] | null): void {
    if (key === null || this.disabled || this.formDisabled || this.loading) return;
    if (this.isMulti) {
      const keys = Array.isArray(key) ? key : [key];
      const selected = keys
        .map((value) => this.sourceOptions[Number(value)])
        .filter((option) => !!option);
      this.value = selected.map((option) => option.value);
      this.syncSelection();
      this.onChange(this.value);
      this.onTouched();
      return;
    }
    if (Array.isArray(key)) return;
    const option = this.sourceOptions[Number(key)];
    if (!option || option.disabled) return;
    this.value = option.value;
    this.syncSelection();
    this.onChange(option.value);
    this.onTouched();
  }
  private syncSelection(): void {
    if (this.isMulti) {
      const values = Array.isArray(this.value) ? this.value : [];
      this.selectedKey = this.sourceOptions.flatMap((option, index) =>
        values.some((value) => this.compare(option.value, value)) ? [String(index)] : [],
      );
      return;
    }
    const index = this.sourceOptions.findIndex((option) => this.compare(option.value, this.value));
    this.selectedKey = index === -1 ? null : String(index);
  }
}
