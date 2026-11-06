import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  TrackByFunction,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MasterDataService } from '../../../core/services/master-data.service';
import { DropdownOption } from '../../../core/interfaces/components.interface';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';

import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { Group, GroupPayload, GroupsService } from './groups.service';

import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { StatusBadgeComponent } from '../../../shared/components/form-standard/form-standard.components';
import {
  SettingsPageHeaderComponent,
  SettingsPanelComponent,
  SearchToolbarComponent,
  FieldComponent,
  InputDirective,
  StateComponent,
  SelectionSummaryComponent,
} from '../../../shared/components/settings-ui/settings-ui.components';

type DialogMode = 'create' | 'edit';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [
    SearchableDropdownComponent,
    ActionButtonComponent,
    StatusBadgeComponent,
    SettingsPageHeaderComponent,
    SettingsPanelComponent,
    SearchToolbarComponent,
    FieldComponent,
    InputDirective,
    StateComponent,
    SelectionSummaryComponent,
    CommonModule,
    FormsModule,
    DataTableComponent,
    DialogComponent,
    PaginationComponent,
  ],
  templateUrl: './groups.component.html',
  styleUrl: './groups.component.scss',
})
export class GroupsComponent implements OnInit {
  private readonly masterData = inject(MasterDataService);
  private readonly destroyRef = inject(DestroyRef);
  private detailRequest?: Subscription;
  private staffRequest?: Subscription;
  private staffCache = new Map<number, DropdownOption<number>>();
  readonly selectedStaffIds = signal<number[]>([]);
  readonly staffOptions = signal<DropdownOption<number>[]>([]);
  readonly staffOptionsLoading = signal(false);
  readonly staffLoadFailed = signal(false);
  readonly staffDropdownOptions = computed(() => {
    const options = new Map(this.staffOptions().map((option) => [option.value, option]));
    for (const id of this.selectedStaffIds()) {
      const option = this.staffCache.get(id);
      if (option) options.set(id, option);
    }
    return [...options.values()];
  });
  readonly selectedStaff = computed(() => {
    const options = new Map(this.staffDropdownOptions().map((option) => [option.value, option]));
    return this.selectedStaffIds().map(
      (id) =>
        options.get(id) ?? {
          value: id,
          label: `Staff #${id}`,
          description: '',
        },
    );
  });
  readonly historicalMembers = computed(
    () => this.selectedGroup()?.members?.filter((member) => member.staff_id === null) ?? [],
  );
  private readonly groupsService = inject(GroupsService);
  private readonly toastService = inject(ToastService);

