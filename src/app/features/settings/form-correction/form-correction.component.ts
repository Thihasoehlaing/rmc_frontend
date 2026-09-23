import { CommonModule } from '@angular/common';
import { Component, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { DropdownOption } from '../../../core/interfaces/components.interface';
import {
  AcademicStaffOption,
  MasterDataService,
} from '../../../core/services/master-data.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { formatDisplayDateTime } from '../../../shared/utils/date-time.util';
import {
  ApuStaffCoAuthorCorrectionPayload,
  ApuStaffCoAuthorCorrectionRow,
  FormCorrectionLookupData,
  FormCorrectionService,
} from './form-correction.service';

type DialogMode = 'create' | 'edit';

@Component({
  selector: 'app-form-correction',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    DialogComponent,
    SearchableDropdownComponent,
    TableActionIconComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './form-correction.component.html',
  styleUrls: ['../forms/forms.component.scss', './form-correction.component.scss'],
})
export class FormCorrectionComponent {
  private readonly correctionService = inject(FormCorrectionService);
  private readonly masterData = inject(MasterDataService);
  private readonly toast = inject(ToastService);

  readonly requestCode = signal('');
  readonly correctionData = signal<FormCorrectionLookupData | null>(null);
  readonly isSearching = signal(false);
  readonly lookupFailed = signal(false);
  readonly lookupError = signal('');

  readonly dialogMode = signal<DialogMode | null>(null);
  readonly editingAuthor = signal<ApuStaffCoAuthorCorrectionRow | null>(null);
  readonly selectedStaffUsername = signal<string | null>(null);
  readonly staffName = signal('');
  readonly staffDepartment = signal('');
  readonly affiliation = signal('Asia Pacific University');
  readonly displayOrder = signal<number | null>(null);
  readonly correctionReason = signal('');
  readonly staffOptions = signal<DropdownOption<string>[]>([]);
  readonly academicStaffByUsername = new Map<string, AcademicStaffOption>();
  readonly staffOptionsLoading = signal(false);
  readonly staffOptionsLoadFailed = signal(false);
  readonly isSaving = signal(false);
  readonly deleteTarget = signal<ApuStaffCoAuthorCorrectionRow | null>(null);
  readonly deleteReason = signal('');

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'staff_name', label: 'Staff Name', width: '280px' },
    { key: 'staff_department', label: 'Department', width: '260px' },
    { key: 'affiliation', label: 'Affiliation', width: '240px' },
    { key: 'actions', label: 'Actions', width: '120px', align: 'center', headerAlign: 'center' },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index, row) =>
    (row as ApuStaffCoAuthorCorrectionRow).id;

  lookupRequest(): void {
    const code = this.requestCode().trim();
    if (!code || this.isSearching()) return;

    this.isSearching.set(true);
    this.lookupFailed.set(false);
    this.lookupError.set('');
    this.correctionData.set(null);

    this.correctionService
      .lookup(code)
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (response) => {
          this.correctionData.set(response.data);
          this.toast.success(response.message);
        },
        error: (err) => {
          this.lookupFailed.set(true);
          this.lookupError.set(err?.error?.message || 'Unable to find a supported request.');
        },
      });
  }

  openCreateDialog(): void {
    this.dialogMode.set('create');
    this.editingAuthor.set(null);
    this.resetEditor();
    this.loadAcademicStaffOptions();
  }

  openEditDialog(author: ApuStaffCoAuthorCorrectionRow): void {
    this.dialogMode.set('edit');
    this.editingAuthor.set(author);
    this.selectedStaffUsername.set(null);
    this.staffName.set(author.staff_name || '');
    this.staffDepartment.set(author.staff_department || '');
    this.affiliation.set(author.affiliation || 'Asia Pacific University');
    this.displayOrder.set(author.display_order);
    this.correctionReason.set('');
    this.loadAcademicStaffOptions(author.staff_name || '');
  }

  closeEditor(): void {
    if (this.isSaving()) return;
    this.dialogMode.set(null);
    this.editingAuthor.set(null);
    this.resetEditor();
  }

  onStaffSearch(search: string): void {
    this.loadAcademicStaffOptions(search);
  }

  onStaffSelected(username: string | null): void {
    this.selectedStaffUsername.set(username);
    if (!username) return;
    const staff = this.academicStaffByUsername.get(username);
    if (!staff) return;
    this.staffName.set(staff.fullname || staff.username || staff.email || username);
    this.staffDepartment.set(staff.department || '');
    this.affiliation.set('Asia Pacific University');
  }

  saveCorrection(): void {
    const data = this.correctionData();
    const mode = this.dialogMode();
    const reason = this.correctionReason().trim();
    if (!data || !mode || this.isSaving() || !this.staffName().trim() || !reason) return;

    const payload: ApuStaffCoAuthorCorrectionPayload = {
      staff_name: this.staffName().trim(),
      staff_department: this.staffDepartment().trim() || null,
      affiliation: this.affiliation().trim() || null,
      display_order: this.displayOrder(),
      correction_reason: reason,
    };

    const request =
      mode === 'create'
        ? this.correctionService.createApuStaffCoAuthor(data.request.id, payload)
        : this.correctionService.updateApuStaffCoAuthor(
            data.request.id,
            this.editingAuthor()!.id,
            payload,
          );

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: (response) => {
        this.correctionData.set(response.data);
        this.toast.success(response.message);
        this.closeEditor();
      },
    });
  }

  openDeleteDialog(author: ApuStaffCoAuthorCorrectionRow): void {
    this.deleteTarget.set(author);
    this.deleteReason.set('');
  }

  closeDeleteDialog(): void {
    if (this.isSaving()) return;
    this.deleteTarget.set(null);
    this.deleteReason.set('');
  }

  confirmDelete(): void {
    const data = this.correctionData();
    const target = this.deleteTarget();
    const reason = this.deleteReason().trim();
    if (!data || !target || !reason || this.isSaving()) return;

    this.isSaving.set(true);
    this.correctionService
      .deleteApuStaffCoAuthor(data.request.id, target.id, reason)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (response) => {
          this.correctionData.set(response.data);
          this.toast.success(response.message);
          this.closeDeleteDialog();
        },
      });
  }

  rowNumber(index: number): number {
    return index + 1;
  }

  formatDateTime(value: string | null): string {
    return formatDisplayDateTime(value);
  }

  private resetEditor(): void {
    this.selectedStaffUsername.set(null);
    this.staffName.set('');
    this.staffDepartment.set('');
    this.affiliation.set('Asia Pacific University');
    this.displayOrder.set(null);
    this.correctionReason.set('');
  }

  private loadAcademicStaffOptions(search = ''): void {
    this.staffOptionsLoading.set(true);
    this.staffOptionsLoadFailed.set(false);
    this.masterData
      .searchAcademicStaff(search)
      .pipe(finalize(() => this.staffOptionsLoading.set(false)))
      .subscribe({
        next: (response) => {
          const options = response.success ? (response.data ?? []) : [];
          this.academicStaffByUsername.clear();
          for (const staff of options) {
            if (staff.username) {
              this.academicStaffByUsername.set(staff.username, staff);
            }
          }
          this.staffOptions.set(options.map((staff) => this.toStaffOption(staff)));
        },
        error: () => {
          this.staffOptions.set([]);
          this.academicStaffByUsername.clear();
          this.staffOptionsLoadFailed.set(true);
        },
      });
  }

  private toStaffOption(staff: AcademicStaffOption): DropdownOption<string> {
    const username = staff.username || staff.email || String(staff.id);
    const label = staff.fullname || staff.username || staff.email || `Staff ${staff.id}`;
    return {
      value: username,
      label,
      description: [staff.username, staff.email, staff.department].filter(Boolean).join(' • '),
      displayLabel: staff.username || label,
      searchText: [staff.username, staff.fullname, staff.email, staff.department]
        .filter(Boolean)
        .join(' '),
    };
  }
}
