# Shared settings components

The `/showcase` page is the live reference. Main Settings, RMC Settings and Admin Settings share these components.

- `app-settings-page-header`: title, description, optional icon/eyebrow, projected actions.
- `app-search-toolbar`: controlled `query`/`queryChange`, explicit `search` and `reset` events. It never fetches data. Its responsive grid keeps filters at consistent widths and places actions in a separate row.
- `app-settings-panel`: heading, optional count, body, `[panelActions]` and `[panelFooter]` slots. Use `flush` for an embedded table.
- `app-field` with native `appInput`: label, hint and error presentation. Set the input ID to `controlId`, connect hint/error IDs through `aria-describedby`, and set native `required` when needed. Supports both Angular forms approaches. Use it for text/number/textarea controls; use `app-dropdown` for normal selections, `app-searchable-dropdown` for searchable staff selection and `app-date-picker` for dates.
- `app-state`: empty/error presentation with projected recovery actions.
- `app-selection-summary`: renders supplied selection labels and descriptions without API calls.

Existing components remain the shared controls:

- `app-action-button`: primary/secondary/ghost/danger/success/warning, size, icon-only accessible names, busy states and native button types. Use `formId` for a submit action in a dialog footer.
- `app-dialog`: opt into `density="compact"`; provides focus trapping, focus restoration and Escape handling. Set `closeDisabled` during saves.
- `app-data-table`: use `dense` and `embedded` inside a settings panel. Keep pagination in `app-pagination`; server pagination remains owned by the feature.
- `app-dropdown`: normal single or multiple selection without a search input (`isMulti`). Use `emptyOptionLabel` for an explicit nullable All option. Preserves numeric IDs, `null`, and empty-string filter values.
- `app-toggle`: labelled boolean switch with a disabled state.
- `app-searchable-dropdown`: single or multiple selection, searches supplied options locally. Features own initial data fetching, selected IDs, loading and errors.
- `app-status-badge`: semantic info, success, warning and error treatments.

Shared styles consume global tokens. Feature styles should contain page layout and domain-specific content only. Existing controls keep their defaults unless a compact option is requested.

- `app-person-identity`: compact staff name/detail with an optional photo and initials fallback.

Use native `input--radio` and `input--checkbox` controls with the shared selection styles; preserve native grouping, Angular bindings and disabled states. Use `.selection-options` for compact option groups and `.settings-choice-field` for a labelled fieldset.
