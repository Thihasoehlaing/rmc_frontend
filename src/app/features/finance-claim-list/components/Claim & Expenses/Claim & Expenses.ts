import { ActionButtonComponent } from '../../../../shared/components/action-button/action-button.component';
import { InputDirective } from '../../../../shared/components/settings-ui/settings-ui.components';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import { Component, OnInit, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { DataTableColumn, DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { TableScrollHintComponent } from '../../../../shared/components/table-scroll-hint/table-scroll-hint.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';


interface ExpenseRow {
	category: string;
	description: string;
	date: string;
	amount: number;
	document?: string;
}

@Component({
	selector: 'app-claim-expenses',
	standalone: true,
	imports: [ActionButtonComponent,InputDirective,DatePickerComponent,DropdownComponent,
		CommonModule,
		ReactiveFormsModule,
		ValidationMessageComponent,
		DataTableComponent,
		TableScrollHintComponent,
		DialogComponent,
	],
	templateUrl: './Clain & Expenses.html',
	styleUrls: ['./Claim & Expenses.scss']
})
export class ClaimExpensesComponent implements OnInit {
  standardOptions0() { return [{value: '', label: 'Select category', disabled: true}, ...this.expenseCategories.map(category => ({value: String(category), label: (category)}))]; }
  standardOptions1() { return [{value: '', label: 'Select a bank', disabled: true}, {value: 'maybank', label: 'Maybank'}, {value: 'cimb', label: 'CIMB Bank'}, {value: 'public', label: 'Public Bank'}, {value: 'rhb', label: 'RHB Bank'}, {value: 'hongleong', label: 'Hong Leong Bank'}, {value: 'ambank', label: 'AmBank'}, {value: 'bsn', label: 'BSN'}, {value: 'alliance', label: 'Alliance Bank'}, {value: 'other', label: 'Other'}]; }
	private fb = inject(FormBuilder);

	@Output() formValidityChange = new EventEmitter<boolean>();

	claimExpensesForm!: FormGroup;
	expenseForm!: FormGroup;

	isExpenseModalOpen = signal(false);
	editingExpenseIndex = signal<number | null>(null);
	isDeleteConfirmOpen = signal(false);
	deleteExpenseIndex = signal<number | null>(null);
	selectedFileName = signal<string | null>(null);
	selectedFile = signal<File | null>(null);

	readonly originalExpenseColumns: readonly DataTableColumn[] = [
		{ key: 'no', label: '#', width: '60px', align: 'center', headerAlign: 'center' },
		{ key: 'category', label: 'Category', width: '180px', align: 'center', headerAlign: 'center' },
		{ key: 'description', label: 'Description', width: 'auto', align: 'center', headerAlign: 'center' },
		{ key: 'date', label: 'Date', width: '120px', align: 'center', headerAlign: 'center' },
		{ key: 'amount', label: 'Amount (RM)', width: '140px', align: 'center', headerAlign: 'center' },
		{ key: 'docs', label: 'Docs', width: '80px', align: 'center', headerAlign: 'center' },
	];

	readonly additionalExpenseColumns: readonly DataTableColumn[] = [
		{ key: 'no', label: '#', width: '60px', align: 'center', headerAlign: 'center' },
		{ key: 'category', label: 'Category', width: '180px', align: 'center', headerAlign: 'center' },
		{ key: 'description', label: 'Description', width: 'auto', align: 'center', headerAlign: 'center' },
		{ key: 'date', label: 'Date', width: '120px', align: 'center', headerAlign: 'center' },
		{ key: 'amount', label: 'Amount (RM)', width: '140px', align: 'center', headerAlign: 'center' },
		{ key: 'docs', label: 'Docs', width: '80px', align: 'center', headerAlign: 'center' },
		{ key: 'actions', label: 'Actions', width: '100px', align: 'center', headerAlign: 'center' },
	];

	readonly originalExpenses: readonly ExpenseRow[] = [
		{
			category: 'Registration Fee',
			description: 'Conference registration fee',
			date: '2026-01-10',
			amount: 800,
			document: 'registration-receipt.pdf'
		},
		{
			category: 'Airfare / Flight Ticket',
			description: 'Return flight KUL → destination',
			date: '2026-01-15',
			amount: 1200,
			document: 'flight-ticket.pdf'
		},
		{
			category: 'Accommodation',
			description: 'Hotel - 2 nights',
			date: '2026-01-16',
			amount: 600,
			document: 'hotel-invoice.pdf'
		},
	];

	readonly additionalExpenses = signal<ExpenseRow[]>([]);

	readonly expenseCategories = [
		'Registration Fee',
		'Airfare / Flight Ticket',
		'Accommodation',
		'Meals & Allowance',
		'Ground Transportation',
		'Visa & Travel Documentation',
		'Publication / Processing Fee',
		'Research Materials',
		'Others'
	];

	readonly claimInfo = {
		reference: 'CONF-2026-001',
		formType: 'Conference Application',
		title: 'International Conference on AI & Machine Learning 2026',
		approvedDate: '2026-01-18',
		applicantName: 'DARVEEN A/L SELVARAJAH',
		applicantEmail: 'darveen.selvarajah@apu.edu.my',
		schoolDepartment: 'School of Technology',
		bankName: 'Maybank',
		accountNumber: '1234567890',
		accountHolderName: 'DARVEEN A/L SELVARAJAH',
		advanceReceived: 750,
	};

	get isBankTransfer(): boolean {
		return this.claimExpensesForm?.get('paymentMethod')?.value === 'bank';
	}

	get originalExpensesTotal(): number {
		return this.originalExpenses.reduce((sum, exp) => sum + exp.amount, 0);
	}

	get additionalExpensesTotal(): number {
		return this.additionalExpenses().reduce((sum, exp) => sum + exp.amount, 0);
	}

	get totalExpenses(): number {
		return this.originalExpensesTotal + this.additionalExpensesTotal;
	}

	get balancePayable(): number {
		return this.totalExpenses - this.claimInfo.advanceReceived;
	}

	get costBorneByApplicant(): number {
		const balance = this.balancePayable;
		return balance < 0 ? Math.abs(balance) : 0;
	}

	ngOnInit(): void {
		this.claimExpensesForm = this.fb.group({
			applicantName: [{ value: this.claimInfo.applicantName, disabled: true }],
			applicantEmail: [{ value: this.claimInfo.applicantEmail, disabled: true }],
			schoolDepartment: [{ value: this.claimInfo.schoolDepartment, disabled: true }],
			paymentMethod: ['bank', [Validators.required]],
			bankName: [this.claimInfo.bankName, [Validators.required]],
			accountNumber: [
				this.claimInfo.accountNumber, 
				[
					Validators.required, 
					Validators.pattern(/^\d+$/),
					Validators.minLength(8),
					Validators.maxLength(20)
				]
			],
			accountHolderName: [
				this.claimInfo.accountHolderName, 
				[
					Validators.required,
					Validators.pattern(/^[A-Za-z\s\/]+$/),
					Validators.minLength(2),
					Validators.maxLength(100)
				]
			],
			remarks: ['', [Validators.maxLength(500)]],
		});

		// Initialize expense form
		this.expenseForm = this.fb.group({
			category: ['', [Validators.required]],
			description: [''],
			date: ['', [Validators.required]],
			amount: [null, [Validators.required, Validators.min(0.01)]],
			document: [null]
		});

		// Update bank field validators when payment method changes
		this.claimExpensesForm.get('paymentMethod')!.valueChanges.subscribe((method: string) => {
			const bankNameCtrl = this.claimExpensesForm.get('bankName')!;
			const accountNumberCtrl = this.claimExpensesForm.get('accountNumber')!;
			const accountHolderNameCtrl = this.claimExpensesForm.get('accountHolderName')!;

			if (method === 'bank') {
				bankNameCtrl.setValidators([Validators.required]);
				accountNumberCtrl.setValidators([
					Validators.required, 
					Validators.pattern(/^\d+$/),
					Validators.minLength(8),
					Validators.maxLength(20)
				]);
				accountHolderNameCtrl.setValidators([
					Validators.required,
					Validators.pattern(/^[A-Za-z\s\/]+$/),
					Validators.minLength(2),
					Validators.maxLength(100)
				]);
			} else {
				bankNameCtrl.clearValidators();
				accountNumberCtrl.clearValidators();
				accountHolderNameCtrl.clearValidators();
			}

			bankNameCtrl.updateValueAndValidity();
			accountNumberCtrl.updateValueAndValidity();
			accountHolderNameCtrl.updateValueAndValidity();
		});

		// Emit validity on every change
		this.claimExpensesForm.statusChanges.subscribe(() => {
			this.formValidityChange.emit(this.claimExpensesForm.valid);
		});

		// Emit initial validity
		this.formValidityChange.emit(this.claimExpensesForm.valid);
	}

	onAccountNumberInput(event: Event): void {
		const input = event.target as HTMLInputElement;
		const value = input.value;
		// Remove any non-numeric characters
		const numericValue = value.replace(/\D/g, '');
		if (value !== numericValue) {
			this.claimExpensesForm.get('accountNumber')?.setValue(numericValue, { emitEvent: false });
			input.value = numericValue;
		}
	}

	onAccountHolderInput(event: Event): void {
		const input = event.target as HTMLInputElement;
		const value = input.value;
		// Remove any characters that are not letters, spaces, or /
		const validValue = value.replace(/[^A-Za-z\s\/]/g, '');
		if (value !== validValue) {
			this.claimExpensesForm.get('accountHolderName')?.setValue(validValue, { emitEvent: false });
			input.value = validValue;
		}
	}

	formatDate(value: string): string {
		return new Intl.DateTimeFormat('en-MY', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(new Date(value));
	}

	formatCurrency(value: number): string {
		return `RM ${new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2 }).format(value)}`;
	}

	onAddExpense(): void {
		this.editingExpenseIndex.set(null);
		this.expenseForm.reset();
		this.selectedFileName.set(null);
		this.selectedFile.set(null);
		this.isExpenseModalOpen.set(true);
	}

	onEditExpense(index: number): void {
		const expense = this.additionalExpenses()[index];
		this.editingExpenseIndex.set(index);
		this.expenseForm.patchValue({
			category: expense.category,
			description: expense.description,
			date: expense.date,
			amount: expense.amount
		});
		if (expense.document) {
			this.selectedFileName.set(expense.document);
		}
		this.isExpenseModalOpen.set(true);
	}

	onDeleteExpense(index: number): void {
		this.deleteExpenseIndex.set(index);
		this.isDeleteConfirmOpen.set(true);
	}

	confirmDelete(): void {
		const index = this.deleteExpenseIndex();
		if (index !== null) {
			const currentExpenses = this.additionalExpenses();
			this.additionalExpenses.set(currentExpenses.filter((_, i) => i !== index));
		}
		this.closeDeleteConfirm();
	}

	closeDeleteConfirm(): void {
		this.isDeleteConfirmOpen.set(false);
		this.deleteExpenseIndex.set(null);
	}

	closeExpenseModal(): void {
		this.isExpenseModalOpen.set(false);
		this.editingExpenseIndex.set(null);
		this.expenseForm.reset();
		this.selectedFileName.set(null);
		this.selectedFile.set(null);
	}

	viewDocument(document: string): void {
		// In a real application, this would open/preview the uploaded file
		console.log('View document:', document);
		alert(`Viewing document: ${document}`);
	}

	viewOriginalExpenseDocument(document: string | undefined): void {
		if (document) {
			// In a real application, this would open/preview the document from the original application
			console.log('View original expense document:', document);
			alert(`Viewing document: ${document}`);
		}
	}

	get expenseModalTitle(): string {
		return this.editingExpenseIndex() !== null ? 'Edit Expense' : 'Add New Expense';
	}

	onFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			const file = input.files[0];
			this.selectedFile.set(file);
			this.selectedFileName.set(file.name);
			this.expenseForm.patchValue({ document: file.name });
		}
	}

	removeFile(): void {
		this.selectedFile.set(null);
		this.selectedFileName.set(null);
		this.expenseForm.patchValue({ document: null });
	}

	onAmountInput(event: Event): void {
		const input = event.target as HTMLInputElement;
		const value = input.value;
		// Remove any non-numeric characters except decimal point
		const numericValue = value.replace(/[^\d.]/g, '');
		if (value !== numericValue) {
			this.expenseForm.get('amount')?.setValue(numericValue ? parseFloat(numericValue) : null, { emitEvent: false });
			input.value = numericValue;
		}
	}

	saveExpense(): void {
		if (this.expenseForm.valid) {
			const formValue = this.expenseForm.getRawValue();
			const expense: ExpenseRow = {
				category: formValue.category,
				description: formValue.description || '',
				date: formValue.date,
				amount: parseFloat(formValue.amount),
				document: formValue.document
			};

			const editIndex = this.editingExpenseIndex();
			const currentExpenses = this.additionalExpenses();

			if (editIndex !== null) {
				// Update existing expense
				const updatedExpenses = [...currentExpenses];
				updatedExpenses[editIndex] = expense;
				this.additionalExpenses.set(updatedExpenses);
			} else {
				// Add new expense
				this.additionalExpenses.set([...currentExpenses, expense]);
			}

			// Close modal
			this.closeExpenseModal();
		}
	}
}
