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
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  ['link', 'table'],
  ['clean'],
];

type QuillTableModule = {
  insertTable(rows: number, columns: number): void;
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
    this.quill = new QuillConstructor(this.editorHost.nativeElement, {
      bounds: this.editorHost.nativeElement,
      modules: {
        toolbar: this.isEditorReadOnly()
          ? false
          : {
              container: this.toolbarOptions,
              handlers: {
                table: () => this.insertDefaultTable(),
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
    const tableModule = this.quill?.getModule('table') as QuillTableModule | undefined;
    if (!this.quill || !tableModule) {
      return;
    }

    this.quill.focus();
    tableModule.insertTable(3, 3);
  }

  private cleanNode(parent: Node): void {
    const allowedTags = new Set([
      'a',
      'b',
      'br',
      'div',
      'em',
      'h1',
      'h2',
      'h3',
      'i',
      'li',
      'ol',
      'p',
      'span',
      'strong',
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
    const dataRow = ['td', 'th'].includes(tagName) ? element.getAttribute('data-row') : null;
    const colSpan = ['td', 'th'].includes(tagName) ? element.getAttribute('colspan') : null;
    const rowSpan = ['td', 'th'].includes(tagName) ? element.getAttribute('rowspan') : null;

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

    if (dataList && ['bullet', 'ordered'].includes(dataList)) {
      element.setAttribute('data-list', dataList);
    }

    if (dataRow && /^row-[a-z0-9]+$/i.test(dataRow)) {
      element.setAttribute('data-row', dataRow);
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
