import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormGroup, FormsModule } from '@angular/forms';
import { SearchableDropdownComponent } from '../searchable-dropdown/searchable-dropdown.component';
import { FormMainTitleComponent } from '../form-main-title/form-main-title.component';
import { CustomHeaderComponent } from '../custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../custom-subheader/custom-subheader.component';
import { FieldNoteComponent } from '../field-note/field-note.component';
import { ValidationMessageComponent } from '../validation-message/validation-message.component';
import { CharacterCounterComponent } from '../character-counter/character-counter.component';
import { StepIndicatorComponent, WizardStep, StepStatus } from '../step-indicator/step-indicator.component';
import { FormWizardNavComponent } from '../form-wizard-nav/form-wizard-nav.component';
import { FormCommentPanelComponent, CommentItem } from '../form-comment-panel/form-comment-panel.component';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { DialogComponent } from '../dialog/dialog.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { DropdownOption } from '../../../interfaces/components.interface';

@Component({
  selector: 'app-showcase',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SearchableDropdownComponent,
    FormMainTitleComponent,
    CustomHeaderComponent,
    CustomSubheaderComponent,
    FieldNoteComponent,
    ValidationMessageComponent,
    CharacterCounterComponent,
    StepIndicatorComponent,
    FormWizardNavComponent,
    FormCommentPanelComponent,
    FileUploadComponent,
    DialogComponent,
    PaginationComponent,
  ],
  templateUrl: './showcase.html',
  styleUrl: './showcase.scss',
})
export class ShowcaseComponent {

  // ── SearchableDropdown demo ──────────────────────────────────
  fruits: DropdownOption[] = [
    { value: 'apple',      label: 'Apple' },
    { value: 'banana',     label: 'Banana' },
    { value: 'cherry',     label: 'Cherry', disabled: true },
    { value: 'date',       label: 'Date' },
    { value: 'elderberry', label: 'Elderberry' },
  ];

  dropdownForm = new FormGroup({
    single: new FormControl('apple'),
    multi:  new FormControl(['apple', 'banana']),
  });

  // ── CharacterCounter demo ────────────────────────────────────
  textareaVal = '';
  charMax = 200;
  get charCurrent() { return this.textareaVal.length; }

  // ── StepIndicator demo ───────────────────────────────────────
  demoSteps: WizardStep[] = [
    { label: 'Team Details',     icon: 'group' },
    { label: 'Project Details',  icon: 'description' },
    { label: 'Research Output',  icon: 'science' },
    { label: 'Budget',           icon: 'account_balance_wallet' },
    { label: 'Review',           icon: 'fact_check' },
  ];
  demoStatuses: StepStatus[] = [
    { visited: true,  valid: true,  missingFields: [] },
    { visited: true,  valid: false, missingFields: ['Project title', 'Abstract'] },
    { visited: false, valid: false, missingFields: [] },
    { visited: false, valid: false, missingFields: [] },
    { visited: false, valid: false, missingFields: [] },
  ];
  demoCurrentStep = signal(3);

  // ── FormWizardNav demo ───────────────────────────────────────
  navStep = signal(2);
  navTotal = 5;

  // ── FormCommentPanel demo ────────────────────────────────────
  demoComments: CommentItem[] = [
    { key: 'hos_comment',        label: 'HOS Comments',        content: 'The team composition looks adequate. Please clarify the PI\'s role in month 6.' },
    { key: 'rmc_comment',        label: 'RMC Comments',        content: 'Budget justification is missing for travel expenses.' },
    { key: 'reviewer1_comment',  label: 'Reviewer 1 Comments', content: undefined },
    { key: 'reviewer2_comment',  label: 'Reviewer 2 Comments', content: undefined },
    { key: 'rdig_chair_comment', label: 'RDIG Chair Comments', content: undefined },
    { key: 'vc_comment',         label: 'VC Comments',         content: undefined },
  ];

  // ── Header demo icon ─────────────────────────────────────────
  beakerIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 2v2h10V2H7zm10 4H7c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 12h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4H8v-2h2v2zm0-4H8v-2h2v2zm4-2h-2V8h2v2zm-4 0H8V8h2v2z"/></svg>`;

  // ── Dialog demo ─────────────────────────────────────────────
  showDialog = signal(false);

  // ── FileUpload demo ────────────────────────────────────────
  lastUploadedFile = signal<File | null>(null);
  onFileSelected(file: File | null): void {
    this.lastUploadedFile.set(file);
  }

