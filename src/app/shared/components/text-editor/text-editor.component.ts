import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
  computed,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';
import type Quill from 'quill';

type QuillInstance = InstanceType<typeof Quill>;
export type QuillToolbarOptions = Array<
  string | Record<string, unknown> | Array<string | Record<string, unknown>>
>;

const DEFAULT_TOOLBAR_OPTIONS: QuillToolbarOptions = [
  [{ header: [1, 2, 3, 4, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ script: 'sub' }, { script: 'super' }],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  ['blockquote', 'code-block'],
  ['link'],
  ['table', 'table-row', 'table-column', 'table-delete'],
  ['undo', 'redo', 'clean'],
];

type QuillTableModule = {
  insertTable(rows: number, columns: number): void;
  insertRowBelow(): void;
  insertColumnRight(): void;
  deleteTable(): void;
};

type QuillHistoryModule = {
  undo(): void;
  redo(): void;
};

@Component({
  selector: 'app-text-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-editor.component.html',
  styleUrl: './text-editor.component.scss',
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextEditorComponent),
      multi: true,
    },
  ],
})
export class TextEditorComponent
  implements AfterViewInit, OnChanges, OnDestroy, ControlValueAccessor
{
  private static nextId = 0;

  @ViewChild('editorHost') private editorHost?: ElementRef<HTMLDivElement>;

  @Input() label = '';
  @Input() required = false;
  @Input() placeholder = 'Start typing…';
  @Input() helperText = '';
  @Input() maxLength: number | null = null;
  @Input() showCounter = true;
  @Input() minHeight = 'calc(var(--space-8) * 4)';
  @Input() invalid = false;
  @Input() readOnly = false;
  @Input() toolbarOptions: QuillToolbarOptions = DEFAULT_TOOLBAR_OPTIONS;

  readonly value = signal('');
  readonly isDisabled = signal(false);
  readonly isFocused = signal(false);
  readonly describedById = `text-editor-help-${TextEditorComponent.nextId++}`;

  readonly characterCount = computed(() => this.getPlainText(this.value()).length);
  readonly isOverLimit = computed(() => {
    const max = this.maxLength;
    return max !== null && this.characterCount() > max;
  });

  private readonly platformId = inject(PLATFORM_ID);
  private quill: QuillInstance | null = null;
  private pendingHtml = '';
  private isWritingValue = false;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.editorHost) {
      return;
    }

    const { default: QuillConstructor } = await import('quill');
    this.registerCustomToolbarIcons(QuillConstructor);
    this.quill = new QuillConstructor(this.editorHost.nativeElement, {
      bounds: this.editorHost.nativeElement,
      modules: {
        toolbar: this.isEditorReadOnly()
          ? false
          : {
              container: this.toolbarOptions,
              handlers: {
                table: () => this.insertDefaultTable(),
                'table-row': () => this.updateTable((tableModule) => tableModule.insertRowBelow()),
                'table-column': () =>
                  this.updateTable((tableModule) => tableModule.insertColumnRight()),
                'table-delete': () => this.updateTable((tableModule) => tableModule.deleteTable()),
                undo: () => this.updateHistory((historyModule) => historyModule.undo()),
                redo: () => this.updateHistory((historyModule) => historyModule.redo()),
              },
            },
        table: true,
        clipboard: {
          matchVisual: true,
        },
        history: {
          delay: 1000,
          maxStack: 100,
          userOnly: true,
        },
      },
      placeholder: this.placeholder,
      readOnly: this.isEditorReadOnly(),
      theme: 'snow',
    });

    this.applyMinHeight();
    this.applyToolbarLabels();
    this.setEditorHtml(this.pendingHtml);
    this.quill.enable(!this.isEditorReadOnly());

    this.quill.on('text-change', (_delta, _oldDelta, source) => {
      if (this.isWritingValue) {
        return;
      }

      if (source === 'user') {
        this.enforceMaxLength();
        this.emitCurrentHtml();
      }
    });

    this.quill.on('selection-change', (range) => {
      this.isFocused.set(!!range);
      if (!range) {
        this.onTouched();
        this.persistSanitizedHtml();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['readOnly']) {
      this.quill?.enable(!this.isEditorReadOnly());
    }

    if (changes['minHeight']) {
      this.applyMinHeight();
    }
  }

  ngOnDestroy(): void {
    this.quill = null;
  }

  writeValue(value: string | null | undefined): void {
    const sanitized = this.sanitizeForStorage(value ?? '');
    this.value.set(sanitized);
    this.pendingHtml = sanitized;

    if (this.quill && this.sanitizeForStorage(this.getEditorHtml()) === sanitized) {
      return;
    }

    this.setEditorHtml(sanitized, true);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
    this.quill?.enable(!this.isEditorReadOnly());
  }

  sanitizeForStorage(html: string): string {
    if (!isPlatformBrowser(this.platformId)) {
      return html;
    }

    const template = document.createElement('template');
    template.innerHTML = html;
    this.cleanNode(template.content);
    return this.isEmptyHtml(template.innerHTML) ? '' : template.innerHTML;
  }

  private setEditorHtml(html: string, preserveSelection = false): void {
    if (!this.quill) {
      return;
    }

    const previousRange = preserveSelection ? this.quill.getSelection() : null;

    try {
      this.isWritingValue = true;
      this.quill.clipboard.dangerouslyPasteHTML(this.sanitizeForStorage(html), 'silent');

      if (previousRange) {
        const editorLength = Math.max(this.quill.getLength() - 1, 0);
        const index = Math.min(previousRange.index, editorLength);
        const length = Math.min(previousRange.length, Math.max(editorLength - index, 0));
        this.quill.setSelection(index, length, 'silent');
      }
    } finally {
      this.isWritingValue = false;
    }
  }

  private emitCurrentHtml(): void {
    const sanitized = this.sanitizeForStorage(this.getEditorHtml());
    this.value.set(sanitized);
    this.pendingHtml = sanitized;
    this.onChange(sanitized);
  }

  private persistSanitizedHtml(): void {
    const sanitized = this.sanitizeForStorage(this.getEditorHtml());
    this.value.set(sanitized);
    this.pendingHtml = sanitized;
    this.onChange(sanitized);
  }

  private getEditorHtml(): string {
    if (!this.quill) {
      return this.pendingHtml;
    }

    return this.quill.getSemanticHTML();
  }

  private enforceMaxLength(): void {
    if (!this.quill || this.maxLength === null) {
      return;
    }

    const length = Math.max(this.quill.getLength() - 1, 0);
    if (length <= this.maxLength) {
      return;
    }

    this.quill.deleteText(this.maxLength, length - this.maxLength, 'silent');
  }

  private applyMinHeight(): void {
    const editorElement = this.editorHost?.nativeElement.querySelector<HTMLElement>('.ql-editor');
    if (editorElement) {
      editorElement.style.minHeight = this.minHeight;
    }
  }

  private isEditorReadOnly(): boolean {
    return this.readOnly || this.isDisabled();
  }

  private insertDefaultTable(): void {
    this.updateTable((tableModule) => tableModule.insertTable(3, 3));
  }

  private updateTable(action: (tableModule: QuillTableModule) => void): void {
    const tableModule = this.quill?.getModule('table') as QuillTableModule | undefined;
    if (!this.quill || !tableModule) {
      return;
    }

    this.quill.focus();
    action(tableModule);
    this.emitCurrentHtml();
  }

  private updateHistory(action: (historyModule: QuillHistoryModule) => void): void {
    const historyModule = this.quill?.getModule('history') as QuillHistoryModule | undefined;
    if (!this.quill || !historyModule) {
      return;
    }

    action(historyModule);
    this.emitCurrentHtml();
  }

  private registerCustomToolbarIcons(QuillConstructor: typeof Quill): void {
    const icons = QuillConstructor.import('ui/icons') as Record<string, string>;

    icons['table-row'] =
      '<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="10" width="12" x="3" y="4"/><line class="ql-stroke" x1="3" x2="15" y1="8" y2="8"/><line class="ql-stroke" x1="3" x2="15" y1="11" y2="11"/><line class="ql-stroke" x1="9" x2="9" y1="4" y2="14"/><line class="ql-stroke" x1="6" x2="12" y1="16" y2="16"/><line class="ql-stroke" x1="9" x2="9" y1="13" y2="17"/></svg>';
    icons['table-column'] =
      '<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="10" width="12" x="3" y="4"/><line class="ql-stroke" x1="7" x2="7" y1="4" y2="14"/><line class="ql-stroke" x1="11" x2="11" y1="4" y2="14"/><line class="ql-stroke" x1="3" x2="15" y1="9" y2="9"/><line class="ql-stroke" x1="16" x2="16" y1="6" y2="12"/><line class="ql-stroke" x1="13" x2="17" y1="9" y2="9"/></svg>';
    icons['table-delete'] =
      '<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="10" width="12" x="3" y="5"/><line class="ql-stroke" x1="3" x2="15" y1="9" y2="9"/><line class="ql-stroke" x1="7" x2="7" y1="5" y2="15"/><line class="ql-stroke" x1="11" x2="11" y1="5" y2="15"/><line class="ql-stroke" x1="5" x2="13" y1="2" y2="2"/><line class="ql-stroke" x1="6" x2="12" y1="17" y2="17"/></svg>';
    icons['undo'] =
      '<svg viewBox="0 0 18 18"><polyline class="ql-stroke" points="7 5 3 9 7 13"/><path class="ql-stroke" d="M4 9h7a4 4 0 0 1 0 8"/></svg>';
    icons['redo'] =
      '<svg viewBox="0 0 18 18"><polyline class="ql-stroke" points="11 5 15 9 11 13"/><path class="ql-stroke" d="M14 9H7a4 4 0 0 0 0 8"/></svg>';
  }

  private applyToolbarLabels(): void {
    const toolbarElement =
      this.editorHost?.nativeElement.parentElement?.querySelector<HTMLElement>('.ql-toolbar');
    if (!toolbarElement) {
      return;
    }

    const labels: Record<string, string> = {
      blockquote: 'Block quote',
      bold: 'Bold',
      'code-block': 'Code block',
      clean: 'Clear formatting',
      italic: 'Italic',
      link: 'Insert link',
      redo: 'Redo',
      strike: 'Strikethrough',
      table: 'Insert 3 by 3 table',
      'table-column': 'Add table column to the right',
      'table-delete': 'Delete table',
      'table-row': 'Add table row below',
      underline: 'Underline',
      undo: 'Undo',
    };

    for (const [className, label] of Object.entries(labels)) {
      const button = toolbarElement.querySelector<HTMLButtonElement>(`.ql-${className}`);
      button?.setAttribute('title', label);
      button?.setAttribute('aria-label', label);
    }
  }

  private cleanNode(parent: Node): void {
    const allowedTags = new Set([
      'a',
      'b',
      'blockquote',
      'br',
      'code',
      'div',
      'em',
      'h1',
      'h2',
      'h3',
      'i',
      'li',
      'ol',
      'p',
      'pre',
      's',
      'span',
      'strong',
      'sub',
      'sup',
      'table',
      'tbody',
      'td',
      'tfoot',
      'th',
      'thead',
      'tr',
      'u',
      'ul',
    ]);

    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        continue;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      const element = child as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (tagName === 'script' || tagName === 'style') {
        element.remove();
        continue;
      }

      if (!allowedTags.has(tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        this.cleanNode(parent);
        continue;
      }

      this.cleanAttributes(element, tagName);
      this.cleanNode(element);
    }
  }

  private cleanAttributes(element: HTMLElement, tagName: string): void {
    const className = this.getSafeClassName(element.className);
    const href = tagName === 'a' ? this.getSafeHref(element.getAttribute('href')) : null;
    const dataList = tagName === 'li' ? element.getAttribute('data-list') : null;
    const dataLanguage = tagName === 'pre' ? element.getAttribute('data-language') : null;
    const dataRow = ['td', 'th'].includes(tagName) ? element.getAttribute('data-row') : null;
    const colSpan = ['td', 'th'].includes(tagName) ? element.getAttribute('colspan') : null;
    const rowSpan = ['td', 'th'].includes(tagName) ? element.getAttribute('rowspan') : null;
    const style = this.getSafeStyle(element);

    for (const attribute of Array.from(element.attributes)) {
      element.removeAttribute(attribute.name);
    }

    if (className) {
      element.setAttribute('class', className);
    }

    if (href) {
      element.setAttribute('href', href);
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    }

    if (dataList && ['bullet', 'checked', 'ordered', 'unchecked'].includes(dataList)) {
      element.setAttribute('data-list', dataList);
    }

    if (dataLanguage && /^[a-z0-9_-]{1,32}$/i.test(dataLanguage)) {
      element.setAttribute('data-language', dataLanguage);
    }

    if (dataRow && /^row-[a-z0-9]+$/i.test(dataRow)) {
      element.setAttribute('data-row', dataRow);
    }

    if (style) {
      element.setAttribute('style', style);
    }

    this.setSafeTableSpan(element, 'colspan', colSpan);
    this.setSafeTableSpan(element, 'rowspan', rowSpan);
  }

  private getSafeClassName(className: string): string {
    return className
      .split(/\s+/)
      .filter(
        (name) => /^ql-align-(center|right|justify)$/.test(name) || /^ql-indent-[1-8]$/.test(name),
      )
      .join(' ');
  }

  private getSafeHref(href: string | null): string | null {
    if (!href) {
      return null;
    }

    const trimmed = href.trim();
    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
      return trimmed;
    }

    return null;
  }

  private getSafeStyle(element: HTMLElement): string {
    const styles: string[] = [];
    const color = this.getSafeColor(element.style.color);
    const backgroundColor = this.getSafeColor(element.style.backgroundColor);

    if (color) {
      styles.push(`color: ${color}`);
    }

    if (backgroundColor) {
      styles.push(`background-color: ${backgroundColor}`);
    }

    return styles.join('; ');
  }

  private getSafeColor(color: string): string | null {
    const normalized = color.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (
      /^#[0-9a-f]{3,8}$/i.test(normalized) ||
      /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(
        normalized,
      ) ||
      /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(
        normalized,
      )
    ) {
      return normalized;
    }

    return null;
  }

  private isEmptyHtml(html: string): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const element = document.createElement('div');
    element.innerHTML = html;
    return !element.querySelector('table') && this.getPlainText(html).trim().length === 0;
  }

  private getPlainText(html: string): string {
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }

    const element = document.createElement('div');
    element.innerHTML = html;
    return (element.textContent ?? '').replace(/\u00a0/g, ' ');
  }

  private setSafeTableSpan(
    element: HTMLElement,
    attribute: 'colspan' | 'rowspan',
    value: string | null,
  ): void {
    if (!value) {
      return;
    }

    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 1 && parsed <= 12) {
      element.setAttribute(attribute, String(parsed));
    }
  }
}
