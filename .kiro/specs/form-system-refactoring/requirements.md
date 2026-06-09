# Requirements Document

## Introduction

This document covers the requirements for the Form System Refactoring & Enhancements of the RMC frontend Angular application. The changes span three areas:

1. **Global form and component adjustments** — UI token enforcement and repositioning of the shared `NoteComponent` so it renders inline beneath its associated form field.
2. **Drafts page updates** — removal of the "Batch" column from the drafts table and decoupling of submission-window validation from the Drafts page entirely (moving the batch/window guard to the RDIG application only).
3. **RDIG form updates** — visual clean-up (gear icon removal, box-sizing uniformity in the Grant Utilisation section, checkbox colour correction), and a new dynamic helper message beneath the Research Activities empty state that reacts to the selected Project Duration value.

---

## Glossary

- **Application**: A form submission saved or submitted by a user (e.g. RDIG, Conference, Journal).
- **Batch**: An `active`-status `BatchSitting` record managed by RMC that defines the open submission window (start date / end date).
- **BatchSitting**: The data model persisted via `BatchSittingService`; has `id`, `batchName`, `startDate`, `endDate`, and `status` fields.
- **Closed Window**: The state when no `BatchSitting` with `status === 'active'` exists, or when today's date falls outside an active batch's `startDate`–`endDate` range.
- **Design Token**: A CSS custom property declared in `_root.scss` (e.g. `var(--space-6)`, `var(--color-primary)`).
- **Draft**: An `Application` record where `isDraft === true`; stored via `ApplicationService`.
- **DraftsComponent**: The Angular standalone component at `src/app/submissions/drafts/`.
- **FieldNoteComponent**: The inner presentational component (`app-field-note`) that renders the yellow left-border note paragraph.
- **Form_System**: The collective set of Angular form components, shared UI components, and styling infrastructure being refactored. "Form-related component SCSS file" means any `.scss` file under `src/app/` that is scoped to a form component (i.e. not a global stylesheet under `src/assets/styles/`).
- **Grant_Utilisation_Section**: The section within the RDIG Budget Summary step labelled "Grant Utilisation & Benefits".
- **NoteComponent**: The shared Angular component (`app-note`) at `src/app/shared/components/note/` that wraps `FieldNoteComponent`.
- **Open Window**: The state when an active `BatchSitting` exists and today's date falls within its `startDate`–`endDate` range.
- **Project_Duration**: The numeric value (in months) selected in the `projectDetails.duration` form control of the RDIG application.
- **RDIG_Application**: The Angular form at `src/app/rdig_form/` used to submit RDIG grant applications.
- **RDIG_Form**: Refers specifically to `RdigApplicationComponent` and its child step components.
- **ResearchActivitiesComponent**: The child step component at `src/app/rdig_form/components/research-activities/`.
- **Submission_Window**: The date range defined by an active `BatchSitting`; governs whether formal submission is permitted.

---

## Requirements

### Requirement 1: Global UI Token Enforcement

**User Story:** As a developer maintaining the RMC frontend, I want all form elements to use the project's design token system exclusively, so that visual consistency is guaranteed across every application page.

#### Acceptance Criteria

1. THE Form_System SHALL apply spacing values using `var(--space-X)` design tokens in all form-related component SCSS files (any `.scss` file under `src/app/`); the only permitted hardcoded pixel values are `0px`, `1px` (borders/dividers), `2px` (focus-ring offset), and `border-radius: 4px` as documented in `RULES.md`.
2. THE Form_System SHALL apply all color values using `var(--color-X)` design tokens in all form-related component SCSS files; the only permitted non-token color values are the CSS keyword `white` and `transparent` as documented in `RULES.md`.
3. THE Form_System SHALL apply label typography — font size, font weight, and color — through the global `.form-label` class defined in `_forms.scss`; no form-related component SCSS file SHALL declare `font-size`, `font-weight`, or `color` properties targeting label elements.
4. THE Form_System SHALL render all text inputs using the global class `input--text`, all select dropdowns using `input--select`, and all textareas using `input--textarea`; no form-related component SCSS file SHALL redefine the full property set of these classes (single-property extensions scoped with a BEM modifier are permitted).
5. THE Form_System SHALL render all action buttons using the global `.btn` base class combined with the appropriate variant class (`.btn-primary`, `.btn-secondary`, etc.); no form-related component SCSS file SHALL duplicate the complete `.btn` property block (adding a single modifier property via a BEM extension class is permitted).
6. THE Form_System SHALL apply `gap: var(--space-6)` (24 px) to all `.section-fields` containers and `.row--2` / `.row--3` grid wrappers across all application pages to maintain consistent vertical and horizontal rhythm.

---

### Requirement 2: NoteComponent Inline Repositioning

**User Story:** As a form user, I want helper notes to appear directly beneath the specific form field they describe, so that I can immediately associate a note with the correct input without visual confusion.

#### Acceptance Criteria