  // ── Pagination demo ────────────────────────────────────────
  paginationCurrentPage = signal(1);
  paginationTotalPages = 47;
  paginationPageSize = signal(15);
  paginationPageSizeOptions = [5, 15, 30, 50];

  onPaginationPageChange(page: number): void {
    this.paginationCurrentPage.set(page);
  }

  onPaginationPageSizeChange(pageSize: number): void {
    this.paginationPageSize.set(pageSize);
    this.paginationCurrentPage.set(1); // Reset to first page
  }

  // ── Color token rows for table ───────────────────────────────
  colorTokens = [
    { token: '--color-primary',        value: '#2A83FF',              desc: 'Main brand — buttons, links, active states' },
    { token: '--color-primary-hover',  value: '#1B6FE0',              desc: 'Hover state for primary interactive elements' },
    { token: '--color-primary-light',  value: 'rgba(42,131,255,0.08)', desc: 'Tint background — chips, selected rows, active nav' },
    { token: '--color-primary-dark',   value: '#1B6FE0',              desc: 'Darker primary for focus emphasis' },
    { token: '--color-secondary',      value: '#16116C',              desc: 'Secondary brand — navy buttons' },
    { token: '--color-success',        value: '#28a745',              desc: 'Approved / passed states' },
    { token: '--color-success-light',  value: '#d4edda',              desc: 'Success badge background' },
    { token: '--color-success-dark',   value: '#1e7e34',              desc: 'Text on success backgrounds' },
    { token: '--color-warning',        value: '#ffc107',              desc: 'In-progress / caution states' },
    { token: '--color-warning-light',  value: '#fff3cd',              desc: 'Warning badge background' },
    { token: '--color-warning-dark',   value: '#d39e00',              desc: 'Text on warning backgrounds' },
    { token: '--color-error',          value: '#dc3545',              desc: 'Errors, validation failures, rejected' },
    { token: '--color-error-light',    value: '#f8d7da',              desc: 'Error badge background' },
    { token: '--color-error-dark',     value: '#bd2130',              desc: 'Text on error backgrounds' },
    { token: '--color-info',           value: '#17a2b8',              desc: 'Informational messages' },
    { token: '--color-info-light',     value: '#d1ecf1',              desc: 'Info badge background' },
    { token: '--color-info-dark',      value: '#117a8b',              desc: 'Text on info backgrounds' },
    { token: '--color-text',           value: '#000000',              desc: 'Default body text' },
    { token: '--color-text-muted',     value: '#6c757d',              desc: 'Secondary / helper text, micro-labels' },
    { token: '--color-letter-counter', value: '#adb5bd',              desc: 'Character counter and placeholder text' },
    { token: '--color-surface',        value: '#ffffff',              desc: 'Card and panel background' },
    { token: '--color-surface-hover',  value: '#f5f7fa',              desc: 'Hovered row or list item background' },
    { token: '--color-surface-nested', value: '#f9fafb',              desc: 'Nested section inside a card (card header)' },
    { token: '--border-default',       value: '#EEEEEE',              desc: 'Standard card and input border' },
    { token: '--border-subtle',        value: '#f0f0f0',              desc: 'Faint divider between page sections' },
    { token: '--border-hover',         value: '#adb5bd',              desc: 'Border color on interactive element hover' },
  ];

  spacingTokens = [
    { token: '--space-1',  px: '4px'  }, { token: '--space-2',  px: '8px'  },
    { token: '--space-3',  px: '12px' }, { token: '--space-4',  px: '16px' },
    { token: '--space-5',  px: '20px' }, { token: '--space-6',  px: '24px' },
    { token: '--space-7',  px: '32px' }, { token: '--space-8',  px: '40px' },
    { token: '--space-9',  px: '48px' }, { token: '--space-10', px: '56px' },
    { token: '--space-11', px: '64px' }, { token: '--space-12', px: '96px' },
  ];

  typeScale = [
    { token: '--fs-3xl', rem: '2rem',    demo: 'Display Heading',                  weight: '900' },
    { token: '--fs-2xl', rem: '1.75rem', demo: 'Section Heading',                  weight: '700' },
    { token: '--fs-xl',  rem: '1.5rem',  demo: 'Large Title',                      weight: '700' },
    { token: '--fs-lg',  rem: '1.25rem', demo: 'Sub-title / Card Heading',         weight: '600' },
    { token: '--fs-md',  rem: '1.125rem',demo: 'Emphasis Text',                    weight: '500' },
    { token: '--fs-base',rem: '1rem',    demo: 'Body Text — default reading size', weight: '400' },
    { token: '--fs-sm',  rem: '0.85rem', demo: 'Small Text — helper copy',         weight: '400' },
    { token: '--fs-xs',  rem: '0.75rem', demo: 'MICRO LABEL',                      weight: '900', uppercase: true },
  ];

