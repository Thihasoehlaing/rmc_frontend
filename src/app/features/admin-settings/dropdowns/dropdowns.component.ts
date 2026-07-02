import { Component, TrackByFunction, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  RdigDropdownOptionsService,
  AdminListParams,
  AdminPagination,
} from '../rdig-dropdown-options.service';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { nextTableSortState, SortDirection } from '../../../shared/services/table-sort.service';
import {
  AddOptionModalComponent,
  AddOptionPayload,
} from '../../../shared/components/add-option-modal/add-option-modal.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { SvgIconComponent } from '../../../shared/components/svg-icon/svg-icon.component';
import { SVG_ICON_TRASH } from '../../../shared/icons/svg-icons';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';

interface DropdownOption {
  id: number;
  formName: string;
  category: string;
  value: string;
  lastUpdated: string;
  createdBy: string;
  status: 'Active' | 'Inactive';
  /** Only used for RDIG Sub-Research Domain (API-backed) rows. */
  parentDomainId?: number;
}

/** A row loaded from the real backend for an RDIG API-backed category. */
interface ApiRow {
  id: number;
  value: string;
  status: 'Active' | 'Inactive';
  parentDomainId?: number;
}

interface DropdownOptionView extends DropdownOption {
  sharedWith: string[];
  accountNumber?: string;
  percentage?: number;
  limit?: number;
  description?: string;
}

interface DropdownGroup {
  id: number;
  title: string;
  categories: string[];
  items: number;
  shared?: number;
}

type DropdownSortKey = 'value' | 'status' | 'lastUpdated';
type DropdownStatusFilter = 'all' | 'active' | 'inactive';

interface RegionMetadata {
  createdDate?: string;
  status?: 'Active' | 'Inactive';
  percentage?: number;
  limit?: number;
  description?: string;
}

interface AccountCodeMetadata {
  createdDate?: string;
  status?: 'Active' | 'Inactive';
  accountNumber?: string;
}

/**
 * Explicit sharing configuration: defines which forms can share which categories.
 * Only the forms listed for a category can share options in that category.
 */
interface CategorySharingConfig {
  [categoryName: string]: string[];
}

@Component({
  selector: 'app-dropdowns',
  standalone: true,
  imports: [
    TableActionIconComponent,
    SubmissionsSearchComponent,
    CommonModule,
    FormsModule,
    RouterModule,
    ActionButtonComponent,
    DataTableComponent,
    AddOptionModalComponent,
    PaginationComponent,
    DialogComponent,
    SvgIconComponent,
    SearchableDropdownComponent,
  ],
  templateUrl: './dropdowns.component.html',
  styleUrls: ['./dropdowns.component.scss'],
})
export class DropdownsComponent implements OnInit {
  readonly trashIcon = SVG_ICON_TRASH;

  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private rdigService = inject(RdigDropdownOptionsService);
  private toast = inject(ToastService);
  private readonly STORAGE_KEY = 'rmc_dropdowns_data';

  /**
   * RDIG categories that are backed by the real backend API (Add/Edit/Delete/Toggle
   * go to the server, not localStorage). "Type of Organisation" is intentionally
   * excluded — its API is not ready yet, so it stays on the existing localStorage path.
   */
  private readonly RDIG_API_CATEGORIES = [
    'Research Cluster',
    'Research Domain',
    'Sub-Research Domain',
    'ESG',
    'SDG',
  ];

  /** Rows loaded from the API for the currently selected RDIG API category. */
  apiRows = signal<ApiRow[]>([]);
  apiLoading = signal(false);
  /** Active research domains — populates the "Research Domain" picker for the Sub-Research Domain tab. */
  subDomainParents = signal<{ label: string; value: string }[]>([]);
  /**
   * The domain the admin is currently viewing/managing sub-domains for. The
   * backend only exposes sub-domains scoped to one domain at a time (no "list
   * all" endpoint), so the admin must pick a domain before anything loads —
   * this keeps every Sub-Research Domain fetch down to a single request
   * instead of fanning out to every domain at once.
   */
  selectedSubDomainParentId = signal<number | null>(null);
  /**
   * Pagination metadata returned by the backend, set only for categories that
   * have a real flat/scoped list endpoint (see isServerPaginated). Null means
   * the current category's table is paginated client-side instead.
   */
  apiPagination = signal<AdminPagination | null>(null);

  /**
   * Categories with a real backend list endpoint that supports page/per_page
   * directly. Sub-Research Domain qualifies once a parent domain is selected
   * (research-domains/{id}/sub-domains is itself fully paginated).
   */
  private readonly SERVER_PAGINATED_CATEGORIES = [
    'Research Cluster',
    'Research Domain',
    'Sub-Research Domain',
    'ESG',
    'SDG',
  ];

  /** True when the current group is RDIG and the category is API-backed. */
  isApiMode(): boolean {
    return (
      this.selectedGroup()?.title === 'RDIG Application' &&
      this.RDIG_API_CATEGORIES.includes(this.selectedCategory())
    );
  }

  isServerPaginated(): boolean {
    return this.SERVER_PAGINATED_CATEGORIES.includes(this.selectedCategory());
  }

  /**
   * Defines which forms are allowed to share options for each category.
   * Only forms listed here can have shared options across forms.
   * Categories not listed here are NOT shared across forms.
   */
  private readonly CATEGORY_SHARING_CONFIG: CategorySharingConfig = {
    'Research Cluster': ['RDIG Application', 'RA/GRA Application'],
    'Type of Organisation': ['RDIG Application', 'Conference Application', 'Journal Application'],
    'Project Account Code': ['Conference Application', 'Journal Application'],
    'Vote Number Description': ['Conference Application', 'Journal Application'],
  };

  private readonly DEFAULT_REGION_METADATA: Record<
    string,
    Required<Pick<RegionMetadata, 'percentage' | 'limit' | 'description'>>
  > = {
    americas: {
      percentage: 50,
      limit: 5000,
      description:
        'USA, Canada, Mexico and other parts of South America - (A maximum of 50% & limit to a maximum of RM5,000, whichever is lower)',
    },
    asean: {
      percentage: 85,
      limit: 5000,
      description:
        'ASEAN Countries - (A maximum of 85% & limit to a maximum of RM5,000, whichever is lower)',
    },
    asia: {
      percentage: 70,
      limit: 5000,
      description:
        'Japan, China, Korea, Central Asia, India, Sri Lanka, Pakistan - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
    },
    australasia: {
      percentage: 70,
      limit: 5000,
      description:
        'Australia, New Zealand, PNG, Timor Leste - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
    },
    europe: {
      percentage: 50,
      limit: 5000,
      description:
        'Europe - (A maximum of 50% & limit to a maximum of RM5,000, whichever is lower)',
    },
    malaysia: {
      percentage: 85,
      limit: 5000,
      description:
        'Throughout Malaysia - (A maximum of 85% & limit to a maximum of RM5,000, whichever is lower)',
    },
    'middle east and africa': {
      percentage: 60,
      limit: 5000,
      description:
        'Middle East and Africa - (A maximum of 60% & limit to a maximum of RM5,000, whichever is lower)',
    },
    mea: {
      percentage: 60,
      limit: 5000,
      description:
        'Middle East and Africa - (A maximum of 60% & limit to a maximum of RM5,000, whichever is lower)',
    },
    'pacific islands': {
      percentage: 70,
      limit: 5000,
      description:
        'Pacific Islands (Maldives etc.) - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
    },
    pacific: {
      percentage: 70,
      limit: 5000,
      description:
        'Pacific Islands (Maldives etc.) - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
    },
    'antarctica micro grant zone': {
      percentage: 25,
      limit: 1500,
      description:
        'UI test region with a small percentage and limit to verify compact numeric metadata.',
    },
    'very long remote island research mobility region for table layout testing': {
      percentage: 95,
      limit: 12500,
      description:
        'UI test region with intentionally long text to verify description wrapping, row height, and table alignment.',
    },
  };

  private readonly DEFAULT_PROJECT_ACCOUNT_CODE_METADATA: Record<string, string> = {
    v29000: '6203/100',
    v29100: '6203/200',
    v29200: '6203/300',
    v29300: '6203/400',
    v29400: '6203/500',
    v29500: '6203/600',
    v29600: '6203/700',
    v29700: '6203/800',
    v29800: '6203/900',
    v29900: '6203/1000',
    v30000: '6203/1100',
    'ui-tiny': '6203/QA',
    'ui-account-code-with-extremely-long-label-for-wrapping-0001': '6203/QA-LONG-0001',
  };

  groups = signal<DropdownGroup[]>([
    {
      id: 1,
      title: 'RDIG Application',
      categories: [
        'Research Cluster',
        'Type of Organisation',
        'Research Domain',
        'Sub-Research Domain',
        'ESG',
        'SDG',
      ],
      items: 17,
      shared: 11,
    },
    {
      id: 2,
      title: 'RA/GRA Application',
      categories: ['Research Cluster', 'Programme Type', 'Supervisor Type', 'Funding Type'],
      items: 16,
      shared: 10,
    },
    {
      id: 3,
      title: 'Conference Application',
      categories: [
        'Select Region',
        'Project Account Code',
        'Vote Number Description',
        'Type of Organisation',
      ],
      items: 18,
      shared: 9,
    },
    {
      id: 4,
      title: 'Journal Application',
      categories: [
        'Project Account Code',
        'Vote Number Description',
        'Account Code Description',
        'Type of Organisation',
      ],
      items: 22,
      shared: 9,
    },
    {
      id: 5,
      title: 'Partnership Application',
      categories: ['Partnership Type', 'Partnership Category'],
      items: 2,
      shared: 0,
    },
  ]);