1. WHEN `NoteComponent` (`app-note`) is placed inside a `.form-field` wrapper, THE NoteComponent SHALL be the immediate next sibling of the input or control it annotates in the rendered DOM; no other sibling element SHALL appear between the control and the `app-note` element.
2. THE NoteComponent SHALL declare `display: block` on its `:host` CSS selector so that it occupies the full available width and does not introduce inline formatting context within the parent flex or grid layout.
3. WHILE a `NoteComponent` is rendered within a `.form-field` or `.section-fields` container, THE Form_System SHALL preserve the top-edge alignment of each sibling form field at the same position it would occupy if the note were absent, with no horizontal shift to any sibling element.
4. THE NoteComponent SHALL render its content identically and occupy the same layout position regardless of whether the `[isTooltip]` input is bound, omitted, or set to any value; the `isTooltip` input is retained only for backwards compilation compatibility.

---

### Requirement 3: Drafts Table — Remove Batch Column

**User Story:** As a user browsing my saved drafts, I want to see a clean, relevant table without a Batch column, so that the page is easier to read and the column does not display mostly empty or irrelevant data.

#### Acceptance Criteria

1. THE DraftsComponent SHALL render the drafts table without a "Batch" `<th>` column header and without any corresponding `<td>` data cell (including any fallback or empty-state cell) in any table row.
2. THE DraftsComponent SHALL remove the entire Batch `<td>` element and all its contents from each table row — including the `@if (app.metadata?.batch)` badge branch, the `@else` fallback `<span class="muted">—</span>`, and the surrounding `<td>` wrapper itself.
3. WHEN the drafts table is rendered, THE DraftsComponent SHALL display exactly 4 columns: "Project Title", "Last Saved", "Submission Window", and a header-less action column containing row action buttons; no other columns SHALL be present.

---

### Requirement 4: Submission Window Validation Decoupling

**User Story:** As a user, I want to be able to open, fill out, and save any application as a draft at any time regardless of the submission window status, so that my work is never lost due to a closed batch.

#### Acceptance Criteria

1. WHEN a user clicks the action button on any draft row, THE DraftsComponent SHALL navigate the user to that draft's edit route regardless of whether a `BatchSitting` with `status === 'active'` exists.
2. WHEN the DraftsComponent is rendered, it SHALL NOT display a batch-status notice (neither the "No active batch" warning banner nor the "Active batch" info banner), the "Submission Window" column header `<th>`, or any "Locked" / "Open" badge within table rows.
3. WHEN the DraftsComponent initialises (i.e. `ngOnInit` or equivalent lifecycle hook runs), THE DraftsComponent SHALL NOT call `BatchSittingService.loadAll()`, `BatchSittingService.getActive()`, or any other method on `BatchSittingService`.
4. WHEN the DraftsComponent class is compiled, it SHALL NOT declare a `hasBatch` computed signal, an `activeBatch` signal, or any other signal or property that reads from `BatchSittingService`; these SHALL be removed from the component class.
5. WHEN a user navigates to the `/submissions/draft` route, THE DraftsComponent SHALL render without any batch-status-related UI element — specifically no batch notice banners, no "Submission Window" column, and no "Locked" / "Open" badges.

---

### Requirement 5: RDIG Closed-Window Banner

**User Story:** As an RDIG applicant, I want to see a clear warning at the top of the RDIG form when the submission window is closed, so that I know my application cannot be submitted right now but I can still save it as a draft.

#### Acceptance Criteria

1. WHEN a user opens the RDIG_Application and the Submission_Window is Closed, THE RDIG_Form SHALL display a warning banner positioned above the step indicator and below the page header.
2. THE warning banner SHALL contain text stating that the submission window is currently closed and that the user may still save the application as a draft; both pieces of information SHALL be present in the banner's visible content.
3. IF the Submission_Window is Open, THEN THE RDIG_Form SHALL NOT render the closed-window warning banner element in the DOM.
4. WHILE the `BatchSittingService` is loading batch data, THE RDIG_Form SHALL render a loading indicator in the banner position (above the step indicator) and SHALL NOT render the closed-window warning banner until the loading completes.
5. IF `BatchSittingService` returns an error or rejects, THEN THE RDIG_Form SHALL treat the Submission_Window as Closed and SHALL display the closed-window warning banner as described in criteria 1 and 2.
6. THE closed-window warning banner SHALL NOT include a dismiss or close button; it SHALL remain visible for the entire session as long as the Submission_Window remains Closed.

---

### Requirement 6: RDIG Submission Interception Modal

**User Story:** As an RDIG applicant, I want a clear modal to appear if I try to submit while the window is closed, so that my submission attempt is blocked with a helpful explanation and I am reminded I can save as a draft.

#### Acceptance Criteria