  globalClasses = [
    { cls: '.btn',                 purpose: 'Base button — use with a variant class',              usage: '<button class="btn btn-primary">Save</button>' },
    { cls: '.btn-primary',         purpose: 'Primary CTA',                                         usage: 'class="btn btn-primary"' },
    { cls: '.btn-secondary',       purpose: 'Secondary action',                                    usage: 'class="btn btn-secondary"' },
    { cls: '.btn-success',         purpose: 'Confirm / submit action (green)',                     usage: 'class="btn btn-success"' },
    { cls: '.btn-warning',         purpose: 'Caution action (amber)',                              usage: 'class="btn btn-warning"' },
    { cls: '.btn-ghost',           purpose: 'Subtle / tertiary action',                           usage: 'class="btn btn-ghost"' },
    { cls: '.btn-sm',              purpose: 'Compact height variant — add to any .btn',           usage: 'class="btn btn-primary btn-sm"' },
    { cls: '.input--text',         purpose: 'Standard text input',                                usage: '<input class="input--text">' },
    { cls: '.input--select',       purpose: 'Styled native select with arrow icon',               usage: '<select class="input--select">' },
    { cls: '.input--textarea',     purpose: 'Multi-line textarea (min 120px, resizable)',         usage: '<textarea class="input--textarea">' },
    { cls: '.form-field',          purpose: 'Flex column wrapper — label + input + hint/error',  usage: '<div class="form-field">' },
    { cls: '.form-label',          purpose: 'Standardized label — semibold, fs-sm',              usage: '<label class="form-label">' },
    { cls: '.form-label.is-required', purpose: 'Appends red « * » asterisk via CSS ::after',    usage: 'class="form-label is-required"' },
    { cls: '.radio-group',         purpose: 'Shared flex wrapper for native radio options',       usage: '<div class="radio-group">...</div>' },
    { cls: '.radio-option',        purpose: 'Shared radio option style with checked/focus states', usage: '<label class="radio-option"><input type="radio"><span>Label</span></label>' },
    { cls: '.form-hint',           purpose: 'Helper text below an input',                        usage: '<span class="form-hint">' },
    { cls: '.form-error-msg',      purpose: 'Validation error message (red, fs-xs)',             usage: '<span class="form-error-msg">' },
    { cls: '.form-counter',        purpose: 'Character counter, right-aligned',                  usage: '<div class="form-counter">{{n}}/300</div>' },
    { cls: '.keyword-counter',     purpose: 'Keyword count indicator — muted text',              usage: '<div class="keyword-counter">3/5</div>' },
    { cls: '.keyword-counter--over', purpose: 'Over-limit state — red + bold',                  usage: 'add to .keyword-counter when over limit' },
    { cls: '.badge',               purpose: 'Status indicator base — use with variant',          usage: '<span class="badge badge-success">' },
    { cls: '.badge-success',       purpose: 'Green — Approved',                                  usage: 'class="badge badge-success"' },
    { cls: '.badge-warning',       purpose: 'Amber — In Progress',                               usage: 'class="badge badge-warning"' },
    { cls: '.badge-danger',        purpose: 'Red — Rejected',                                    usage: 'class="badge badge-danger"' },
    { cls: '.badge-info',          purpose: 'Blue — Under Review',                               usage: 'class="badge badge-info"' },
    { cls: '.badge--success',      purpose: 'Alternative success modifier style',                 usage: 'class="badge badge--success"' },
    { cls: '.badge--danger',       purpose: 'Alternative danger modifier style',                  usage: 'class="badge badge--danger"' },
    { cls: '.card',                purpose: 'Surface container — surface bg, radius-lg, border', usage: '<div class="card">' },
    { cls: '.card__header',        purpose: 'Card header row — nested bg, bottom border',        usage: '<div class="card__header">' },
    { cls: '.card__title',         purpose: 'Card heading — fw-bold, color-heading',             usage: '<h2 class="card__title">' },
    { cls: '.card__content',       purpose: 'Card body with space-5 padding',                   usage: '<div class="card__content">' },
    { cls: '.section-fields',      purpose: 'Vertical stack of form fields (space-5 gap)',       usage: '<div class="section-fields">' },
    { cls: '.row--2',              purpose: '2-column form grid (1fr 1fr, space-5 gap)',         usage: '<div class="row--2">' },
    { cls: '.row--3',              purpose: '3-column form grid (1fr 1fr 1fr, space-5 gap)',     usage: '<div class="row--3">' },
    { cls: '.btn-primary-pill',    purpose: 'Rounded primary action button variant',              usage: 'class="btn-primary-pill"' },
    { cls: '.btn-secondary-pill',  purpose: 'Rounded secondary action button variant',            usage: 'class="btn-secondary-pill"' },
    { cls: '.btn-danger-pill',     purpose: 'Rounded danger action button variant',               usage: 'class="btn-danger-pill"' },
    { cls: '.btn-large',           purpose: 'Fixed large button size helper',                     usage: 'class="btn btn-primary btn-large"' },
    { cls: '.btn-list',            purpose: 'Fixed list action button size helper',               usage: 'class="btn btn-secondary btn-list"' },
    { cls: '.btn-icon',            purpose: 'Icon-only action button base',                       usage: '<button class="btn-icon"><span class="material-icons">edit</span></button>' },
    { cls: '.btn-icon--edit',      purpose: 'Edit icon button accent modifier',                   usage: 'class="btn-icon btn-icon--edit"' },
    { cls: '.btn-icon--delete',    purpose: 'Delete icon button accent modifier',                 usage: 'class="btn-icon btn-icon--delete"' },
  ];

