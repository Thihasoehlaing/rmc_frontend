import { ActionButtonComponent } from '../../shared/components/action-button/action-button.component';
import { SettingsPageHeaderComponent } from '../../shared/components/settings-ui/settings-ui.components';
import {
	ChangeDetectionStrategy,
	Component,
	TrackByFunction,
	computed,
	effect,
	signal,
	ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { DataTableColumn, DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { TableScrollHintComponent } from '../../shared/components/table-scroll-hint/table-scroll-hint.component';
import {
	SubmissionFormTab,
	SubmissionFormTabsComponent,
} from '../../shared/components/submission-form-tabs/submission-form-tabs.component';
import { SubmissionsSearchComponent } from '../../shared/components/submissions-search/submissions-search.component';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../../shared/components/step-indicator/step-indicator.component';
import { FormWizardNavComponent } from '../../shared/components/form-wizard-nav/form-wizard-nav.component';
import { ClaimExpensesComponent } from './components/Claim & Expenses/Claim & Expenses';
import { FinanceClaimDeclarationComponent } from './components/Declaration/Declaration';

type FinanceClaimTab = 'all' | 'conference' | 'journal' | 'rdig';
type FinanceClaimCategory = Exclude<FinanceClaimTab, 'all'>;

interface FinanceClaimRow {
	no: number;
	code: string;
	category: FinanceClaimCategory;
	formType: string;
	title: string;
	submittedDate: string;
	approvedDate: string;
	createdDate: string;
	estimatedExpenses: number;
}

@Component({
	selector: 'app-finance-claim-list',
	imports: [ActionButtonComponent,SettingsPageHeaderComponent,
		DataTableComponent,
		PaginationComponent,
		SubmissionFormTabsComponent,
		SubmissionsSearchComponent,
		TableScrollHintComponent,
		StepIndicatorComponent,
		FormWizardNavComponent,
		ClaimExpensesComponent,
		FinanceClaimDeclarationComponent,
	],
	templateUrl: './finance-claim-list.component.html',
	styleUrl: './finance-claim-list.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceClaimListComponent {
	@ViewChild(ClaimExpensesComponent) claimExpensesComponent?: ClaimExpensesComponent;
	@ViewChild(FinanceClaimDeclarationComponent) declarationComponent?: FinanceClaimDeclarationComponent;

	// View mode: 'list' or 'detail'
	readonly viewMode = signal<'list' | 'detail'>('list');
	readonly selectedClaim = signal<FinanceClaimRow | null>(null);

	// Stepper for detail view
	readonly steps: WizardStep[] = [
		{ label: 'Claim & Expenses', icon: 'receipt' },
		{ label: 'Declaration', icon: 'verified' },
	];
	readonly currentStep = signal(1);
	readonly totalSteps = 2;
	readonly submitAttempted = signal(false);
	readonly isSaving = signal(false);
	readonly isSubmitting = signal(false);
	readonly stepStatuses = signal<StepStatus[]>([
		{ visited: true, valid: true, missingFields: [] },
		{ visited: false, valid: false, missingFields: [] },
	]);
	readonly columns: readonly DataTableColumn[] = [
		{ key: 'no', label: 'No.', width: '72px' },
		{ key: 'code', label: 'Code', width: '150px' },
		{ key: 'formType', label: 'Form Type', width: '180px' },
		{ key: 'title', label: 'Title / Description', width: '320px' },
		{ key: 'approvedDate', label: 'Approved Date', width: '140px' },
		{ key: 'createdDate', label: 'Created Date', width: '140px' },
		{ key: 'estimatedExpenses', label: 'Est. Expenses (RM)', width: '170px', align: 'right' },
		{ key: 'actions', label: 'Actions', width: '128px', align: 'center', headerAlign: 'center' },
	];

	readonly tabs: readonly SubmissionFormTab[] = [
		{ value: 'all', label: 'All' },
		{ value: 'conference', label: 'Conference Application' },
		{ value: 'journal', label: 'Journal Publication' },
		{ value: 'rdig', label: 'RDIG Application' },
	];

	readonly pageSizeOptions: number[] = [5];

	readonly claims: readonly FinanceClaimRow[] = [
		{
			no: 1,
			code: 'CONF-2026-001',
			category: 'conference',
			formType: 'Conference Application',
			title: 'International Conference Travel Support',
			submittedDate: '2026-01-10',
			approvedDate: '2026-06-18',
			createdDate: '2026-06-20',
			estimatedExpenses: 3200,
		},
		{
			no: 2,
			code: 'JOUR-2026-003',
			category: 'journal',
			formType: 'Journal Publication',
			title: 'Open Access Publication Fee',
			submittedDate: '2026-01-12',
			approvedDate: '2026-06-23',
			createdDate: '2026-06-25',
			estimatedExpenses: 1500,
		},
		{
			no: 3,
			code: 'RDIG-2026-002',
			category: 'rdig',
			formType: 'RDIG Application',
			title: 'Research Data and Fieldwork Expenses',
			submittedDate: '2026-01-15',
			approvedDate: '2026-07-01',
			createdDate: '2026-07-02',
			estimatedExpenses: 4500,
		},
	];

	readonly selectedTab = signal<FinanceClaimTab>('all');
	readonly searchQuery = signal('');
	readonly currentPage = signal(1);
	readonly pageSize = signal(5);

	readonly filteredClaims = computed(() => {
		const selectedTab = this.selectedTab();
		const query = this.searchQuery().trim().toLowerCase();

		return this.claims.filter(claim => {
			const matchesTab = selectedTab === 'all' || claim.category === selectedTab;
			const matchesQuery =
				!query ||
				claim.code.toLowerCase().includes(query) ||
				claim.title.toLowerCase().includes(query);

			return matchesTab && matchesQuery;
		});
	});

	readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredClaims().length / this.pageSize())));

	readonly pagedClaims = computed(() => {
		const start = (this.currentPage() - 1) * this.pageSize();
		return this.filteredClaims().slice(start, start + this.pageSize());
	});

	readonly rowTrackFn: TrackByFunction<FinanceClaimRow> = (_index, row) => row.code;

	constructor(private router: Router) {
		effect(() => {
			const nextPage = Math.min(this.currentPage(), this.totalPages());

			if (nextPage !== this.currentPage()) {
				this.currentPage.set(nextPage);
			}
		});
	}

	onSearch(query: string): void {
		this.searchQuery.set(query.trim());
		this.currentPage.set(1);
	}

	setTab(value: string): void {
		this.selectedTab.set(value as FinanceClaimTab);
		this.currentPage.set(1);
	}

	resetFilters(): void {
		this.searchQuery.set('');
		this.selectedTab.set('all');
		this.currentPage.set(1);
	}

	onPageChange(page: number): void {
		this.currentPage.set(page);
	}

	onPageSizeChange(pageSize: number): void {
		this.pageSize.set(pageSize);
		this.currentPage.set(1);
	}

	onClaim(claim: FinanceClaimRow): void {
		this.selectedClaim.set(claim);
		this.viewMode.set('detail');
		this.currentStep.set(1);
		this.submitAttempted.set(false);
	}

	onBackToList(): void {
		this.viewMode.set('list');
		this.selectedClaim.set(null);
		this.currentStep.set(1);
	}

	onStepClick(step: number): void {
		this.currentStep.set(step);
		this.updateStepStatuses();
	}

	onPrev(): void {
		if (this.currentStep() > 1) {
			this.currentStep.set(this.currentStep() - 1);
		}
	}

	onNext(): void {
		if (this.currentStep() < this.totalSteps) {
			const statuses = this.stepStatuses();
			statuses[this.currentStep() - 1].visited = true;
			this.stepStatuses.set([...statuses]);

			this.currentStep.set(this.currentStep() + 1);

			statuses[this.currentStep() - 1].visited = true;
			this.stepStatuses.set([...statuses]);
		}
	}

	onSaveDraft(): void {
		this.isSaving.set(true);
		setTimeout(() => {
			this.isSaving.set(false);
			console.log('Draft saved');
		}, 1000);
	}

	onSubmit(): void {
		this.submitAttempted.set(true);
		
		if (this.claimExpensesComponent?.claimExpensesForm) {
			this.claimExpensesComponent.claimExpensesForm.markAllAsTouched();
		}
		if (this.declarationComponent?.declarationForm) {
			this.declarationComponent.declarationForm.markAllAsTouched();
		}

		const allValid = this.validateAllSteps();

		if (allValid) {
			this.isSubmitting.set(true);
			setTimeout(() => {
				this.isSubmitting.set(false);
				console.log('Form submitted');
				this.onBackToList();
			}, 2000);
		} else {
			const firstInvalidStep = this.stepStatuses().findIndex(status => !status.valid);
			if (firstInvalidStep !== -1) {
				this.currentStep.set(firstInvalidStep + 1);
			}
		}
	}

	private validateAllSteps(): boolean {
		const step1Valid = this.claimExpensesComponent?.claimExpensesForm?.valid ?? false;
		const step2Valid = this.declarationComponent?.declarationForm?.valid ?? false;

		const statuses = this.stepStatuses();
		statuses[0].valid = step1Valid;
		statuses[1].valid = step2Valid;
		this.stepStatuses.set([...statuses]);

		return step1Valid && step2Valid;
	}

	private updateStepStatuses(): void {
		const statuses = this.stepStatuses();
		statuses[this.currentStep() - 1].visited = true;
		this.stepStatuses.set([...statuses]);
	}

	onClaimExpensesValidityChange(valid: boolean): void {
		const statuses = this.stepStatuses();
		statuses[0].valid = valid;
		this.stepStatuses.set([...statuses]);
	}

	onDeclarationValidityChange(valid: boolean): void {
		const statuses = this.stepStatuses();
		statuses[1].valid = valid;
		this.stepStatuses.set([...statuses]);
	}

	formatDate(value: string): string {
		return new Intl.DateTimeFormat('en-MY', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(new Date(value));
	}

	formatCurrency(value: number): string {
		return `RM ${new Intl.NumberFormat('en-MY').format(value)}`;
	}
}