  dropdownOptions = signal<DropdownOption[]>([]);
  selectedGroupId = signal<number | null>(null);
  selectedCategory = signal<string>('');
  searchQuery = signal<string>('');
  statusFilter = signal<DropdownStatusFilter>('all');
  sortBy = signal<DropdownSortKey | null>(null);
  sortDirection = signal<SortDirection>(null);
  showAddModal = signal(false);
  editingOptionId = signal<number | null>(null);
  editingInitialPayload = signal<AddOptionPayload | null>(null);
  newOptionValue = signal<string>('');
  optionsPage = signal(1);
  optionsPageSize = signal(15);
  optionsPageSizeOptions = [5, 15, 30, 50];
  optionToDelete = signal<DropdownOption | null>(null);
  sharedFormsDialogData = signal<{ optionName: string; forms: string[] } | null>(null);

  tableColumns = computed<DataTableColumn[]>(() => {
    const dateColumnWidth = 'var(--size-table-column-amount)';
    const sharedColumnWidth = 'var(--size-table-column-timeline)';
    const includeSharedColumn = this.canShareSelectedCategory();
    const statusColumn: DataTableColumn = {
      key: 'status',
      label: 'Status',
      width: 'var(--size-table-column-actions)',
    };
    const dateColumn: DataTableColumn = {
      key: 'lastUpdated',
      label: 'Last Updated',
      width: dateColumnWidth,
      sortable: true,
    };
    const actionsColumn: DataTableColumn = {
      key: 'actions',
      label: 'Actions',
      width: '10rem',
      align: 'center',
      headerAlign: 'center',
    };
    const sequenceColumn: DataTableColumn = {
      key: 'sequence',
      label: 'No.',
      width: '64px',
      align: 'center',
    };

    if (this.isRegionMetadataCategory()) {
      return [
        sequenceColumn,
        { key: 'value', label: 'Region Name', sortable: true },
        { key: 'percentage', label: 'Percentage', width: 'var(--size-table-column-actions)' },
        { key: 'limit', label: 'Limit (RM)', width: dateColumnWidth },
        { key: 'description', label: 'Description' },
        statusColumn,
        dateColumn,
        actionsColumn,
      ];
    }

    if (this.isAccountCodeMetadataCategory()) {
      const isVoteNumberDescription = this.isConferenceVoteNumberDescriptionCategory();
      const isProjectAccountCode = this.isProjectAccountCodeCategory();
      return [
        sequenceColumn,
        {
          key: 'value',
          label: isVoteNumberDescription
            ? 'Vote Number Description'
            : isProjectAccountCode
              ? 'Project Account Code'
              : 'Option Name',
          sortable: true,
        },
        {
          key: 'accountNumber',
          width: dateColumnWidth,
          label: isVoteNumberDescription
            ? 'Vote Number'
            : isProjectAccountCode
              ? 'Account Code'
              : 'Account Number',
        },
        ...(includeSharedColumn && (isProjectAccountCode || isVoteNumberDescription)
          ? [
              {
                key: 'sharedWith',
                label: 'Shared With',
                width: sharedColumnWidth,
              } satisfies DataTableColumn,
            ]
          : []),
        statusColumn,
        dateColumn,
        actionsColumn,
      ];
    }

    if (this.isConferenceVoteNumberDescriptionCategory()) {
      return [
        sequenceColumn,
        { key: 'value', label: 'Vote Number Description', sortable: true },
        ...(includeSharedColumn
          ? [
              {
                key: 'sharedWith',
                label: 'Shared With',
                width: sharedColumnWidth,
              } satisfies DataTableColumn,
            ]
          : []),
        statusColumn,
        dateColumn,
        actionsColumn,
      ];
    }

    return [
      sequenceColumn,
      { key: 'value', label: 'Option Name', sortable: true },
      ...(includeSharedColumn
        ? [
            {
              key: 'sharedWith',
              label: 'Shared With',
              width: sharedColumnWidth,
            } satisfies DataTableColumn,
          ]
        : []),
      statusColumn,
      dateColumn,
      actionsColumn,
    ];
  });

  trackById: TrackByFunction<DropdownGroup> = (i, g) => g.id;
  trackByOptionId: TrackByFunction<DropdownOption> = (i, o) => o.id;

  selectedGroup = computed(
    () => this.groups().find((g) => g.id === this.selectedGroupId()) ?? null,
  );
  selectedGroupCategories = computed(() => this.selectedGroup()?.categories ?? []);
  canShareSelectedCategory(): boolean {
    const category = this.selectedCategory();
    const allowedForms = category ? this.CATEGORY_SHARING_CONFIG[category] : null;
    return !!allowedForms && allowedForms.length > 1;
  }
  shareableForms = computed(() => {
    const category = this.selectedCategory();
    if (!category) {
      return [] as string[];
    }

    // If the category is in the sharing config, return only those forms
    if (this.CATEGORY_SHARING_CONFIG[category]) {
      return this.CATEGORY_SHARING_CONFIG[category].filter((form) =>
        this.groups().some((g) => g.title === form),
      );
    }

    // Otherwise, no sharing is allowed (return only current form)
    const group = this.selectedGroup();
    return group ? [group.title] : [];
  });

  defaultSelectedForms = computed(() => {
    const group = this.selectedGroup();
    return group ? [group.title] : [];
  });

  isRegionMetadataCategory(): boolean {
    return (
      this.selectedGroup()?.title === 'Conference Application' &&
      this.selectedCategory() === 'Select Region'
    );
  }

  isAccountCodeMetadataCategory(): boolean {
    const groupTitle = this.selectedGroup()?.title;
    const category = this.selectedCategory();
    return (
      (groupTitle === 'Conference Application' && category === 'Select Item Description') ||
      (groupTitle === 'Journal Application' && category === 'Account Code') ||
      (['Conference Application', 'Journal Application'].includes(groupTitle ?? '') &&
        category === 'Project Account Code') ||
      (['Conference Application', 'Journal Application'].includes(groupTitle ?? '') &&
        category === 'Vote Number Description')
    );
  }

  getAccountNumberMetadataLabel(): string {
    if (this.isConferenceVoteNumberDescriptionCategory()) {
      return 'Vote Number';
    }

    return this.isProjectAccountCodeCategory() ? 'Account Code' : 'Account Number';
  }

  isConferenceVoteNumberDescriptionCategory(): boolean {
    return (
      ['Conference Application', 'Journal Application'].includes(
        this.selectedGroup()?.title ?? '',
      ) && this.selectedCategory() === 'Vote Number Description'
    );
  }

  isProjectAccountCodeCategory(): boolean {
    return (
      ['Conference Application', 'Journal Application'].includes(
        this.selectedGroup()?.title ?? '',
      ) && this.selectedCategory() === 'Project Account Code'
    );
  }

  getCategoryDisplayLabel(category: string): string {
    if (this.selectedGroup()?.title !== 'Conference Application') {
      return category;
    }

    if (category === 'Select Region') {
      return 'Region';
    }

    if (category === 'Select Item Description') {
      return 'Account Code';
    }

    return category;
  }

  getOptionNameInputLabel(): string {
    if (this.isConferenceVoteNumberDescriptionCategory()) {
      return 'Vote Number Description';
    }

    return this.isProjectAccountCodeCategory() ? 'Project Account Code' : 'Option Name';
  }

  getSearchPlaceholder(): string {
    if (this.isRegionMetadataCategory()) {
      return 'Search region name, percentage, limit, or description';
    }

    if (this.isConferenceVoteNumberDescriptionCategory()) {
      return 'Search vote number or description';
    }

    if (this.isProjectAccountCodeCategory()) {
      return 'Search project account code or account code';
    }

    if (this.isAccountCodeMetadataCategory()) {
      return 'Search option name or account number';
    }

    return `Search ${this.getOptionNameInputLabel().toLowerCase()}`;
  }

  // Computed list of categories with their counts for the currently selected group
  categoryCounts = computed(() => {
    const group = this.selectedGroup();
    if (!group) return [] as { name: string; count: number }[];
    const opts = this.dropdownOptions();
    return group.categories.map((cat) => ({
      name: cat,
      count: opts.filter((o) => o.formName === group.title && o.category === cat).length,
    }));
  });