  sharedComponentRegistry = [
    { name: 'ActionButton', selector: '<app-action-button>', purpose: 'Pill action button wrapper for primary/secondary/danger variants.' },
    { name: 'CharacterCounter', selector: '<app-character-counter>', purpose: 'Character count helper for inputs and textareas.' },
    { name: 'CustomHeader', selector: '<app-custom-header>', purpose: 'Standard section header with optional icon.' },
    { name: 'CustomSubheader', selector: '<app-custom-subheader>', purpose: 'Standard subsection header with optional field note.' },
    { name: 'DataTable', selector: '<app-data-table>', purpose: 'Reusable typed table with optional custom row template.' },
    { name: 'Dialog', selector: '<app-dialog>', purpose: 'Reusable modal wrapper with projected body and footer slots.' },
    { name: 'FileUpload', selector: '<app-file-upload>', purpose: 'Validated drag/drop or click file upload field.' },
    { name: 'FieldNote', selector: '<app-field-note>', purpose: 'Field-level helper note block with projected text.' },
    { name: 'FormCommentPanel', selector: '<app-form-comment-panel>', purpose: 'Accordion panel for reviewer comments.' },
    { name: 'FormMainTitle', selector: '<app-form-main-title>', purpose: 'Page title with guidelines modal trigger.' },
    { name: 'FormWizardNav', selector: '<app-form-wizard-nav>', purpose: 'Form step navigation footer with save/submit actions.' },
    { name: 'GuidelinesModal', selector: '<app-guidelines-modal>', purpose: 'Guidelines modal that fetches remote HTML content.' },
    { name: 'Pagination', selector: '<app-pagination>', purpose: 'Page navigation with adjustable items-per-page selector.' },
    { name: 'SearchableDropdown', selector: '<app-searchable-dropdown>', purpose: 'Single/multi select dropdown with search and chips.' },
    { name: 'StepIndicator', selector: '<app-step-indicator>', purpose: 'Clickable step progress indicator with status states.' },
    { name: 'ValidationMessage', selector: '<app-validation-message>', purpose: 'Consistent reactive form validation error renderer.' },
  ];

