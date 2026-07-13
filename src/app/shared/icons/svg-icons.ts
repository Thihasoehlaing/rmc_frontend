export interface SvgIconDefinition {
  readonly name: string;
  readonly viewBox: string;
  readonly markup: string;
}

export const SVG_ICON_TRASH: SvgIconDefinition = {
  name: 'SVG_ICON_TRASH',
  viewBox: '0 0 16 16',
  markup: `<path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>`,
};

export const SVG_ICON_EDIT: SvgIconDefinition = {
  name: 'SVG_ICON_EDIT',
  viewBox: '0 0 24 24',
  markup: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 20h9"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4Z"></path>`,
};

export const SVG_ICON_VIEW: SvgIconDefinition = {
  name: 'SVG_ICON_VIEW',
  viewBox: '0 0 24 24',
  markup: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"></circle>`,
};

export const SVG_ICON_PRINT: SvgIconDefinition = {
  name: 'SVG_ICON_PRINT',
  viewBox: '0 0 24 24',
  markup: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9V2h12v7"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 14h12v8H6z"></path>`,
};
export const SVG_ICON_ACTIVATE: SvgIconDefinition = {
  name: 'SVG_ICON_ACTIVATE',
  viewBox: '0 0 24 24',
  markup: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6 9 17l-5-5"></path>`,
};

export const SVG_ICON_MARK_READ: SvgIconDefinition = {
  name: 'SVG_ICON_MARK_READ',
  viewBox: '0 0 24 24',
  markup: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16v12H4z"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4 7 8 6 8-6"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14 17 2 2 4-4"></path>`,
};
export const SVG_ICON_DEACTIVATE: SvgIconDefinition = {
  name: 'SVG_ICON_DEACTIVATE',
  viewBox: '0 0 24 24',
  markup: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"></circle><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5.7 5.7 18.3 18.3"></path>`,
};
export const SVG_ICON_SHIELD_USER: SvgIconDefinition = {
  name: 'SVG_ICON_SHIELD_USER',
  viewBox: '0 0 24 24',
  markup: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3 5 6v5c0 4.4 2.9 8.4 7 10 4.1-1.6 7-5.6 7-10V6l-7-3Z"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-4 5c.7-1.7 2.2-3 4-3s3.3 1.3 4 3"></path>`,
};

export const SVG_ICON_BLOCK_USER: SvgIconDefinition = {
  name: 'SVG_ICON_BLOCK_USER',
  viewBox: '0 0 24 24',
  markup: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"></circle><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5.7 5.7 18.3 18.3"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-3.5 4.5c.5-1.5 1.8-2.5 3.5-2.5"></path>`,
};
export const SVG_ICON_LOADING_SPINNER: SvgIconDefinition = {
  name: 'SVG_ICON_LOADING_SPINNER',
  viewBox: '0 0 50 50',
  markup: `<circle class="svg-icon__spinner-path" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>`,
};

export const SVG_ICON_SUCCESS_CHECK: SvgIconDefinition = {
  name: 'SVG_ICON_SUCCESS_CHECK',
  viewBox: '0 0 52 52',
  markup: `<circle class="svg-icon__success-circle" cx="26" cy="26" r="25" fill="none"></circle><path class="svg-icon__success-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"></path>`,
};

export const SVG_ICON_BEAKER: SvgIconDefinition = {
  name: 'SVG_ICON_BEAKER',
  viewBox: '0 0 24 24',
  markup: `<path d="M7 2v2h10V2H7zm10 4H7c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 12h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4H8v-2h2v2zm0-4H8v-2h2v2zm4-2h-2V8h2v2zm-4 0H8V8h2v2z"/>`,
};

export const SVG_ICON_CHEVRON_DOWN: SvgIconDefinition = {
  name: 'SVG_ICON_CHEVRON_DOWN',
  viewBox: '0 0 16 16',
  markup: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 5l6 6 6-6"></path>`,
};

export const SVG_ICONS = [
  SVG_ICON_EDIT,
  SVG_ICON_TRASH,
  SVG_ICON_VIEW,
  SVG_ICON_PRINT,
  SVG_ICON_ACTIVATE,
  SVG_ICON_MARK_READ,
  SVG_ICON_DEACTIVATE,
  SVG_ICON_SHIELD_USER,
  SVG_ICON_BLOCK_USER,
  SVG_ICON_LOADING_SPINNER,
  SVG_ICON_SUCCESS_CHECK,
  SVG_ICON_BEAKER,
  SVG_ICON_CHEVRON_DOWN,
] as const;



