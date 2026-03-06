# RMC Project UI System Guidelines

This document outlines the reusable UI components, global styling classes, and SCSS architecture used in the RMC project. Following these guidelines ensures consistency, maintainability, and rapid development.

---

## 🏗 SCSS Architecture & Design Tokens

Our styling system is built on a modular "Logic-first" architecture. This prevents CSS duplication and ensures that design changes are reflected globally with a single variable update.

### The 3-Layer System
1.  **$Variables (Logic Layer)**: Defined in `_colors.scss`, `_sizes.scss`, etc. These produce **zero CSS output**.
2.  **:root Mapping (Physical Layer)**: In `_root.scss`, SCSS variables are mapped to CSS custom properties (e.g., `--color-primary`).
3.  **Component Styles (Execution Layer)**: Components use `var(--token-name)` for styling and `@use` the logic layer for mixins.

### Why Tokens?
- **Consistency**: All spacing (8px scale), colors, and typography are unified.
- **Maintainability**: Update a theme in one place (`_colors.scss`) to change the entire app.
- **Performance**: Zero duplication of static values in emitted CSS.

---

## 🧩 Shared Angular Components

All shared components are located in `src/app/shared/components`. Always check here before creating a new UI element.

### 1. SearchableDropdown (`<app-searchable-dropdown>`)
- **Purpose**: Displays a list of options with a search bar. Supports single and multi-selection formats.
- **Selector**: `app-searchable-dropdown`
- **Example Usage**:
  ```html
  <app-searchable-dropdown 
    [options]="clusterOptions" 
    [isMulti]="false" 
    formControlName="researchCluster">
  </app-searchable-dropdown>
  ```

### CharacterCounterComponent
- **Purpose**: Real-time length validation display for textareas and inputs.
- **Selector**: `app-character-counter`
- **Example Usage**:
  ```html
  <textarea formControlName="roles" [maxlength]="600"></textarea>
  <app-character-counter [current]="roles.length" [max]="600"></app-character-counter>
  ```

### ValidationMessageComponent
- **Purpose**: Standardized error messaging. Automatically resolves messages from `AbstractControl` states.
- **Selector**: `app-validation-message`
- **Example Usage**:
  ```html
  <app-validation-message [control]="form.get('email')"></app-validation-message>
  ```
- **Why**: Standardizes complex selection logic and accessibility.

### 2. NoteComponent (`<app-note>`)
- **Purpose**: Displays warnings, tips, or hints. Supports both inline and **tooltip** variants. (Tooltip variant uses an `!` icon).
- **Example**:
```html
<!-- Inline -->
<app-note message="This action is irreversible."></app-note>

<!-- Tooltip -->
<div class="form-label">
  Username 
  <app-note message="Must be unique" [isTooltip]="true"></app-note>
</div>
```
- **Why**: Centralizes feedback aesthetics and tooltip behavior.

### 3. ValidationMessage (`<app-validation-message>`)
- **Purpose**: Displays error messages for form controls.
- **Example**:
```html
<app-validation-message [control]="profileForm.get('email')"></app-validation-message>
```
- **Why**: Standardizes error display logic and typography.

### 4. FormMainTitle (`<app-form-main-title>`)
- **Purpose**: Standardized H1 for forms with an optional help icon that opens guidelines.
- **Example**:
```html
<app-form-main-title 
  title="RDIG Grant Application"
  modalTitle="Applicant Guidelines"
  endpoint="/api/guidelines">
</app-form-main-title>
```

### 5. CustomHeader & Subheader
- **Purpose**: Standardized H2 and H3 styles with proper spacing.
- **Example**:
```html
<app-custom-header title="Section Overview"></app-custom-header>
<app-custom-subheader title="Technical Details"></app-custom-subheader>
```

### 6. FormWizardNav (`<app-form-wizard-nav>`)
- **Purpose**: Reusable multi-step form navigation footer with Previous / Next / Save as Draft / Submit buttons. Automatically shows/hides Previous and Submit based on the current step.
- **Selector**: `app-form-wizard-nav`
- **Location**: `src/app/shared/components/form-wizard-nav/`
- **Inputs**:
  | Input | Type | Description |
  | :--- | :--- | :--- |
  | `currentStep` | `number` | Active step (1-based) |
  | `totalSteps` | `number` | Total number of steps |
  | `isSaving` | `boolean` | Disables Save button and shows spinner |
  | `isSubmitting` | `boolean` | Disables Submit button and shows spinner |
- **Outputs**: `prev`, `next`, `saveDraft`, `submitForm` — all `EventEmitter<void>`
- **Example Usage**:
  ```html
  <app-form-wizard-nav
    [currentStep]="currentStep()"
    [totalSteps]="totalSteps"
    [isSaving]="isSaving()"
    [isSubmitting]="isSubmitting()"
    (prev)="onPrev()"
    (next)="onNext()"
    (saveDraft)="onSaveDraft()"
    (submitForm)="onSubmit()">
  </app-form-wizard-nav>
  ```

### 7. StepIndicator (`<app-step-indicator>`)
- **Purpose**: Visual multi-step progress bar with labelled icons. Renders complete / warning / active / pending states with animated connector lines.
- **Selector**: `app-step-indicator`
- **Location**: `src/app/shared/components/step-indicator/`
- **Interfaces**:
  ```typescript
  export interface WizardStep { label: string; icon: string; }
  // Step display state (driven by the parent component)
  type StepStatus = 'pending' | 'active' | 'complete' | 'warning';
  // 'warning' = visited but not fully valid; shown in amber
  ```
- **Inputs**:
  | Input | Type | Description |
  | :--- | :--- | :--- |
  | `steps` | `WizardStep[]` | Array of step objects |
  | `currentStep` | `number` | 1-based index of active step |
