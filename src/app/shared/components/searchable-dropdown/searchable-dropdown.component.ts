import { Component, Input, forwardRef, signal, computed, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormControl } from '@angular/forms';
import { DropdownOption } from '../../../interfaces/components.interface';

@Component({
  selector: 'app-searchable-dropdown',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './searchable-dropdown.component.html',
  styleUrls: ['./searchable-dropdown.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableDropdownComponent),
      multi: true
    }
  ]
})
export class SearchableDropdownComponent implements ControlValueAccessor {
  private elementRef = inject(ElementRef);

  @Input() label = '';
  @Input() options: DropdownOption[] = [];
  @Input() isMulti = false;
  @Input() placeholder = 'Select an option...';
  @Input() searchable = true;

  searchCtrl = new FormControl('');
  isOpen = signal(false);
  selectedValues = signal<any[]>([]);

  // ControlValueAccessor methods
  onChange: any = () => { };
  onTouched: any = () => { };

  writeValue(value: any): void {
    if (value === null || value === undefined) {
      this.selectedValues.set([]);
    } else {
      this.selectedValues.set(Array.isArray(value) ? value : [value]);
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState?(isDisabled: boolean): void {
    if (isDisabled) this.searchCtrl.disable();
    else this.searchCtrl.enable();
  }

  get filteredOptions() {
    const q = (this.searchCtrl.value || '').toLowerCase();
    if (!this.searchable || !q) return this.options;
    return this.options.filter(o => o.label.toLowerCase().includes(q));
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleDropdown() {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.onTouched();
    }
  }

  selectOption(option: DropdownOption) {
    if (option.disabled) return;

    if (this.isMulti) {
      const current = this.selectedValues();
      const index = current.indexOf(option.value);
      if (index === -1) {
        this.selectedValues.set([...current, option.value]);
      } else {
        this.selectedValues.set(current.filter(v => v !== option.value));
      }
      this.onChange(this.selectedValues());
    } else {
      this.selectedValues.set([option.value]);
      this.onChange(option.value);
      this.isOpen.set(false);
    }
  }

  isSelected(value: any) {
    return this.selectedValues().includes(value);
  }

  clearSelection(event: Event) {
    event.stopPropagation();
    this.selectedValues.set([]);
    this.onChange(this.isMulti ? [] : null);
    this.isOpen.set(false);
  }

  get displayValue() {
    const selected = this.selectedValues();
    if (selected.length === 0) return '';
    if (this.isMulti) return `${selected.length} items selected`;
    const option = this.options.find(o => o.value === selected[0]);
    return option ? option.label : '';
  }
}
