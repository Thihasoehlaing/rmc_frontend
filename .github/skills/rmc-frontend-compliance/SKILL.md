---
name: rmc-frontend-compliance (How to survive)
description: 'WORKFLOW SKILL — Enforce RMC project UI system guidelines and development rules for consistent, maintainable Angular frontend development. USE FOR: implementing new components with shared elements; styling with design tokens; validating SCSS against zero-hardcoding policy; ensuring component architecture compliance. DO NOT USE FOR: general Angular development; non-RMC projects; runtime issues. INVOKES: file system tools for reading guidelines, subagents for code review and validation.'
---

# RMC Frontend Compliance

## Overview

This skill packages the domain knowledge from `guidelines+ai_rules/system-guidelines.md` and `guidelines+ai_rules/RULES.md` to ensure all development in the RMC frontend project adheres to the established UI system and rules. It promotes consistency, maintainability, and rapid development by enforcing the modular SCSS architecture, reusable components, and strict coding standards.

## Workflow Steps

1. **Pre-Implementation Verification**:
   - Check for existing shared components in `src/app/shared/components` before creating new ones.
   - Verify global SCSS classes (.btn, .card, .input--*) exist before local styling.
   - Identify required design tokens from `_root.scss` and `_colors.scss`.

2. **SCSS Compliance**:
   - Use `var(--space-X)` for all dimensions, no hardcoded pixels except allowed exceptions.
   - Use `var(--color-X)` for colors, no hex codes; use `white` for white.
   - Maintain vertical rhythm with `gap: var(--space-6)`.
   - Do not redefine global classes locally; extend if needed.
   - Document new tokens with inline comments.

3. **Component Development**:
   - Prefer standalone components.
   - Use shared components like `<app-searchable-dropdown>`, `<app-validation-message>`, etc.
   - Follow semantic HTML and proper accessibility.

4. **Validation and Testing**:
   - After changes, run builds/tests to ensure no violations.
   - Use subagents to review code for compliance.

## Key Rules Summary

### Zero-Hardcoding Policy
- No pixels except 1px borders, 50% circles, 2px micro-spacing, scrollbars, material icons, fixed sizes.
- No colors except via tokens.
- No #fff, use `white`.

### Global Classes
- Use .btn, .card, .badge, .input--* from global styles.
- No local redefinition.

### Architecture
- SCSS: $variables → :root tokens → component var() usage.
- Components: Clean logic, descriptive templates.

## Bundled Assets
- Reference: `guidelines+ai_rules/system-guidelines.md` for components and classes.
- Reference: `guidelines+ai_rules/RULES.md` for detailed rules.

## Usage
Invoke this skill when working on RMC frontend to ensure adherence to guidelines. For example, before implementing a new form, use this skill to guide the process.