  sharedComponents = [
    {
      name: 'SearchableDropdown',
      selector: '<app-searchable-dropdown>',
      purpose: 'Dropdown with search. Supports single and multi-select (chip display). Implements ControlValueAccessor — works directly with Angular reactive forms.',
      inputs: [
        { name: 'options',       type: 'DropdownOption[]', desc: 'Array of { value, label, disabled? }' },
        { name: 'label',         type: 'string',           desc: 'Label shown above the trigger' },
        { name: 'placeholder',   type: 'string',           desc: 'Placeholder when nothing is selected' },
        { name: 'isMulti',       type: 'boolean',          desc: 'Enable multi-selection (chip mode). Default: false' },
        { name: 'formControl',   type: 'FormControl',      desc: 'Bind via [formControl] or formControlName' },
      ]
    },
    {
      name: 'FieldNoteComponent',
      selector: '<app-field-note>',
      purpose: 'Displays a compact note directly under a field. The component owns only the design; each usage provides its own sentence as projected content.',
      inputs: [
        { name: 'projected content', type: 'ng-content', desc: 'Field-specific note text placed between the opening and closing tags' },
      ]
    },
    {
      name: 'ValidationMessage',
      selector: '<app-validation-message>',
      purpose: 'Standardized error message display. Reads directly from a reactive FormControl to auto-resolve messages, or accepts a manual string.',
      inputs: [
        { name: 'control', type: 'AbstractControl', desc: 'Reactive form control — auto-resolves required, email, maxlength, etc.' },
        { name: 'message', type: 'string',           desc: 'Override: display a fixed message regardless of control state' },
      ]
    },
    {
      name: 'CharacterCounter',
      selector: '<app-character-counter>',
      purpose: 'Character count display for textareas and inputs. Turns red when the limit is reached.',
      inputs: [
        { name: 'current', type: 'number', desc: 'Current character count (bind to control.value.length)' },
        { name: 'max',     type: 'number', desc: 'Maximum allowed characters' },
      ]
    },
    {
      name: 'StepIndicator',
      selector: '<app-step-indicator>',
      purpose: 'Multi-step progress bar with Material icons and labelled connector lines. Shows complete (green), warning (amber — visited but invalid), active (blue), and pending states. Steps are clickable.',
      inputs: [
        { name: 'steps',        type: 'WizardStep[]',  desc: '[ { label, icon } ] — icon is a Material Icons name' },
        { name: 'currentStep',  type: 'number',        desc: '1-based index of the active step' },
        { name: 'stepStatuses', type: 'StepStatus[]',  desc: '[ { visited, valid, missingFields[] } ] — drives color state' },
      ],
      outputs: [
        { name: 'stepClick', desc: 'Emits 1-based step number when user clicks a step bubble' },
      ]
    },
    {
      name: 'FormWizardNav',
      selector: '<app-form-wizard-nav>',
      purpose: 'Multi-step navigation footer. Automatically shows/hides Previous (step > 1) and Submit (last step only). Supports loading spinners on Save and Submit.',
      inputs: [
        { name: 'currentStep',   type: 'number',  desc: '1-based active step index' },
        { name: 'totalSteps',    type: 'number',  desc: 'Total number of steps' },
        { name: 'isSaving',      type: 'boolean', desc: 'Disables Save Draft, shows spinner' },
        { name: 'isSubmitting',  type: 'boolean', desc: 'Disables Submit, shows spinner' },
      ],
      outputs: [
        { name: 'prev',       desc: 'Go to previous step' },
        { name: 'next',       desc: 'Go to next step' },
        { name: 'saveDraft',  desc: 'Save draft' },
        { name: 'submitForm', desc: 'Final submit' },
      ]
    },
    {
      name: 'FormCommentPanel',
      selector: '<app-form-comment-panel>',
      purpose: 'Reviewer comment accordion for the 6 standard reviewer roles. Each role is shown as a toggle button. Clicking reveals the comment or a "no comment" message. Has a Toggle All button.',
      inputs: [
        { name: 'comments', type: 'CommentItem[]', desc: '[ { key, label, content? } ] — standard keys: hos_comment, rmc_comment, reviewer1_comment, reviewer2_comment, rdig_chair_comment, vc_comment' },
      ]
    },
    {
      name: 'FormMainTitle',
      selector: '<app-form-main-title>',
      purpose: 'Standardized H1 page title for all form views. Includes a help icon button that opens a guidelines modal.',
      inputs: [
        { name: 'title',       type: 'string', desc: 'Page heading text' },
        { name: 'modalTitle',  type: 'string', desc: 'Title shown inside the guidelines modal' },
        { name: 'endpoint',    type: 'string', desc: 'API endpoint to fetch guidelines content' },
      ]
    },
    {
      name: 'CustomHeader',
      selector: '<app-custom-header>',
      purpose: 'Standardized H2 section heading with an optional SVG icon to the left.',
      inputs: [
        { name: 'title',   type: 'string', desc: 'Section heading text' },
        { name: 'iconSvg', type: 'string', desc: 'Raw SVG string rendered as an icon. Optional.' },
        { name: 'icon',    type: 'string', desc: 'Material Icons name as alternative to iconSvg. Optional.' },
      ]
    },
    {
      name: 'CustomSubheader',
      selector: '<app-custom-subheader>',
      purpose: 'Standardized H3 sub-section heading with optional icon and field note.',
      inputs: [
        { name: 'title',   type: 'string', desc: 'Sub-section heading text' },
        { name: 'iconSvg', type: 'string', desc: 'Raw SVG string icon. Optional.' },
        { name: 'icon',    type: 'string', desc: 'Material Icons name. Optional.' },
        { name: 'tooltip', type: 'string', desc: 'Optional helper text shown beside the heading.' },
      ]
    },
  ];
}