1. WHEN a user clicks "Submit" on the RDIG_Application and the Submission_Window is Closed (including when batch data is still loading), THE RDIG_Form SHALL prevent the `onSubmit` handler from proceeding to validation or API submission and SHALL display a modal popup.
2. THE modal SHALL contain text explicitly stating that submission is currently unavailable because the submission window is closed.
3. THE modal SHALL contain text explicitly stating that the user can preserve their progress by using the "Save as Draft" action.
4. WHEN the user clicks the dismiss button on the modal, THE modal SHALL become non-visible, all previously entered form field data SHALL be preserved, and no submission request SHALL have been made.
5. IF the Submission_Window is Open when the user clicks "Submit", THEN THE RDIG_Form SHALL NOT display the closed-window modal and SHALL allow `onSubmit` to proceed to form validation and submission normally.
6. THE RDIG_Form SHALL NOT call the browser's `alert()` function to communicate the closed-window condition; the modal component SHALL replace the existing `alert()` call inside the batch constraint check in `onSubmit()`.

---

### Requirement 7: RDIG UI Clean-Up — Gear Icon Removal

**User Story:** As a user of the RDIG form, I want the interface to be free of unintended decorative icons (such as the gear emoji ⚙️), so that the UI looks polished and professional.

#### Acceptance Criteria

1. WHEN the RDIG_Form is rendered at any workflow status, THE RDIG_Form SHALL NOT produce any DOM text node, attribute value, or CSS `content` property that contains the Unicode character U+2699 (⚙️) in any header, button label, section title, or any other rendered element.
2. THE RDIG_Form source files (HTML templates and TypeScript files) SHALL contain no string literal, interpolation expression, or template binding that includes the gear emoji character (⚙️ / U+2699) as display content.

---

### Requirement 8: RDIG Grant Utilisation Box Sizing

**User Story:** As a user filling out the Grant Utilisation & Benefits section, I want all input and content boxes to be the same size, so that the layout looks uniform and professional.

#### Acceptance Criteria

1. WHEN the Grant_Utilisation_Section is rendered, all input controls and content containers within the section SHALL have a computed height that differs by no more than 1 px from one another, as measured by the browser's layout engine.
2. THE Grant_Utilisation_Section SHALL apply `box-sizing: border-box` to all input and content elements within the section so that padding and border widths are included in the element's declared dimensions and do not increase its rendered size beyond the declared value.
3. THE Grant_Utilisation_Section SCSS SHALL express height values using the design token `var(--input-height-sm)` and padding values using `var(--space-X)` tokens; no hardcoded pixel values for heights or padding SHALL appear in the section's component SCSS file.

---

### Requirement 9: RDIG Checkbox Colour Update

**User Story:** As a user reviewing the Research Outputs section, I want the checkboxes under "Proposed Research Outputs (Select all that apply)" to use solid black styling, so that they are clearly visible and consistent with a professional UI.

#### Acceptance Criteria

1. WHEN the "Proposed Research Outputs (Select all that apply)" section is rendered, all checkbox inputs within that section SHALL display their checked state, focus ring, and interactive highlight using solid black rather than the browser's default checkbox accent colour.
2. WHEN a checkbox in the Research Outputs section is checked, THE RDIG_Form SHALL display a solid black checkmark fill; the browser's default checkbox accent colour (e.g. the user-agent blue) SHALL NOT be visible.

---

### Requirement 10: RDIG Dynamic Activities Helper Message

**User Story:** As an RDIG applicant planning research activities, I want a contextual helper message beneath the empty-state notice that either prompts me to select a Project Duration first or confirms the allowed month range once a duration is selected, so that I always understand how to configure my activities.

#### Acceptance Criteria

1. WHEN the activities list is empty and Project_Duration has NOT been selected (i.e. `projectDetails.duration` is `null`, an empty string, or `0`), THE ResearchActivitiesComponent SHALL display the message "Please select the 'Project Duration' field to configure and plan activities." positioned directly below the empty-state notice "No activities added yet. Click Add Activity to start planning."
2. WHEN the activities list is empty and Project_Duration HAS been selected (i.e. `projectDetails.duration` is a positive integer X), THE ResearchActivitiesComponent SHALL display the message "Start and End Month can be any value from 0 to [X], can be the same, and activities may overlap." positioned directly below the empty-state notice, where [X] is substituted with the current `Project_Duration` value.
3. WHEN the activities list is non-empty (at least one activity exists), THE ResearchActivitiesComponent SHALL NOT render the dynamic helper message element described in criteria 1 and 2.
4. WHEN the `projectDetails.duration` value changes while the activities list is empty, THE ResearchActivitiesComponent SHALL update the displayed helper message to reflect the new value within the same render cycle, without requiring a page reload.
5. THE ResearchActivitiesComponent template SHALL remove the existing static `<app-note>` element whose text reads "Start and End Month can be any value from 0 to 12, can be the same, and activities may overlap." and replace it with the dynamic helper message described in criteria 1 and 2.
6. THE dynamic helper message SHALL be rendered using the existing `NoteComponent` (`app-note`) element so that its visual appearance (border, background, typography) is identical to other inline notes in the form.