- **Example Usage**:
  ```html
  <app-step-indicator [steps]="steps" [currentStep]="currentStep()"></app-step-indicator>
  ```
  ```typescript
  steps: WizardStep[] = [
    { label: 'Team Details', icon: 'group' },
    { label: 'Project Details', icon: 'description' },
  ];
  ```

### 8. FormCommentPanel (`<app-form-comment-panel>`)
- **Purpose**: Reviewer comment accordion panel for 6 roles: HOS, RMC, Reviewer 1, Reviewer 2, RDIG Chair, and VC. Toggle-able with a single button. Read-only display of comments from an API response.
- **Selector**: `app-form-comment-panel`
- **Location**: `src/app/shared/components/form-comment-panel/`
- **Interface**:
  ```typescript
  export interface CommentItem { key: string; label: string; content?: string; }
  ```
- **Standard comment keys**: `hos_comment`, `rmc_comment`, `reviewer1_comment`, `reviewer2_comment`, `rdig_chair_comment`, `vc_comment`
- **Input**:
  | Input | Type | Description |
  | :--- | :--- | :--- |
  | `comments` | `CommentItem[]` | Array of comment items to display |
- **Example Usage**:
  ```html
  <app-form-comment-panel [comments]="reviewComments"></app-form-comment-panel>
  ```
  ```typescript
  reviewComments: CommentItem[] = [
    { key: 'hos_comment', label: 'HOS Comment', content: 'Approved by HOS.' },
    { key: 'rmc_comment', label: 'RMC Comment' },
  ];
  ```

---

## 🛠 Global SCSS Classes & Utilities

Use these utility classes to maintain vertical rhythm and structural consistency.

| Class | Purpose | Usage Example |
| :--- | :--- | :--- |
| `.form-field` | Flex wrapper for label + input | `<div class="form-field">...</div>` |
| `.form-label` | Standardized label style | `<label class="form-label">Name</label>` |
| `.form-label.is-required` | Required asterisk | auto-appended via CSS `::after` |
| `.form-hint` | Helper text below input | `<span class="form-hint">Max 300 chars</span>` |
| `.form-error-msg` | Validation error message | `<span class="form-error-msg">Required</span>` |
| `.form-counter` | Character counter (right-aligned) | `<div class="form-counter">{{n}}/300</div>` |
| `.keyword-counter` | Keyword count indicator | `<div class="keyword-counter">3/5 keywords</div>` |
| `.keyword-counter--over` | Keyword over-limit state | added to `.keyword-counter` when over |
| `.label-with-note` | Row with label + NoteComponent tooltip | `<div class="label-with-note"><label>...</label><app-note [isTooltip]="true"></app-note></div>` |
| `.input--text` | Base text input style | `<input type="text" class="input--text">` |
| `.input--select` | Styled select dropdown | `<select class="input--select">` |
| `.input--textarea` | Styled textarea | `<textarea class="input--textarea">` |
| `.btn` | Base button (layout only) | combine with variant class |
| `.btn-primary` | Main action button | `<button class="btn btn-primary">Save</button>` |
| `.btn-secondary` | Secondary action | `<button class="btn btn-secondary">Back</button>` |
| `.btn-success` | Confirm action | `<button class="btn btn-success">Submit</button>` |
| `.btn-warning` | Caution action | `<button class="btn btn-warning">Override</button>` |
| `.btn-ghost` | Subtle / tertiary | `<button class="btn btn-ghost">Cancel</button>` |
| `.btn-sm` | Compact button height | add to any `.btn` |
| `.badge` | Status badge base | combine with variant class |
| `.badge-success` | Approved / passed | `<span class="badge badge-success">Approved</span>` |
| `.badge-warning` | In progress / caution | `<span class="badge badge-warning">In Progress</span>` |
| `.badge-danger` | Rejected / failed | `<span class="badge badge-danger">Rejected</span>` |
| `.badge-info` | Under review | `<span class="badge badge-info">Reviewing</span>` |
| `.card` | Standard surface container | `<section class="card">...</section>` |
| `.card__header` | Card header row | with nested title |
| `.card__title` | Card heading | `<h2 class="card__title">` |
| `.card__content` | Card body padding | `<div class="card__content">` |
| `.section-fields` | Column stack of form fields | `<div class="section-fields">` |
| `.row--2` | 2-column form grid | `<div class="row--2">` |
| `.row--3` | 3-column form grid | `<div class="row--3">` |

---

## 💡 Best Practice Advice
1.  **Strict Gaps**: Always use `gap: var(--space-6)` for standard section spacing.
2.  **No Pixels**: Hardcoded values (e.g., `margin: 10px`) are forbidden. Use `var(--space-X)`. See `RULES.md` for allowed exceptions.
3.  **No `#fff`**: Use the CSS keyword `white` — never hex colors directly.
4.  **No local `.btn`/`.card` redefinition**: Use global classes. See `RULES.md §2`.
5.  **Check First**: Use the **Design System Showcase** (`src/assets/design-system.html`) to see all tokens, components, and global classes in action before building. Open it directly in a browser — no Angular build needed.
6.  **New tokens**: If you add a token to `_root.scss`, document it in both `_root.scss` (inline comment) and this file.

### Recently Added Tokens
| Token | Value | Added for |
| :--- | :--- | :--- |
| `--fs-3xl` | 2rem | Large KPI display numbers |
| `--color-text` | #000 (alias --color-label) | General body text |
| `--color-text-muted` | #6c757d | Secondary/muted text |
| `--color-primary-dark` | #1B6FE0 | Hover/focus darkened primary |
| `--border-nested` | #f0f0f0 (alias --border-subtle) | Nested container dividers |