  filteredOptions = computed<DropdownOptionView[]>(() => {
    // Only show options if a form AND category are explicitly selected
    if (!this.selectedGroupId() || !this.selectedCategory()) {
      return [];
    }

    // RDIG API-backed categories are served from the backend, not localStorage.
    if (this.isApiMode()) {
      return this.apiFilteredOptions();
    }

    let filtered = this.dropdownOptions();

    filtered = filtered.filter(
      (o) => o.formName === this.selectedGroup()?.title && o.category === this.selectedCategory(),
    );

    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((option) => this.optionMatchesSearch(option, query));
    }

    const status = this.statusFilter();
    if (status !== 'all') {
      const target = status === 'active' ? 'Active' : 'Inactive';
      filtered = filtered.filter((o) => o.status === target);
    }

    const sortKey = this.sortBy();
    const direction = this.sortDirection();
    if (sortKey && direction) {
      const dir = direction === 'asc' ? 1 : -1;
      filtered = [...filtered].sort((a, b) => this.compareOptions(a, b, sortKey) * dir);
    }

    return filtered.map((option) => {
      const regionMetadata = this.isRegionMetadataCategory()
        ? this.getRegionMetadata(option.value)
        : null;
      const accountCodeMetadata = this.isAccountCodeMetadataCategory()
        ? this.getAccountCodeMetadata(option.value, option.formName, option.category)
        : null;

      return {
        ...option,
        accountNumber: accountCodeMetadata?.accountNumber,
        percentage: regionMetadata?.percentage,
        limit: regionMetadata?.limit,
        description: regionMetadata?.description,
        sharedWith:
          this.isRegionMetadataCategory() ||
          (this.isAccountCodeMetadataCategory() &&
            !this.isProjectAccountCodeCategory() &&
            !this.isConferenceVoteNumberDescriptionCategory())
            ? []
            : this.getSharedWithForms(option),
      };
    });
  });

  paginatedOptions = computed(() => {
    const list = this.filteredOptions();

    // Server-paginated categories: the backend already returned exactly this
    // page's rows (per_page = optionsPageSize), so no further slicing needed.
    if (this.isApiMode() && this.isServerPaginated()) {
      return list;
    }

    const totalPages = this.optionsTotalPages();
    const currentPage = Math.min(this.optionsPage(), totalPages);
    const startIndex = (currentPage - 1) * this.optionsPageSize();
    return list.slice(startIndex, startIndex + this.optionsPageSize());
  });

  optionsTotalPages = computed(() => {
    if (this.isApiMode() && this.isServerPaginated()) {
      return Math.max(1, this.apiPagination()?.total_pages ?? 1);
    }
    return Math.max(1, Math.ceil(this.filteredOptions().length / this.optionsPageSize()));
  });

  optionsPageStart = computed(() => {
    if (this.isApiMode() && this.isServerPaginated()) {
      const total = this.apiPagination()?.total_items ?? 0;
      if (total === 0) return 0;
      return (this.optionsPage() - 1) * this.optionsPageSize() + 1;
    }
    const total = this.filteredOptions().length;
    if (total === 0) return 0;
    return (
      (Math.min(this.optionsPage(), this.optionsTotalPages()) - 1) * this.optionsPageSize() + 1
    );
  });

  optionsPageEnd = computed(() => {
    if (this.isApiMode() && this.isServerPaginated()) {
      const total = this.apiPagination()?.total_items ?? 0;
      if (total === 0) return 0;
      return Math.min(this.optionsPageStart() + this.optionsPageSize() - 1, total);
    }
    const total = this.filteredOptions().length;
    if (total === 0) return 0;
    return Math.min(this.optionsPageStart() + this.optionsPageSize() - 1, total);
  });

  ngOnInit(): void {
    this.loadOptionsFromStorage();
    this.route.queryParams.subscribe((params) => {
      const id = Number(params['group']);
      const explicitGroupId = !Number.isNaN(id) && id > 0 ? id : null;
      const isRdigRoute = this.route.snapshot.routeConfig?.path === 'rdig-dropdown-options';
      const rdigGroupId =
        this.groups().find((group) => group.title === 'RDIG Application')?.id ?? null;
      this.selectedGroupId.set(explicitGroupId ?? (isRdigRoute ? rdigGroupId : null));
      this.selectedCategory.set('');
      this.searchQuery.set('');
      this.statusFilter.set('all');
    });
  }

  selectCategory(category: string) {
    if (!this.selectedGroupCategories().includes(category)) {
      return;
    }

    this.selectedCategory.set(category);
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.optionsPage.set(1);
    this.apiRows.set([]);
    this.apiPagination.set(null);

    if (category === 'Sub-Research Domain') {
      // Nothing loads until the admin picks a domain — avoids fetching every
      // domain's sub-domains at once.
      this.selectedSubDomainParentId.set(null);
      this.loadSubDomainParentOptions();
      return;
    }

    if (this.isApiMode()) {
      this.loadApiCategory();
    }
  }

  /** Populates the "Research Domain" picker shown on the Sub-Research Domain tab. */
  private loadSubDomainParentOptions(): void {
    this.rdigService.adminListDomains({ per_page: 100, status: 'active' }).subscribe({
      next: (res) => {
        if (res.success) {
          this.subDomainParents.set(
            (res.data?.items ?? []).map((d) => ({ label: d.domain_name, value: String(d.id) })),
          );
        }
      },
      error: () => this.subDomainParents.set([]),
    });
  }

  /** Called when the admin picks (or changes) which domain's sub-domains to view. */
  onSubDomainParentSelected(domainIdStr: string | null): void {
    const id = domainIdStr ? Number(domainIdStr) : null;
    this.selectedSubDomainParentId.set(id);
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.optionsPage.set(1);
    if (id) {
      this.loadApiCategory();
    } else {
      this.apiRows.set([]);
      this.apiPagination.set(null);
    }
  }

  // ─── RDIG API-backed category support ─────────────────────────────────────

  private loadApiCategory(): void {
    if (!this.isApiMode()) {
      return;
    }
    if (this.selectedCategory() === 'Sub-Research Domain' && !this.selectedSubDomainParentId()) {
      // Nothing to load until a domain is chosen.
      this.apiRows.set([]);
      this.apiPagination.set(null);
      return;
    }
    this.apiLoading.set(true);
    this.apiListObservable().subscribe({
      next: ({ rows, pagination }) => {
        // If a mutation removed the last row on a page beyond page 1, step back
        // to the new last page instead of showing an empty table.
        if (pagination && pagination.total_pages > 0 && this.optionsPage() > pagination.total_pages) {
          this.optionsPage.set(pagination.total_pages);
          this.apiLoading.set(false);
          this.loadApiCategory();
          return;
        }
        this.apiRows.set(rows);
        this.apiPagination.set(pagination);
        this.apiLoading.set(false);
      },
      error: () => {
        this.apiRows.set([]);
        this.apiPagination.set(null);
        this.apiLoading.set(false);
        this.toast.error('Failed to load options from the server.');
      },
    });
  }

  private apiListObservable(): Observable<{ rows: ApiRow[]; pagination: AdminPagination | null }> {
    const category = this.selectedCategory();
    const params: AdminListParams = {
      page: this.optionsPage(),
      per_page: this.optionsPageSize(),
    };
    const query = this.searchQuery().trim();
    if (query) params.search = query;
    const status = this.statusFilter();
    if (status !== 'all') params.status = status;

    switch (category) {
      case 'Research Cluster':
        return this.rdigService.adminListClusters(params).pipe(
          map((r) => ({
            rows: (r.data?.items ?? []).map((c) => ({
              id: c.id,
              value: c.cluster_name,
              status: c.is_active ? ('Active' as const) : ('Inactive' as const),
            })),
            pagination: r.data?.pagination ?? null,
          })),
        );
      case 'Research Domain':
        return this.rdigService.adminListDomains(params).pipe(
          map((r) => ({
            rows: (r.data?.items ?? []).map((d) => ({
              id: d.id,
              value: d.domain_name,
              status: d.is_active ? ('Active' as const) : ('Inactive' as const),
            })),
            pagination: r.data?.pagination ?? null,
          })),
        );
      case 'Sub-Research Domain': {
        // Scoped to the domain the admin picked — a single paginated request,
        // no fan-out across every domain.
        const domainId = this.selectedSubDomainParentId();
        if (!domainId) {
          return of({ rows: [], pagination: null });
        }
        return this.rdigService.adminListSubDomains(domainId, params).pipe(
          map((r) => ({
            rows: (r.data?.items ?? []).map((sd) => ({
              id: sd.id,
              value: sd.sub_domain_name,
              status: sd.is_active ? ('Active' as const) : ('Inactive' as const),
              parentDomainId: sd.research_domain_id,
            })),
            pagination: r.data?.pagination ?? null,
          })),
        );
      }
      case 'ESG':
        return this.rdigService.adminListEsgs(params).pipe(
          map((r) => ({
            rows: (r.data?.items ?? []).map((e) => ({
              id: e.id,
              value: e.esg_name,
              status: e.is_active ? ('Active' as const) : ('Inactive' as const),
            })),
            pagination: r.data?.pagination ?? null,
          })),
        );
      case 'SDG':
        return this.rdigService.adminListSdgs(params).pipe(
          map((r) => ({
            rows: (r.data?.items ?? []).map((s) => ({
              id: s.id,
              value: s.sdg_name,
              status: s.is_active ? ('Active' as const) : ('Inactive' as const),
            })),
            pagination: r.data?.pagination ?? null,
          })),
        );
      default:
        return of({ rows: [], pagination: null });
    }
  }

  /** ESG/SDG only expose a name in the UI, but the API requires a code. Derive one from the name. */
  private deriveCode(name: string): string {
    return name.trim().slice(0, 50);
  }

  private showApiError(err: unknown): void {
    const message =
      (err as { error?: { message?: string } })?.error?.message ??
      'The action could not be completed. Please try again.';
    this.toast.error(message);
  }

  private apiFilteredOptions(): DropdownOptionView[] {
    const category = this.selectedCategory();
    const formName = this.selectedGroup()?.title ?? '';
    let rows = this.apiRows();

    // Server-paginated categories already had search/status applied by the
    // backend for the current page. Sub-Research Domain has no such endpoint,
    // so its full dataset is loaded up front and filtered here instead.
    if (!this.isServerPaginated()) {
      const query = this.searchQuery().trim().toLowerCase();
      if (query) {
        rows = rows.filter((r) => r.value.toLowerCase().includes(query));
      }

      const status = this.statusFilter();
      if (status !== 'all') {
        const target = status === 'active' ? 'Active' : 'Inactive';
        rows = rows.filter((r) => r.status === target);
      }
    }

    const sortKey = this.sortBy();
    const direction = this.sortDirection();
    if (sortKey && direction && sortKey !== 'lastUpdated') {
      const dir = direction === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const av = sortKey === 'status' ? a.status : a.value;
        const bv = sortKey === 'status' ? b.status : b.value;
        return av.localeCompare(bv) * dir;
      });
    }

    return rows.map((r) => ({
      id: r.id,
      formName,
      category,
      value: r.value,
      lastUpdated: '',
      createdBy: '',
      status: r.status,
      sharedWith: [],
      parentDomainId: r.parentDomainId,
    }));
  }

  onSearchQueryChange(value: string) {
    this.searchQuery.set(value);
    this.optionsPage.set(1);
    if (this.isApiMode() && this.isServerPaginated()) {
      this.loadApiCategory();
    }
  }

  onStatusFilterChange(value: DropdownStatusFilter) {
    this.statusFilter.set(value);
    this.optionsPage.set(1);
    if (this.isApiMode() && this.isServerPaginated()) {
      this.loadApiCategory();
    }
  }

  onOptionsPageChange(page: number) {
    this.optionsPage.set(page);
    if (this.isApiMode() && this.isServerPaginated()) {
      this.loadApiCategory();
    }
  }

  onOptionsPageSizeChange(pageSize: number) {
    this.optionsPageSize.set(pageSize);
    this.optionsPage.set(1);
    if (this.isApiMode() && this.isServerPaginated()) {
      this.loadApiCategory();
    }
  }

  /** Handles the search bar's "reset" action — clears filters and, for server-paginated categories, refetches page 1. */
  onResetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.optionsPage.set(1);
    if (this.isApiMode() && this.isServerPaginated()) {
      this.loadApiCategory();
    }
  }

  private loadOptionsFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Partial<DropdownOption>[];
        this.dropdownOptions.set(
          data.map((item) => ({
            id: item.id ?? 0,
            formName: item.formName ?? '',
            category: item.category ?? '',
            value: item.value ?? '',
            lastUpdated: this.normalizeDisplayDate(item.lastUpdated),
            createdBy: item.createdBy ?? 'Unknown',
            status: item.status === 'Inactive' ? 'Inactive' : 'Active',
          })),
        );
      } else {
        this.dropdownOptions.set(
          this.getDefaultOptions().map((item) => ({
            ...item,
            lastUpdated: this.normalizeDisplayDate(item.lastUpdated),
          })),
        );
      }

      const defaultOptionsAdded = this.ensureDefaultOptionsPresent();
      this.seedDefaultRegionMetadata();
      this.seedDefaultProjectAccountCodeMetadata();
      if (defaultOptionsAdded) {
        this.saveOptionsToStorage();
      }
    } catch (error) {
      console.error('Failed to load dropdown options from localStorage:', error);
      this.dropdownOptions.set(this.getDefaultOptions());
      this.seedDefaultRegionMetadata();
      this.seedDefaultProjectAccountCodeMetadata();
    }
  }

  private ensureDefaultOptionsPresent(): boolean {
    const existingKeys = new Set(
      this.dropdownOptions().map((option) => this.getOptionIdentityKey(option)),
    );
    let nextId = Math.max(...this.dropdownOptions().map((option) => option.id), 0) + 1;
    const missingOptions: DropdownOption[] = [];

    for (const option of this.getDefaultOptions()) {
      const key = this.getOptionIdentityKey(option);
      if (existingKeys.has(key)) {
        continue;
      }

      missingOptions.push({
        ...option,
        id: nextId++,
        lastUpdated: this.normalizeDisplayDate(option.lastUpdated),
      });
      existingKeys.add(key);
    }

    if (missingOptions.length === 0) {
      return false;
    }

    this.dropdownOptions.update((options) => [...options, ...missingOptions]);
    return true;
  }

  private getOptionIdentityKey(
    option: Pick<DropdownOption, 'formName' | 'category' | 'value'>,
  ): string {
    return [option.formName, option.category, option.value]
      .map((part) => part.trim().toLowerCase())
      .join('|');
  }

  private saveOptionsToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.dropdownOptions()));
      window.dispatchEvent(new CustomEvent('rmc-dropdowns-updated'));
    } catch (error) {
      console.error('Failed to save dropdown options to localStorage:', error);
    }
  }

  private getDefaultOptions(): DropdownOption[] {
    const baseOptions: DropdownOption[] = [
      {
        id: 1,
        formName: 'Conference Application',
        category: 'Select Region',
        value: 'Americas',
        lastUpdated: '15 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 2,
        formName: 'Conference Application',
        category: 'Select Region',
        value: 'ASEAN',
        lastUpdated: '15 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 3,
        formName: 'Conference Application',
        category: 'Select Region',
        value: 'Asia',
        lastUpdated: '15 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 4,
        formName: 'Conference Application',
        category: 'Select Region',
        value: 'Australasia',
        lastUpdated: '15 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 5,
        formName: 'Conference Application',
        category: 'Select Region',
        value: 'Europe',
        lastUpdated: '15 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 6,
        formName: 'Conference Application',
        category: 'Select Region',
        value: 'Malaysia',
        lastUpdated: '15 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 7,
        formName: 'Conference Application',
        category: 'Select Region',
        value: 'Middle East and Africa',
        lastUpdated: '15 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 8,
        formName: 'Conference Application',
        category: 'Select Region',
        value: 'Pacific Islands',
        lastUpdated: '15 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 9,
        formName: 'Conference Application',
        category: 'Select Item Description',
        value: 'Conference Fee',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 10,
        formName: 'Conference Application',
        category: 'Select Item Description',
        value: 'Travelling & Transportation',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 11,
        formName: 'Conference Application',
        category: 'Select Item Description',
        value: 'Airfare Local',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 12,
        formName: 'Conference Application',
        category: 'Select Item Description',
        value: 'Hotel & Lodging Local',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 13,
        formName: 'Conference Application',
        category: 'Select Item Description',
        value: 'Meals & Subsistence Local',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 14,
        formName: 'Conference Application',
        category: 'Select Item Description',
        value: 'Mileage Fares Parking Local',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 15,
        formName: 'Conference Application',
        category: 'Select Item Description',
        value: 'Staff Welfare and Refreshment',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 16,
        formName: 'Conference Application',
        category: 'Select Item Description',
        value: 'Telephone and Fax',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 17,
        formName: 'Conference Application',
        category: 'Select Item Description',
        value: 'Training Presentation Publication',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 18,
        formName: 'Conference Application',
        category: 'Type of Organisation',
        value: 'University',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 19,
        formName: 'Conference Application',
        category: 'Type of Organisation',
        value: 'Research Institute',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 20,
        formName: 'Conference Application',
        category: 'Type of Organisation',
        value: 'Company',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 21,
        formName: 'Conference Application',
        category: 'Type of Organisation',
        value: 'Government Agency',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 22,
        formName: 'Conference Application',
        category: 'Type of Organisation',
        value: 'Non-Profit Organization',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 23,
        formName: 'Conference Application',
        category: 'Type of Organisation',
        value: 'Other',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 24,
        formName: 'Conference Application',
        category: 'Staff Name',
        value: 'Vivian Banshee',
        lastUpdated: '22 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 25,
        formName: 'Conference Application',
        category: 'Staff Name',
        value: 'John Smith',
        lastUpdated: '22 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 26,
        formName: 'Conference Application',
        category: 'Staff Name',
        value: 'Sarah Johnson',
        lastUpdated: '22 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 27,
        formName: 'Conference Application',
        category: 'Staff Name',
        value: 'Michael Brown',
        lastUpdated: '22 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 28,
        formName: 'Conference Application',
        category: 'Staff Name',
        value: 'Emily Davis',
        lastUpdated: '22 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 29,
        formName: 'Conference Application',
        category: 'Staff Name',
        value: 'Robert Wilson',
        lastUpdated: '22 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 30,
        formName: 'Conference Application',
        category: 'Staff Name',
        value: 'Jessica Taylor',
        lastUpdated: '22 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 31,
        formName: 'Conference Application',
        category: 'Staff Name',
        value: 'James Anderson',
        lastUpdated: '22 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      // RDIG Application: copy Type of Organisation options from Conference (1-to-1)
      {
        id: 32,
        formName: 'RDIG Application',
        category: 'Type of Organisation',
        value: 'University',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 33,
        formName: 'RDIG Application',
        category: 'Type of Organisation',
        value: 'Research Institute',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 34,
        formName: 'RDIG Application',
        category: 'Type of Organisation',
        value: 'Company',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 35,
        formName: 'RDIG Application',
        category: 'Type of Organisation',
        value: 'Government Agency',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 36,
        formName: 'RDIG Application',
        category: 'Type of Organisation',
        value: 'Non-Profit Organization',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 37,
        formName: 'RDIG Application',
        category: 'Type of Organisation',
        value: 'Other',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 38,
        formName: 'Journal Application',
        category: 'Vote Number Description',
        value: 'VOTE NUMBER DESCRIPTION 01',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 39,
        formName: 'Journal Application',
        category: 'Vote Number Description',
        value: 'VOTE NUMBER DESCRIPTION 02',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 40,
        formName: 'Journal Application',
        category: 'Account Code',
        value: 'ACCOUNT CODE A',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 41,
        formName: 'Journal Application',
        category: 'Account Code',
        value: 'ACCOUNT CODE B',
        lastUpdated: '18 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 42,
        formName: 'Journal Application',
        category: 'Type of Organisation',
        value: 'University',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 43,
        formName: 'Journal Application',
        category: 'Type of Organisation',
        value: 'Research Institute',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 44,
        formName: 'Journal Application',
        category: 'Type of Organisation',
        value: 'Company',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 45,
        formName: 'Journal Application',
        category: 'Type of Organisation',
        value: 'Government Agency',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 46,
        formName: 'Journal Application',
        category: 'Type of Organisation',
        value: 'Non-Profit Organization',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 47,
        formName: 'Journal Application',
        category: 'Type of Organisation',
        value: 'Other',
        lastUpdated: '20 Apr 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 48,
        formName: 'Conference Application',
        category: 'Project Account Code',
        value: 'V29000',
        lastUpdated: '18 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 49,
        formName: 'Journal Application',
        category: 'Project Account Code',
        value: 'V29000',
        lastUpdated: '18 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 50,
        formName: 'Conference Application',
        category: 'Project Account Code',
        value: 'V29100',
        lastUpdated: '18 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 51,
        formName: 'Journal Application',
        category: 'Project Account Code',
        value: 'V29100',
        lastUpdated: '18 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 52,
        formName: 'Conference Application',
        category: 'Project Account Code',
        value: 'V29200',
        lastUpdated: '18 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 53,
        formName: 'Journal Application',
        category: 'Project Account Code',
        value: 'V29200',
        lastUpdated: '18 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 54,
        formName: 'Journal Application',
        category: 'Vote Number Description',
        value: 'Article Processing Charge',
        lastUpdated: '18 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 55,
        formName: 'Journal Application',
        category: 'Vote Number Description',
        value: 'Publication Fee',
        lastUpdated: '18 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 56,
        formName: 'Journal Application',
        category: 'Vote Number Description',
        value: 'Language Editing and Proofreading',
        lastUpdated: '18 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 57,
        formName: 'Journal Application',
        category: 'Account Code Description',
        value: 'Professional Services',
        lastUpdated: '18 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 58,
        formName: 'Journal Application',
        category: 'Account Code Description',
        value: 'Research Materials and Supplies',
        lastUpdated: '18 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 59,
        formName: 'Journal Application',
        category: 'Account Code Description',
        value: 'Printing and Publication',
        lastUpdated: '18 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 60,
        formName: 'Journal Application',
        category: 'Project Account Code',
        value: 'V29300',
        lastUpdated: '19 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 61,
        formName: 'Journal Application',
        category: 'Project Account Code',
        value: 'V29400',
        lastUpdated: '19 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 62,
        formName: 'Journal Application',
        category: 'Project Account Code',
        value: 'V29500',
        lastUpdated: '19 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 63,
        formName: 'Journal Application',
        category: 'Project Account Code',
        value: 'V29600',
        lastUpdated: '19 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 64,
        formName: 'Journal Application',
        category: 'Project Account Code',
        value: 'V29700',
        lastUpdated: '19 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 65,
        formName: 'Journal Application',
        category: 'Project Account Code',
        value: 'V29800',
        lastUpdated: '19 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 66,
        formName: 'Journal Application',
        category: 'Project Account Code',
        value: 'V29900',
        lastUpdated: '19 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
      {
        id: 67,
        formName: 'Journal Application',
        category: 'Project Account Code',
        value: 'V30000',
        lastUpdated: '19 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
    ];

    return [...baseOptions, ...this.getDropdownUiTestOptions()];
  }

  private getDropdownUiTestOptions(): DropdownOption[] {
    return [
      {
        id: 1001,
        formName: 'RDIG Application',
        category: 'Research Cluster',
        value: 'AI',
        lastUpdated: '01 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1002,
        formName: 'RA/GRA Application',
        category: 'Research Cluster',
        value: 'AI',
        lastUpdated: '02 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1003,
        formName: 'RDIG Application',
        category: 'Research Cluster',
        value: 'Interdisciplinary Climate Adaptation and Community Resilience Research Cluster',
        lastUpdated: '03 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1004,
        formName: 'RDIG Application',
        category: 'Research Cluster',
        value: 'Inactive Pair Visibility Cluster',
        lastUpdated: '04 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1005,
        formName: 'RA/GRA Application',
        category: 'Research Cluster',
        value: 'Inactive Pair Visibility Cluster',
        lastUpdated: '05 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1006,
        formName: 'RDIG Application',
        category: 'Type of Organisation',
        value: 'A',
        lastUpdated: '06 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1007,
        formName: 'Conference Application',
        category: 'Type of Organisation',
        value: 'A',
        lastUpdated: '07 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1008,
        formName: 'Journal Application',
        category: 'Type of Organisation',
        value: 'A',
        lastUpdated: '08 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1009,
        formName: 'RDIG Application',
        category: 'Type of Organisation',
        value: 'Government Innovation Lab With A Very Long Organisation Name For Wrapping Tests',
        lastUpdated: '09 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1010,
        formName: 'Conference Application',
        category: 'Type of Organisation',
        value: 'Government Innovation Lab With A Very Long Organisation Name For Wrapping Tests',
        lastUpdated: '10 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1011,
        formName: 'RDIG Application',
        category: 'Type of Organisation',
        value: 'Independent Micro Studio',
        lastUpdated: '11 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1012,
        formName: 'RDIG Application',
        category: 'Research Domain',
        value: 'IoT',
        lastUpdated: '12 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1013,
        formName: 'RDIG Application',
        category: 'Research Domain',
        value: 'Human-Centred Artificial Intelligence Governance and Ethics',
        lastUpdated: '13 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1014,
        formName: 'RDIG Application',
        category: 'Sub-Research Domain',
        value: 'XR',
        lastUpdated: '14 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1015,
        formName: 'RDIG Application',
        category: 'Sub-Research Domain',
        value: 'Privacy Preserving Federated Learning for Edge Healthcare Devices',
        lastUpdated: '15 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1016,
        formName: 'RDIG Application',
        category: 'ESG',
        value: 'E',
        lastUpdated: '16 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1017,
        formName: 'RDIG Application',
        category: 'ESG',
        value: 'Long Environmental Social Governance Label For Badge Width Testing',
        lastUpdated: '17 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1018,
        formName: 'RDIG Application',
        category: 'SDG',
        value: '1',
        lastUpdated: '18 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1019,
        formName: 'RDIG Application',
        category: 'SDG',
        value: 'SDG 17 Partnerships for the Goals With Extended Description',
        lastUpdated: '19 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1020,
        formName: 'RA/GRA Application',
        category: 'Programme Type',
        value: 'MSc',
        lastUpdated: '20 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1021,
        formName: 'RA/GRA Application',
        category: 'Programme Type',
        value: 'Doctor of Philosophy by Research With Industry Collaboration Track',
        lastUpdated: '21 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1022,
        formName: 'RA/GRA Application',
        category: 'Supervisor Type',
        value: 'Main',
        lastUpdated: '22 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1023,
        formName: 'RA/GRA Application',
        category: 'Supervisor Type',
        value: 'External Co-Supervisor From Partner Institution',
        lastUpdated: '23 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1024,
        formName: 'RA/GRA Application',
        category: 'Funding Type',
        value: 'Self',
        lastUpdated: '24 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1025,
        formName: 'RA/GRA Application',
        category: 'Funding Type',
        value: 'University-Industry Matched Scholarship With Long Sponsor Name',
        lastUpdated: '25 May 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1026,
        formName: 'Conference Application',
        category: 'Select Region',
        value: 'Antarctica Micro Grant Zone',
        lastUpdated: '26 May 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1027,
        formName: 'Conference Application',
        category: 'Select Region',
        value: 'Very Long Remote Island Research Mobility Region For Table Layout Testing',
        lastUpdated: '27 May 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1028,
        formName: 'Conference Application',
        category: 'Project Account Code',
        value: 'UI-TINY',
        lastUpdated: '28 May 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1029,
        formName: 'Journal Application',
        category: 'Project Account Code',
        value: 'UI-TINY',
        lastUpdated: '29 May 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1030,
        formName: 'Conference Application',
        category: 'Project Account Code',
        value: 'UI-ACCOUNT-CODE-WITH-EXTREMELY-LONG-LABEL-FOR-WRAPPING-0001',
        lastUpdated: '30 May 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1031,
        formName: 'Conference Application',
        category: 'Vote Number Description',
        value: 'APC',
        lastUpdated: '31 May 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1032,
        formName: 'Journal Application',
        category: 'Vote Number Description',
        value: 'APC',
        lastUpdated: '01 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1033,
        formName: 'Conference Application',
        category: 'Vote Number Description',
        value: 'International Keynote Travel Support With A Long Vote Description',
        lastUpdated: '02 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1034,
        formName: 'Journal Application',
        category: 'Account Code Description',
        value: 'Copyediting',
        lastUpdated: '03 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1035,
        formName: 'Journal Application',
        category: 'Account Code Description',
        value: 'Long Account Code Description For Indexing Publication Charges And Archival Fees',
        lastUpdated: '04 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1036,
        formName: 'Partnership Application',
        category: 'Partnership Type',
        value: 'MoU',
        lastUpdated: '05 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1037,
        formName: 'Partnership Application',
        category: 'Partnership Type',
        value: 'Strategic Research and Commercialisation Collaboration Agreement',
        lastUpdated: '06 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
      {
        id: 1038,
        formName: 'Partnership Application',
        category: 'Partnership Category',
        value: 'Industry',
        lastUpdated: '07 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Active',
      },
      {
        id: 1039,
        formName: 'Partnership Application',
        category: 'Partnership Category',
        value: 'International Multi-Campus Research Network With Extended Category Text',
        lastUpdated: '08 Jun 2026',
        createdBy: 'QA Seed',
        status: 'Inactive',
      },
    ];
  }

  openGroup(g: DropdownGroup) {
    // If RDIG group is clicked, open the dedicated RDIG dropdown management page
    if (g.title.toLowerCase().includes('rdig')) {
      this.router.navigate(['/admin-settings/rdig-dropdown-options'], {
        queryParams: { group: g.id },
      });
      return;
    }

    this.router.navigate([], { relativeTo: this.route, queryParams: { group: g.id } });
  }

  goBack() {
    const isRdigRoute = this.route.snapshot.routeConfig?.path === 'rdig-dropdown-options';
    if (isRdigRoute) {
      this.router.navigate(['/admin-settings/dropdowns']);
      return;
    }

    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  addOption() {
    if (this.isRegionMetadataCategory()) {
      return;
    }

    this.editingOptionId.set(null);
    this.editingInitialPayload.set(null);
    this.newOptionValue.set('');
    this.showAddModal.set(true);
  }

  /** Create/update an RDIG API-backed option via the backend, then reload the table. */
  private apiSave(payload: AddOptionPayload): void {
    const category = this.selectedCategory();
    const isActive = payload.status === 'Active';
    const name = payload.name.trim();
    const editId = this.editingOptionId();
    const parentDomainId = editId
      ? this.apiRows().find((r) => r.id === editId)?.parentDomainId
      : payload.parentDomainId ?? undefined;

    // Reassigning a sub-domain to a different Research Domain: the backend has
    // no "move" endpoint, so this is handled separately as delete + recreate.
    if (
      category === 'Sub-Research Domain' &&
      editId &&
      payload.parentDomainId &&
      payload.parentDomainId !== this.selectedSubDomainParentId()
    ) {
      this.moveSubDomainToNewDomain(editId, payload.parentDomainId, name, isActive);
      return;
    }

    let req: Observable<{ success: boolean; message?: string; data?: { id: number } }> | null =
      null;

    if (editId) {
      switch (category) {
        case 'Research Cluster':
          req = this.rdigService.adminUpdateCluster(editId, { cluster_name: name, is_active: isActive });
          break;
        case 'Research Domain':
          req = this.rdigService.adminUpdateDomain(editId, { domain_name: name, is_active: isActive });
          break;
        case 'Sub-Research Domain': {
          req = this.rdigService.adminUpdateSubDomain(editId, {
            sub_domain_name: name,
            is_active: isActive,
          });
          break;
        }
        case 'ESG':
          // Keep the existing code untouched on edit — only the name/status change.
          req = this.rdigService.adminUpdateEsg(editId, { esg_name: name, is_active: isActive });
          break;
        case 'SDG':
          req = this.rdigService.adminUpdateSdg(editId, { sdg_name: name, is_active: isActive });
          break;
      }
    } else {
      switch (category) {
        case 'Research Cluster':
          req = this.rdigService.adminCreateCluster({ cluster_name: name, is_active: isActive });
          break;
        case 'Research Domain':
          req = this.rdigService.adminCreateDomain({ domain_name: name, is_active: isActive });
          break;
        case 'Sub-Research Domain': {
          const parentId = this.selectedSubDomainParentId();
          if (!parentId) return;
          req = this.rdigService.adminCreateSubDomain(parentId, {
            sub_domain_name: name,
            is_active: isActive,
          });
          break;
        }
        case 'ESG':
          req = this.rdigService.adminCreateEsg({
            esg_code: this.deriveCode(name),
            esg_name: name,
            is_active: isActive,
          });
          break;
        case 'SDG':
          req = this.rdigService.adminCreateSdg({
            sdg_code: this.deriveCode(name),
            sdg_name: name,
            is_active: isActive,
          });
          break;
      }
    }

    if (!req) return;

    req.subscribe({
      next: (res) => {
        if (res && res.success === false) {
          this.toast.error(res.message ?? 'Save failed.');
          return;
        }

        if (this.isServerPaginated()) {
          // Re-fetch the current page so totals/page counts stay accurate.
          this.loadApiCategory();
        } else if (editId) {
          // Sub-Research Domain: all rows are already loaded — patch in place.
          this.apiRows.update((rows) =>
            rows.map((r) => (r.id === editId ? { ...r, value: name, status: payload.status } : r)),
          );
        } else {
          const newId = res?.data?.id;
          if (newId) {
            this.apiRows.update((rows) => [
              ...rows,
              { id: newId, value: name, status: payload.status, parentDomainId },
            ]);
          }
        }

        this.toast.success(editId ? 'Option updated.' : 'Option added.');
        this.closeModal();
      },
      error: (err) => this.showApiError(err),
    });
  }

  /**
   * The backend has no endpoint to reassign a sub-domain's parent domain — the
   * update route only accepts name/status. This works around that by deleting
   * the row under its old domain and recreating it under the new one.
   *
   * Safety: the delete happens first. If the backend rejects it (e.g. the
   * sub-domain is already referenced by a submitted RDIG application), nothing
   * is lost — the error surfaces and the original row stays untouched. The one
   * real risk is a failure between the two calls (e.g. a duplicate name in the
   * target domain, or a dropped connection): the old row would already be gone
   * without a replacement. That failure path shows an explicit warning so nothing
   * is lost silently.
   */
  private moveSubDomainToNewDomain(
    subDomainId: number,
    newDomainId: number,
    name: string,
    isActive: boolean,
  ): void {
    this.rdigService.adminDeleteSubDomain(subDomainId).subscribe({
      next: (deleteRes) => {
        if (deleteRes && deleteRes.success === false) {
          this.toast.error(deleteRes.message ?? 'Could not move this sub-domain.');
          return;
        }

        this.rdigService
          .adminCreateSubDomain(newDomainId, { sub_domain_name: name, is_active: isActive })
          .subscribe({
            next: (createRes) => {
              if (createRes && createRes.success === false) {
                this.toast.error(
                  `Removed from the old domain, but couldn't add it to the new one: ${createRes.message ?? 'unknown error'}. Please re-add "${name}" manually.`,
                );
                this.closeModal();
                this.loadApiCategory();
                return;
              }
              this.toast.success('Sub-domain moved to the new research domain.');
              this.closeModal();
              this.loadApiCategory();
            },
            error: () => {
              this.toast.error(
                `Removed from the old domain, but couldn't add it to the new one due to a network error. Please re-add "${name}" manually.`,
              );
              this.closeModal();
              this.loadApiCategory();
            },
          });
      },
      error: (err) => this.showApiError(err),
    });
  }

  onModalSave(payload: AddOptionPayload) {
    if (this.isApiMode()) {
      this.apiSave(payload);
      return;
    }

    const now = this.formatDisplayDate(new Date());
    const currentUserName = this.auth.currentUser()?.name ?? 'Unknown';

    if (this.editingOptionId()) {
      // update existing and propagate to shared forms
      const id = this.editingOptionId() as number;
      const original = this.dropdownOptions().find((o) => o.id === id);
      if (original) {
        const originalNorm = original.value.trim().toLowerCase();
        const category = original.category;

        const allowedSharedForms = this.CATEGORY_SHARING_CONFIG[category];

        // Entries that are part of the original shared group. Non-shared categories
        // stay scoped to the selected option, even if another form has the same value.
        const originalShared = this.dropdownOptions().filter((e) =>
          allowedSharedForms
            ? e.category === category &&
              e.value.trim().toLowerCase() === originalNorm &&
              allowedSharedForms.includes(e.formName)
            : e.id === original.id,
        );

        const desiredForms = allowedSharedForms
          ? payload.appliesTo && payload.appliesTo.length > 0
            ? payload.appliesTo
            : [original.formName]
          : [original.formName];

        // Build new list: update entries that should remain, remove those unselected
        let nextList = this.dropdownOptions().filter(
          (e) => !originalShared.some((os) => os.id === e.id),
        );

        // Keep/update entries for forms that were in originalShared and are still desired
        for (const os of originalShared) {
          if (desiredForms.includes(os.formName)) {
            nextList.push({
              ...os,
              value: payload.name.trim(),
              status: payload.status,
              lastUpdated: now,
              createdBy: currentUserName,
            });
          }
          // if not desired, we omit (effectively deleting from that form)
        }

        // Add entries for desired forms that did not previously exist in originalShared
        const existingForms = new Set(originalShared.map((s) => s.formName));
        let nextId = Math.max(...this.dropdownOptions().map((o) => o.id), 0) + 1;
        for (const formName of desiredForms) {
          if (!existingForms.has(formName)) {
            nextList.push({
              id: nextId++,
              formName,
              category: category,
              value: payload.name.trim(),
              lastUpdated: now,
              createdBy: currentUserName,
              status: payload.status,
            } as DropdownOption);
          }
        }

        this.dropdownOptions.set(nextList);
        this.saveRegionMetadataIfNeeded(payload.name.trim(), payload, original.value);
        this.saveAccountCodeMetadataIfNeeded(payload.name.trim(), payload, original.value);
      }
    } else {
      // add one option per selected form (shared across forms)
      const nextIdStart = Math.max(...this.dropdownOptions().map((o) => o.id), 0) + 1;
      let nextId = nextIdStart;
      const newEntries = payload.appliesTo.map(
        (formName) =>
          ({
            id: nextId++,
            formName,
            category: this.selectedCategory() || '',
            value: payload.name.trim(),
            lastUpdated: now,
            createdBy: currentUserName,
            status: payload.status,
          }) as DropdownOption,
      );

      this.dropdownOptions.update((list) => [...list, ...newEntries]);
      this.saveRegionMetadataIfNeeded(payload.name.trim(), payload);
      this.saveAccountCodeMetadataIfNeeded(payload.name.trim(), payload);
    }

    this.editingOptionId.set(null);
    this.newOptionValue.set('');
    this.showAddModal.set(false);
    this.saveOptionsToStorage();
  }

  editingInitial(): AddOptionPayload | null {
    const id = this.editingOptionId();
    if (!id) return null;
    const opt = this.dropdownOptions().find((o) => o.id === id);
    if (!opt) return null;
    const shared = this.getSharedWithForms(opt);
    const appliesTo = [opt.formName, ...shared.filter((s) => s !== opt.formName)];
    const regionMetadata = this.isRegionMetadataCategory()
      ? this.getRegionMetadata(opt.value)
      : null;
    const accountCodeMetadata = this.isAccountCodeMetadataCategory()
      ? this.getAccountCodeMetadata(opt.value, opt.formName, opt.category)
      : null;

    return {
      name: opt.value,
      status: opt.status,
      appliesTo,
      accountNumber: accountCodeMetadata?.accountNumber,
      percentage: regionMetadata?.percentage,
      limit: regionMetadata?.limit,
      description: regionMetadata?.description,
    };
  }

  saveOption(value: string) {
    if (!value.trim() || !this.selectedGroupId() || !this.selectedCategory()) {
      return;
    }

    const now = this.formatDisplayDate(new Date());
    const currentUserName = this.auth.currentUser()?.name ?? 'Unknown';
    const formName = this.selectedGroup()?.title ?? '';

    if (this.editingOptionId()) {
      // Update existing
      const id = this.editingOptionId() as number;
      this.dropdownOptions.update((list) =>
        list.map((o) =>
          o.id === id
            ? {
                ...o,
                value: value.trim(),
                lastUpdated: now,
                createdBy: currentUserName,
              }
            : o,
        ),
      );
    } else {
      // Add new
      const newOption: DropdownOption = {
        id: Math.max(...this.dropdownOptions().map((o) => o.id), 0) + 1,
        formName,
        category: this.selectedCategory(),
        value: value.trim(),
        lastUpdated: now,
        createdBy: currentUserName,
        status: 'Active',
      };
      this.dropdownOptions.update((options) => [...options, newOption]);
    }

    this.editingOptionId.set(null);
    this.newOptionValue.set('');
    this.showAddModal.set(false);
    this.saveOptionsToStorage();
  }

  toggleStatus(id: number) {
    if (this.isApiMode()) {
      this.apiToggleStatus(id);
      return;
    }

    this.dropdownOptions.update((list) =>
      list.map((o) => {
        if (o.id !== id) {
          return o;
        }

        const nextStatus: DropdownOption['status'] = o.status === 'Active' ? 'Inactive' : 'Active';
        return { ...o, status: nextStatus };
      }),
    );

    this.saveOptionsToStorage();
  }

  private apiToggleStatus(id: number): void {
    const row = this.apiRows().find((r) => r.id === id);
    if (!row) return;
    const isActive = row.status !== 'Active'; // toggled target
    const category = this.selectedCategory();

    let req: Observable<{ success: boolean; message?: string }> | null = null;
    switch (category) {
      case 'Research Cluster':
        req = this.rdigService.adminUpdateCluster(id, { is_active: isActive });
        break;
      case 'Research Domain':
        req = this.rdigService.adminUpdateDomain(id, { is_active: isActive });
        break;
      case 'Sub-Research Domain':
        req = this.rdigService.adminUpdateSubDomain(id, { is_active: isActive });
        break;
      case 'ESG':
        req = this.rdigService.adminUpdateEsg(id, { is_active: isActive });
        break;
      case 'SDG':
        req = this.rdigService.adminUpdateSdg(id, { is_active: isActive });
        break;
    }

    if (!req) return;
    req.subscribe({
      next: () => {
        if (this.isServerPaginated()) {
          // A status change can move the row off the current filtered/paged
          // view (e.g. status filter = Active), so re-fetch to stay accurate.
          this.loadApiCategory();
          return;
        }
        const nextStatus: 'Active' | 'Inactive' = isActive ? 'Active' : 'Inactive';
        this.apiRows.update((rows) =>
          rows.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)),
        );
      },
      error: (err) => this.showApiError(err),
    });
  }

  openDeleteDialog(id: number) {
    if (this.isApiMode()) {
      const row = this.apiRows().find((r) => r.id === id);
      if (row) {
        this.optionToDelete.set({
          id: row.id,
          formName: this.selectedGroup()?.title ?? '',
          category: this.selectedCategory(),
          value: row.value,
          lastUpdated: '',
          createdBy: '',
          status: row.status,
          parentDomainId: row.parentDomainId,
        });
      }
      return;
    }

    const option = this.dropdownOptions().find((o) => o.id === id);
    if (option) {
      this.optionToDelete.set(option);
    }
  }

  closeDeleteDialog() {
    this.optionToDelete.set(null);
  }

  confirmDelete() {
    const option = this.optionToDelete();
    if (!option) return;

    if (this.isApiMode()) {
      const category = this.selectedCategory();
      const id = option.id;
      let req: Observable<{ success: boolean; message?: string }> | null = null;
      switch (category) {
        case 'Research Cluster':
          req = this.rdigService.adminDeleteCluster(id);
          break;
        case 'Research Domain':
          req = this.rdigService.adminDeleteDomain(id);
          break;
        case 'Sub-Research Domain':
          req = this.rdigService.adminDeleteSubDomain(id);
          break;
        case 'ESG':
          req = this.rdigService.adminDeleteEsg(id);
          break;
        case 'SDG':
          req = this.rdigService.adminDeleteSdg(id);
          break;
      }
      this.optionToDelete.set(null);
      if (!req) return;
      req.subscribe({
        next: (res) => {
          if (res && res.success === false) {
            this.toast.error(res.message ?? 'Delete failed.');
            return;
          }
          if (this.isServerPaginated()) {
            // Re-fetch so totals/page counts (and last-page underflow) stay accurate.
            this.loadApiCategory();
          } else {
            this.apiRows.update((rows) => rows.filter((r) => r.id !== id));
          }
          this.toast.success('Option deleted.');
        },
        error: (err) => this.showApiError(err),
      });
      return;
    }

    this.dropdownOptions.update((list) => list.filter((o) => o.id !== option.id));
    this.saveOptionsToStorage();
    this.optionToDelete.set(null);
  }

  openSharedFormsDialog(optionName: string, forms: string[]) {
    this.sharedFormsDialogData.set({ optionName, forms });
  }

  closeSharedFormsDialog() {
    this.sharedFormsDialogData.set(null);
  }

  editOption(id: number) {
    if (this.isApiMode()) {
      const row = this.apiRows().find((r) => r.id === id);
      if (row) {
        this.newOptionValue.set(row.value);
        this.editingOptionId.set(id);
        this.editingInitialPayload.set({
          name: row.value,
          status: row.status,
          appliesTo: [],
          parentDomainId: row.parentDomainId ?? null,
        });
        this.showAddModal.set(true);
      }
      return;
    }

    const option = this.dropdownOptions().find((o) => o.id === id);
    if (option) {
      this.newOptionValue.set(option.value);
      this.editingOptionId.set(id);
      this.editingInitialPayload.set(this.editingInitial());
      this.showAddModal.set(true);
    }
  }

  closeModal() {
    this.showAddModal.set(false);
    this.editingOptionId.set(null);
    this.editingInitialPayload.set(null);
    this.newOptionValue.set('');
  }

  onSortChange(columnKey: string) {
    const next = nextTableSortState(
      { column: this.sortBy(), direction: this.sortDirection() },
      columnKey,
    );
    this.sortBy.set(next.column as DropdownSortKey | null);
    this.sortDirection.set(next.direction);
  }

  totalItems() {
    return this.dropdownOptions().length;
  }

  sharedWithLabel(option: DropdownOptionView): string {
    return option.sharedWith.length > 0 ? option.sharedWith.join(', ') : '-';
  }

  private getRegionMetadata(regionName: string): RegionMetadata {
    const stored = this.getStoredRegionMetadata(regionName);
    if (stored) {
      return stored;
    }

    const defaults = this.DEFAULT_REGION_METADATA[this.normalizeRegionKey(regionName)];
    return {
      createdDate: this.formatDisplayDate(new Date()),
      status: 'Active',
      percentage: defaults?.percentage,
      limit: defaults?.limit,
      description: defaults?.description,
    };
  }

  private getStoredRegionMetadata(regionName: string): RegionMetadata | null {
    for (const key of this.getRegionMetadataStorageKeys(regionName)) {
      const stored = localStorage.getItem(key);
      if (!stored) {
        continue;
      }

      try {
        return JSON.parse(stored) as RegionMetadata;
      } catch {
        return null;
      }
    }

    return null;
  }

  private getAccountCodeMetadata(
    optionName: string,
    formName: string = this.selectedGroup()?.title ?? '',
    category: string = this.selectedCategory(),
  ): AccountCodeMetadata {
    return (
      this.getStoredAccountCodeMetadata(optionName, formName, category) ?? {
        createdDate: this.formatDisplayDate(new Date()),
        status: 'Active',
      }
    );
  }

  private getStoredAccountCodeMetadata(
    optionName: string,
    formName: string,
    category: string,
  ): AccountCodeMetadata | null {
    for (const key of this.getAccountCodeMetadataStorageKeys(optionName, formName, category)) {
      const stored = localStorage.getItem(key);
      if (!stored) {
        continue;
      }

      try {
        return JSON.parse(stored) as AccountCodeMetadata;
      } catch {
        return null;
      }
    }

    return null;
  }

  private seedDefaultRegionMetadata(): void {
    const regionOptions = this.dropdownOptions().filter(
      (option) =>
        option.formName === 'Conference Application' && option.category === 'Select Region',
    );

    for (const option of regionOptions) {
      if (this.getStoredRegionMetadata(option.value)) {
        continue;
      }

      const defaults = this.DEFAULT_REGION_METADATA[this.normalizeRegionKey(option.value)];
      if (!defaults) {
        continue;
      }

      const metadata: RegionMetadata = {
        createdDate: option.lastUpdated || this.formatDisplayDate(new Date()),
        status: option.status,
        percentage: defaults.percentage,
        limit: defaults.limit,
        description: defaults.description,
      };

      for (const key of this.getRegionMetadataStorageKeys(option.value)) {
        localStorage.setItem(key, JSON.stringify(metadata));
      }
    }
  }

  private seedDefaultProjectAccountCodeMetadata(): void {
    const projectAccountCodeOptions = this.dropdownOptions().filter(
      (option) =>
        ['Conference Application', 'Journal Application'].includes(option.formName) &&
        option.category === 'Project Account Code',
    );

    for (const option of projectAccountCodeOptions) {
      if (this.getStoredAccountCodeMetadata(option.value, option.formName, option.category)) {
        continue;
      }

      const accountNumber =
        this.DEFAULT_PROJECT_ACCOUNT_CODE_METADATA[option.value.trim().toLowerCase()];
      if (!accountNumber) {
        continue;
      }

      const metadata: AccountCodeMetadata = {
        createdDate: option.lastUpdated || this.formatDisplayDate(new Date()),
        status: option.status,
        accountNumber,
      };

      for (const key of this.getAccountCodeMetadataStorageKeys(
        option.value,
        option.formName,
        option.category,
      )) {
        localStorage.setItem(key, JSON.stringify(metadata));
      }
    }
  }

  private saveRegionMetadataIfNeeded(
    regionName: string,
    payload: AddOptionPayload,
    previousRegionName?: string,
  ): void {
    if (!this.isRegionMetadataCategory()) {
      return;
    }

    const previousMetadata = previousRegionName ? this.getRegionMetadata(previousRegionName) : {};
    const metadata: RegionMetadata = {
      ...previousMetadata,
      status: payload.status,
      percentage: this.toNumberOrUndefined(payload.percentage),
      limit: this.toNumberOrUndefined(payload.limit),
      description: payload.description?.trim() || previousMetadata.description,
      createdDate: previousMetadata.createdDate || this.formatDisplayDate(new Date()),
    };

    for (const key of this.getRegionMetadataStorageKeys(regionName)) {
      localStorage.setItem(key, JSON.stringify(metadata));
    }
  }

  private saveAccountCodeMetadataIfNeeded(
    optionName: string,
    payload: AddOptionPayload,
    previousOptionName?: string,
  ): void {
    if (!this.isAccountCodeMetadataCategory()) {
      return;
    }

    const category = this.selectedCategory();
    const selectedFormName = this.selectedGroup()?.title ?? '';
    const targetFormNames =
      this.isProjectAccountCodeCategory() || this.isConferenceVoteNumberDescriptionCategory()
        ? payload.appliesTo
        : [selectedFormName];
    const previousMetadata = previousOptionName
      ? this.getAccountCodeMetadata(previousOptionName, selectedFormName, category)
      : {};
    const metadata: AccountCodeMetadata = {
      ...previousMetadata,
      status: payload.status,
      accountNumber: payload.accountNumber?.trim() || previousMetadata.accountNumber,
      createdDate: previousMetadata.createdDate || this.formatDisplayDate(new Date()),
    };

    for (const formName of targetFormNames) {
      for (const key of this.getAccountCodeMetadataStorageKeys(optionName, formName, category)) {
        localStorage.setItem(key, JSON.stringify(metadata));
      }
    }
  }

  private getRegionMetadataStorageKeys(regionName: string): string[] {
    const trimmed = regionName.trim();
    const normalized = this.normalizeRegionKey(trimmed);
    const slug = normalized.replace(/\s+/g, '-');

    return Array.from(
      new Set([
        `option-metadata-region-${trimmed}`,
        `option-metadata-region-${normalized}`,
        `option-metadata-region-${slug}`,
      ]),
    );
  }

  private getAccountCodeMetadataStorageKeys(
    optionName: string,
    formName: string,
    category: string,
  ): string[] {
    const trimmed = optionName.trim();
    const normalized = trimmed.toLowerCase();
    const slug = normalized.replace(/\s+/g, '-');
    const formSlug = formName.trim().toLowerCase().replace(/\s+/g, '-');
    const categorySlug = category.trim().toLowerCase().replace(/\s+/g, '-');

    const keys = [
      `option-metadata-account-code-${formSlug}-${categorySlug}-${trimmed}`,
      `option-metadata-account-code-${formSlug}-${categorySlug}-${normalized}`,
      `option-metadata-account-code-${formSlug}-${categorySlug}-${slug}`,
    ];

    if (formName === 'Conference Application' && category === 'Select Item Description') {
      keys.push(
        `option-metadata-account-code-${trimmed}`,
        `option-metadata-account-code-${normalized}`,
        `option-metadata-account-code-${slug}`,
      );
    }

    return Array.from(new Set(keys));
  }

  private normalizeRegionKey(regionName: string): string {
    return regionName.trim().toLowerCase();
  }

  private toNumberOrUndefined(value: number | string | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private optionMatchesSearch(option: DropdownOption, query: string): boolean {
    const searchableValues: Array<string | number | undefined> = [option.value];

    if (this.isRegionMetadataCategory()) {
      const metadata = this.getRegionMetadata(option.value);
      searchableValues.push(metadata.percentage, metadata.limit, metadata.description);
    }

    if (this.isAccountCodeMetadataCategory()) {
      const metadata = this.getAccountCodeMetadata(option.value, option.formName, option.category);
      searchableValues.push(metadata.accountNumber);
    }

    return searchableValues
      .filter((value): value is string | number => value !== undefined && value !== null)
      .some((value) => String(value).toLowerCase().includes(query));
  }

  private compareOptions(a: DropdownOption, b: DropdownOption, sortKey: DropdownSortKey): number {
    if (sortKey === 'lastUpdated') {
      return this.parseDisplayDate(a.lastUpdated) - this.parseDisplayDate(b.lastUpdated);
    }
    return a[sortKey].localeCompare(b[sortKey]);
  }

  private getSharedWithForms(option: DropdownOption): string[] {
    const normalizedValue = option.value.trim().toLowerCase();
    if (!normalizedValue) {
      return [];
    }

    // Get the forms allowed to share this category
    const allowedFormsForCategory = this.CATEGORY_SHARING_CONFIG[option.category];
    if (!allowedFormsForCategory) {
      // Category is not in the sharing config, so no sharing
      return [];
    }

    // Filter to only those forms that are allowed to share this category
    return Array.from(
      new Set(
        this.dropdownOptions()
          .filter(
            (other) =>
              other.id !== option.id &&
              other.category === option.category &&
              other.status === 'Active' &&
              other.value.trim().toLowerCase() === normalizedValue &&
              other.formName !== option.formName &&
              allowedFormsForCategory.includes(other.formName),
          )
          .map((other) => other.formName)
          .filter((formName) => formName.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }

  private formatDisplayDate(date: Date): string {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseDisplayDate(dateValue: string): number {
    const slashMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
    }

    const match = dateValue.match(/^(\d{2})\s([A-Za-z]{3})\s(\d{4})$/);
    if (match) {
      const monthLookup: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };
      const [, day, monthText, year] = match;
      const month = monthLookup[monthText];
      if (month !== undefined) {
        return new Date(Number(year), month, Number(day)).getTime();
      }
    }

    const isoParsed = new Date(dateValue).getTime();
    if (!Number.isNaN(isoParsed)) {
      return isoParsed;
    }

    return 0;
  }

  private normalizeDisplayDate(dateValue?: string): string {
    if (!dateValue) {
      return this.formatDisplayDate(new Date());
    }

    const timestamp = this.parseDisplayDate(dateValue);
    if (!timestamp) {
      return this.formatDisplayDate(new Date());
    }

    return this.formatDisplayDate(new Date(timestamp));
  }
}