  readonly groups = signal<Group[]>([]);
  readonly searchTerm = signal('');
  readonly appliedSearch = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 30, 50];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);

  readonly dialogMode = signal<DialogMode | null>(null);
  readonly selectedGroup = signal<Group | null>(null);
  readonly codeTouched = signal(false);
  readonly nameTouched = signal(false);
  readonly groupCode = signal('');
  readonly groupName = signal('');
  readonly isDetailLoading = signal(false);
  readonly detailFailed = signal(false);
  readonly isSaving = signal(false);
  readonly groupToDelete = signal<Group | null>(null);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'code', label: 'Group Code', width: '190px' },
    { key: 'name', label: 'Group Name' },
    { key: 'userCount', label: 'Members', width: '110px', align: 'center' },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index: number, row: unknown) =>
    (row as Group).id;

  ngOnInit(): void {
    this.loadGroups();
    this.destroyRef.onDestroy(() => {
      this.detailRequest?.unsubscribe();
      this.staffRequest?.unsubscribe();
    });
  }

  loadStaffOptions(): void {
    if (!this.dialogMode()) return;
    this.staffRequest?.unsubscribe();
    this.staffLoadFailed.set(false);
    this.staffOptionsLoading.set(true);
    this.staffRequest = this.masterData
      .getStaffOptions('staff')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.staffOptionsLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const options = response.data.map((staff) => ({
            value: staff.staff_id,
            label: `${staff.fullname || staff.username} (${staff.username})`,
            description: staff.email,
            searchText: `${staff.fullname} ${staff.username} ${staff.email} ${staff.department}`,
          }));
          for (const option of options) this.staffCache.set(option.value, option);
          this.staffOptions.set(options);
        },
        error: () => this.staffLoadFailed.set(true),
      });
  }

  private resetStaffPicker(): void {
    this.staffRequest?.unsubscribe();
    this.staffCache.clear();
    this.selectedStaffIds.set([]);
    this.staffOptions.set([]);
    this.staffLoadFailed.set(false);
  }

  loadGroups(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.groupsService
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        search: this.appliedSearch(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const pagination = response.data.pagination;
          if (pagination.total_pages > 0 && this.page() > pagination.total_pages) {
            this.page.set(pagination.total_pages);
            this.loadGroups();
            return;
          }

          this.groups.set(response.data.items);
          this.totalItems.set(pagination.total_items);
          this.totalPages.set(Math.max(1, pagination.total_pages));
          this.toastService.success(response.message);
        },
        error: () => {
          this.groups.set([]);
          this.totalItems.set(0);
          this.totalPages.set(1);
          this.loadFailed.set(true);
        },
      });
  }

  search(): void {
    this.appliedSearch.set(this.searchTerm().trim());
    this.page.set(1);
    this.loadGroups();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.appliedSearch.set('');
    this.page.set(1);
    this.loadGroups();
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadGroups();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadGroups();
  }

  openCreateDialog(): void {
    this.codeTouched.set(false);
    this.nameTouched.set(false);
    this.detailRequest?.unsubscribe();
    this.resetStaffPicker();
    this.isDetailLoading.set(false);
    this.selectedGroup.set(null);
    this.groupCode.set('');
    this.groupName.set('');
    this.detailFailed.set(false);
    this.dialogMode.set('create');
    this.loadStaffOptions();
  }

  openEditDialog(group: Group): void {
    this.codeTouched.set(false);
    this.nameTouched.set(false);
    this.detailRequest?.unsubscribe();
    this.resetStaffPicker();
    this.selectedGroup.set(group);
    this.dialogMode.set('edit');
    this.fetchGroup(group.id);
  }

  retryDetail(): void {
    const group = this.selectedGroup();
    if (group) this.fetchGroup(group.id);
  }

  closeEditor(): void {
    if (this.isSaving()) return;
    this.detailRequest?.unsubscribe();
    this.staffRequest?.unsubscribe();
    this.dialogMode.set(null);
    this.selectedGroup.set(null);
    this.detailFailed.set(false);
  }

  onNameChange(value: string): void {
    this.groupName.set(value);
  }

  validCode(): boolean {
    return /^[A-Za-z][A-Za-z0-9_]{0,99}$/.test(this.groupCode().trim());
  }

  saveGroup(): void {
    const mode = this.dialogMode();
    const code = this.groupCode().trim().toUpperCase();
    const name = this.groupName().trim();
    if (
      !mode ||
      !this.validCode() ||
      !name ||
      this.isSaving() ||
      this.isDetailLoading() ||
      this.detailFailed() ||
      this.staffLoadFailed()
    )
      return;

    const payload: GroupPayload = {
      staff_ids: this.selectedStaffIds(),
      group_code: code,
      group_name: name,
    };
    const request =
      mode === 'create'
        ? this.groupsService.create(payload)
        : this.groupsService.update(this.selectedGroup()!.id, payload);

    this.isSaving.set(true);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe({
        next: () => {
          this.dialogMode.set(null);
          this.selectedGroup.set(null);
          this.page.set(1);
          this.loadGroups();
        },
      });
  }

  openDeleteDialog(group: Group): void {
    this.groupToDelete.set(group);
  }

  closeDeleteDialog(): void {
    if (this.isSaving()) return;
    this.groupToDelete.set(null);
  }

  confirmDelete(): void {
    const group = this.groupToDelete();
    if (!group || this.isSaving()) return;

    this.isSaving.set(true);
    this.groupsService
      .delete(group.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe({
        next: () => {
          this.groupToDelete.set(null);
          this.loadGroups();
        },
      });
  }

  dialogTitle(): string {
    return this.dialogMode() === 'create' ? 'Create Group' : 'Edit Group';
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  pageStart(): number {
    return this.totalItems() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(this.pageStart() + this.groups().length - 1, this.totalItems());
  }

  private fetchGroup(id: number): void {
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);

    this.detailRequest?.unsubscribe();
    this.detailRequest = this.groupsService
      .get(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDetailLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          for (const member of response.data.members ?? []) {
            if (member.staff_id !== null)
              this.staffCache.set(member.staff_id, {
                value: member.staff_id,
                label: `${member.fullname} (${member.username})`,
                description: member.email,
              });
          }
          this.selectedStaffIds.set(
            (response.data.members ?? []).flatMap((member) =>
              member.staff_id === null ? [] : [member.staff_id],
            ),
          );
          this.loadStaffOptions();
          this.selectedGroup.set(response.data);
          this.groupCode.set(response.data.group_code);
          this.groupName.set(response.data.group_name);
          this.toastService.success(response.message);
        },
        error: () => this.detailFailed.set(true),
      });
  }
}
