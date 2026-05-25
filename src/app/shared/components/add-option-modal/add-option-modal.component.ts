import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AddOptionPayload {
  name: string;
  status: 'Active' | 'Inactive';
  appliesTo: string[]; // form names
}

@Component({
  selector: 'app-add-option-modal',
  templateUrl: './add-option-modal.component.html',
  styleUrls: ['./add-option-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class AddOptionModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() title = 'Add Dropdown Option';
  @Input() categoryLabel = '';
  @Input() availableForms: string[] = [];
  @Input() defaultSelectedForms: string[] = [];
  @Input() initial: AddOptionPayload | null = null;
  @Input() primaryActionLabel = 'Add Option';

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<AddOptionPayload>();

  name: string = '';
  status: 'Active' | 'Inactive' = 'Active';
  appliesTo: string[] = [];

  ngOnChanges(changes: SimpleChanges) {
    const init = this.initial;
    if (init) {
      this.name = init.name || '';
      this.status = init.status || 'Active';
      this.appliesTo = init.appliesTo || [];
    } else {
      this.name = '';
      this.status = 'Active';
      this.appliesTo = [...this.defaultSelectedForms];
    }
  }

  get isValid(): boolean {
    return !!this.name && this.appliesTo.length > 0;
  }

  get showAppliesToError(): boolean {
    return this.appliesTo.length === 0;
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
    this.save.emit({ name: this.name.trim(), status: this.status, appliesTo: [...this.appliesTo] });
  }
}
