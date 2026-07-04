import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchableDropdownComponent } from '../searchable-dropdown/searchable-dropdown.component';
import { DropdownOption } from '../../../core/interfaces/components.interface';

export interface AddOptionPayload {
  name: string;
  status: 'Active' | 'Inactive';
  appliesTo: string[]; // form names
  accountNumber?: string;
  percentage?: number | null;
  limit?: number | null;
  description?: string;
  parentDomainId?: number | null;
}

@Component({
  selector: 'app-add-option-modal',
  templateUrl: './add-option-modal.component.html',
  styleUrls: ['./add-option-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableDropdownComponent],
})
export class AddOptionModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() title = 'Add Dropdown Option';
  @Input() showCategory = true;
  @Input() categoryLabel = '';
  @Input() optionNameLabel = 'Option Name';
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

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<AddOptionPayload>();

  name: string = '';
  status: 'Active' | 'Inactive' = 'Active';
  appliesTo: string[] = [];
  accountNumber: string = '';
  percentage: number | null = null;
  limit: number | null = null;
  description: string = '';
  parentDomainId: string = '';

  ngOnChanges(changes: SimpleChanges) {
    const init = this.initial;
    if (init) {
      this.name = init.name || '';
      this.status = init.status || 'Active';
      this.appliesTo = init.appliesTo || [];
      this.accountNumber = init.accountNumber || '';
      this.percentage = init.percentage ?? null;
      this.limit = init.limit ?? null;
      this.description = init.description || '';
      this.parentDomainId = init.parentDomainId != null ? String(init.parentDomainId) : '';
    } else {
      this.name = '';
      this.status = 'Active';
      this.appliesTo = [...this.defaultSelectedForms];
      this.accountNumber = '';
      this.percentage = null;
      this.limit = null;
      this.description = '';
      this.parentDomainId = '';
    }
  }

  get isValid(): boolean {
    if (!this.name.trim()) {
      return false;
    }

    if (this.showParentDomain && !this.parentDomainId) {
      return false;
    }

    if (this.allowFormSharing && this.appliesTo.length === 0) {
      return false;
    }

    if (this.showAccountNumberMetadata && !this.accountNumber.trim()) {
      return false;
    }

    if (!this.showRegionMetadata) {
      return true;
    }

    return this.percentage !== null &&
      this.limit !== null &&
      `${this.description}`.trim().length > 0;
  }

  get showAppliesToError(): boolean {
    return this.allowFormSharing && this.appliesTo.length === 0;
  }

  get usesSearchableFormSharing(): boolean {
    return this.availableFormOptions.length > 0;
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
    const appliesTo = this.allowFormSharing ? [...this.appliesTo] : [...this.defaultSelectedForms];
    this.save.emit({
      name: this.name.trim(),
      status: this.status,
      appliesTo,
      accountNumber: this.showAccountNumberMetadata ? this.accountNumber.trim() : undefined,
      percentage: this.showRegionMetadata ? this.percentage : undefined,
      limit: this.showRegionMetadata ? this.limit : undefined,
      description: this.showRegionMetadata ? this.description.trim() : undefined,
      parentDomainId: this.showParentDomain ? Number(this.parentDomainId) : undefined,
    });
  }
}

