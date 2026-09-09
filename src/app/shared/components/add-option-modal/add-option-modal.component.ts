import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SearchableDropdownComponent } from '../searchable-dropdown/searchable-dropdown.component';
import { DropdownOption } from '../../../core/interfaces/components.interface';
import { DecimalAmountDirective } from '../../directives/decimal-amount.directive';

export interface AddOptionPayload {
  code?: string;
  symbol?: string;
  name: string;
  status: 'Active' | 'Inactive';
  appliesTo: string[]; // form names
  accountNumber?: string;
  percentage?: number | null;
  limit?: number | null;
  description?: string;
  parentDomainId?: number | null;
  countryId?: number | null;
}

@Component({
  selector: 'app-add-option-modal',
  templateUrl: './add-option-modal.component.html',
  styleUrls: ['./add-option-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SearchableDropdownComponent,
    DecimalAmountDirective,
  ],
})
export class AddOptionModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() title = 'Add Dropdown Option';
  @Input() showCategory = true;
  @Input() categoryLabel = '';
  @Input() showCode = false;
  @Input() codeLabel = 'Code';
  @Input() showSymbol = false;
  @Input() symbolLabel = 'Symbol';
  @Input() optionNameLabel = 'Option Name';
  @Input() optionNameMaxLength: number | null = null;
  @Input() showOptionNameCounter = false;
  @Input() availableForms: string[] = [];
  @Input() availableFormOptions: DropdownOption<string>[] = [];
  @Input() defaultSelectedForms: string[] = [];
  @Input() initial: AddOptionPayload | null = null;
  @Input() primaryActionLabel = 'Add Option';
  @Input() showAccountNumberMetadata = false;
  @Input() accountNumberLabel = 'Account Number';
  @Input() showRegionMetadata = false;
  @Input() nameReadonly = false;
  @Input() descriptionReadonly = false;
  @Input() allowFormSharing = true;
  /** When true, show a required "Parent Research Domain" dropdown (used for Sub-Research Domain). */
  @Input() showParentDomain = false;
  @Input() parentDomainLabel = 'Parent Research Domain';
  @Input() parentDomainOptions: { label: string; value: string }[] = [];
  @Input() showCountry = false;
  @Input() countryLabel = 'Country';
  @Input() countryOptions: { label: string; value: string }[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<AddOptionPayload>();

  name: string = '';
  code: string = '';
  symbol: string = '';
  status: 'Active' | 'Inactive' = 'Active';
  appliesTo: string[] = [];
  readonly appliesToControl = new FormControl<string[]>([], { nonNullable: true });
  accountNumber: string = '';
  percentage: number | null = null;
  limit: number | null = null;
  description: string = '';
  parentDomainId: string = '';
  countryId: string = '';

  ngOnChanges(changes: SimpleChanges) {
    // Only reset when the modal opens or while it is closed and a new edit value is
    // prepared. Some parents rebuild `initial` every change-detection cycle; resetting
    // while open would silently discard the user's selections.
    const modalOpened =
      changes['isOpen']?.currentValue === true && changes['isOpen']?.previousValue !== true;
    const initialChangedWhileClosed = 'initial' in changes && !this.isOpen;
    if (!modalOpened && !initialChangedWhileClosed) {
      return;
    }

    const init = this.initial;
    if (init) {
      this.code = init.code || '';
      this.symbol = init.symbol || '';
      this.name = this.limitOptionName(init.name || '');
      this.status = init.status || 'Active';
      this.appliesTo = init.appliesTo || [];
      this.appliesToControl.setValue(this.appliesTo, { emitEvent: false });
      this.accountNumber = init.accountNumber || '';
      this.percentage = init.percentage ?? null;
      this.limit = init.limit ?? null;
      this.description = init.description || '';
      this.parentDomainId = init.parentDomainId != null ? String(init.parentDomainId) : '';
      this.countryId = init.countryId != null ? String(init.countryId) : '';
    } else {
      this.code = '';
      this.symbol = '';
      this.name = '';
      this.status = 'Active';
      this.appliesTo = [...this.defaultSelectedForms];
      this.appliesToControl.setValue(this.appliesTo, { emitEvent: false });
      this.accountNumber = '';
      this.percentage = null;
      this.limit = null;
      this.description = '';
      this.parentDomainId = '';
      this.countryId = '';
    }
  }

  get isValid(): boolean {
    if (!this.name.trim()) {
      return false;
    }

    if (this.showCode && !this.code.trim()) {
      return false;
    }

    if (this.showSymbol && !this.symbol.trim()) {
      return false;
    }

    if (this.showParentDomain && !this.parentDomainId) {
      return false;
    }

    if (this.showCountry && !this.countryId) {
      return false;
    }

    if (this.allowFormSharing && this.selectedAppliesTo.length === 0) {
      return false;
    }

    if (this.showAccountNumberMetadata && !this.accountNumber.trim()) {
      return false;
    }

    if (!this.showRegionMetadata) {
      return true;
    }

    return (
      this.percentage !== null && this.limit !== null && `${this.description}`.trim().length > 0
    );
  }

  get showAppliesToError(): boolean {
    return this.allowFormSharing && this.selectedAppliesTo.length === 0;
  }

  get usesSearchableFormSharing(): boolean {
    return this.availableFormOptions.length > 0;
  }

  get selectedAppliesTo(): string[] {
    return this.usesSearchableFormSharing ? this.appliesToControl.value : this.appliesTo;
  }

  onToggleForm(form: string) {
    const idx = this.appliesTo.indexOf(form);
    if (idx >= 0) this.appliesTo.splice(idx, 1);
    else this.appliesTo.push(form);
  }

  onCancel() {
    this.close.emit();
  }

  onSave() {
    if (!this.isValid) return;
    const appliesTo = this.allowFormSharing
      ? [...this.selectedAppliesTo]
      : [...this.defaultSelectedForms];
    this.save.emit({
      code: this.showCode ? this.code.trim() : undefined,
      symbol: this.showSymbol ? this.symbol.trim() : undefined,
      name: this.limitOptionName(this.name.trim()),
      status: this.status,
      appliesTo,
      accountNumber: this.showAccountNumberMetadata ? this.accountNumber.trim() : undefined,
      percentage: this.showRegionMetadata ? this.percentage : undefined,
      limit: this.showRegionMetadata ? this.limit : undefined,
      description: this.showRegionMetadata ? this.description.trim() : undefined,
      parentDomainId: this.showParentDomain ? Number(this.parentDomainId) : undefined,
      countryId: this.showCountry ? Number(this.countryId) : undefined,
    });
  }

  private limitOptionName(value: string): string {
    return this.optionNameMaxLength === null ? value : value.slice(0, this.optionNameMaxLength);
  }
}
