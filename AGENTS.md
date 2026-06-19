# AGENTS.md

## Purpose

This file is the main instruction source for AI agents working on the RMC frontend.

The goal is consistency. Every new page, component, form, and style should feel like part of the same system. Agents must reuse the existing shared components, global classes, design tokens, and Angular patterns before creating anything new.

## Core Principle

Do not build isolated custom UI.

Before creating a new component, style, layout, or behavior:
- Check existing shared components.
- Check similar feature pages.
- Reuse existing global classes.
- Use existing design tokens.
- Keep changes scoped and consistent with the current app.

If the system already has a pattern, follow it.

## Shared Components First

Always check `src/app/shared/components/` before building new UI.

Prefer existing shared components such as:
- `<app-searchable-dropdown>`
- `<app-validation-message>`
- `<app-character-counter>`
- `<app-note>`
- `<app-form-main-title>`
- `<app-form-wizard-nav>`
- `<app-step-indicator>`
- `<app-form-comment-panel>`
- shared dialog, table, pagination, toast, file upload, and form-standard components when applicable.

Create a new shared component only when:
- the same behavior or UI will be reused in multiple places;
- the existing shared components cannot reasonably support the need;
- the new abstraction reduces duplication instead of adding complexity.

Do not duplicate shared component behavior locally inside a feature page.

## Skeleton Loading

Use the shared skeleton loading system for every loading placeholder.

Required:
- Use the global `--skeleton-*` tokens for skeleton colors, animation, borders, shadow, radius, and sizing.
- Use exactly the shared container and placeholder fill colors; do not introduce feature-specific skeleton colors.
- Use the global `skeleton-shimmer` animation and reduced-motion behavior.
- Reuse `<app-submissions-table-skeleton>` for submission-style tables and configure only its columns, rows, search, and filter shape.

Do not define local skeleton keyframes, animation speeds, or hardcoded skeleton colors in feature styles.

## Global Classes

Use the existing global UI classes instead of redefining styles in component SCSS.

Use button classes:
- `.btn`
- `.btn-primary`
- `.btn-secondary`
- `.btn-success`
- `.btn-warning`
- `.btn-ghost`
- `.btn-sm`

Use form classes:
- `.form-field`
- `.form-label`
- `.form-hint`
- `.form-error-msg`
- `.input--text`
- `.input--select`
- `.input--textarea`

Use layout classes:
- `.section-fields`
- `.row--2`
- `.row--3`

Use surface and status classes:
- `.card`
- `.card__header`
- `.card__title`
- `.card__content`
- `.badge`
- `.badge-success`
- `.badge-warning`
- `.badge-danger`
- `.badge-info`

Do not locally redefine full versions of `.btn`, `.card`, `.badge`, or `.input--*`.

Local SCSS may add small component-specific adjustments, but it must not copy the full global style block.

## Design Tokens

Use design tokens for spacing, sizing, color, typography, and layout values.

Required:
- Use `var(--space-X)` for spacing.
- Use `var(--size-X)` where size tokens exist.
- Use `var(--color-X)` for colors.
- Use existing typography tokens and global text classes where available.
- Use `gap: var(--space-6)` for normal form and section rhythm.

Do not use hardcoded pixel spacing or hardcoded colors in normal component styling.

Do not use:
- raw hex colors such as `#ffffff` or `#fff`;
- raw RGB/RGBA colors unless already part of an approved token definition;
- random one-off spacing values;
- duplicated button, card, input, or badge styling.

Use `white` instead of `#fff`.

Allowed hardcoded exceptions must be rare and commented:
- `1px` borders;
- `2px` micro-spacing;
- `50%` circles;
- scrollbar dimensions;
- material icon pixel sizing;
- fixed component sizes only when no token exists.

## SCSS Architecture

Follow the existing SCSS structure.

Global token and style files define the system. Component SCSS consumes the system.

Expected flow:
- SCSS variables and maps define design logic.
- `:root` exposes reusable CSS custom properties.
- Components use `var(--token-name)`.

When adding a new token:
- add it to the correct global style file;
- document color tokens with an inline comment;
- use the token from components instead of hardcoding the value.

Do not create new local design systems inside feature folders.

## Form UI Rules

Forms must look and behave consistently across RDIG, Conference, Journal, Partnership, RA/GRA, Travel Authorization, and future application types.

For form fields:
- wrap label and control with the established `.form-field` pattern;
- use `.form-label` for labels;
- use `.input--text`, `.input--select`, or `.input--textarea` for controls;
- use `<app-validation-message>` for validation errors;
- use `<app-character-counter>` where length limits are visible to users;
- place helper notes close to the field they explain.

For multi-step forms:
- reuse `<app-step-indicator>` for progress;
- reuse `<app-form-wizard-nav>` for Previous, Next, Save Draft, and Submit controls;
- keep navigation behavior consistent between form types.

Do not invent a new form layout unless the existing system cannot support the requirement.

## Angular Architecture

Follow the current Angular style in the repo.

Preferred approach:
- use standalone components where the project already uses them;
- keep components focused on presentation and local UI state;
- put API communication and reusable business logic in services;
- keep templates semantic and readable;
- keep TypeScript strongly typed;
- avoid unnecessary abstractions;
- avoid feature-to-feature coupling.

Respect feature boundaries. Do not make one feature depend on another feature's private implementation.

Shared logic belongs in shared services, shared components, or core services only when it is genuinely reused.

## Accessibility and HTML

Use semantic HTML.

Prefer:
- real buttons for actions;
- anchors for navigation;
- labels connected to form controls;
- clear heading hierarchy;
- accessible names for icon-only buttons;
- visible validation and error states.

Do not use clickable `div`s when a button or anchor is appropriate.

## Backend and API Boundaries

The local mock backend is part of development.

Important files:
- `server.mjs`
- `db.json`

Do not remove or bypass the mock backend unless the task explicitly replaces it.

Some current frontend code uses local endpoints such as `http://localhost:3000`. Keep that behavior unless the task is specifically about API integration.

For future APU integration:
- keep integration work separate from UI cleanup;
- use environment configuration instead of hardcoded production URLs;
- put API calls in services;
- preserve local mock support unless explicitly removed;
- preserve existing authentication and redirect behavior unless the task changes it.

## Generated and Local Files

Do not edit generated output directly.

Avoid direct edits inside:
- `dist/`
- `.angular/cache/`
- `node_modules/`

If something in `dist/` is wrong, fix the source under `src/` or `public/`, then rebuild.

## Change Discipline

Agents must keep changes narrow.

Do:
- inspect before editing;
- follow existing naming and folder patterns;
- update nearby tests when behavior changes;
- run relevant checks when practical;
- explain any skipped validation.

Do not:
- rewrite unrelated files;
- remove project files without explicit instruction;
- change formatting across unrelated files;
- introduce new libraries without a strong reason;
- replace working shared patterns with one-off code.

## Documentation Discipline

This `AGENTS.md` file is the only AI guidance file.

Do not add new AI rule files unless explicitly requested.

If AI behavior rules change, update this file directly.

Normal project documentation may exist separately, but AI agents should treat this file as the primary source of instructions.
