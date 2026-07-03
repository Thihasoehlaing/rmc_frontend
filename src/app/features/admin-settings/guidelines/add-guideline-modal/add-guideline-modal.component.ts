import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  QuillToolbarOptions,
  TextEditorComponent,
} from '../../../../shared/components/text-editor/text-editor.component';
import { GuidelinesModalComponent } from '../../../../shared/components/guidelines-modal/guidelines-modal.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';

export type BlockType = 'text' | 'highlight' | 'heading' | 'warning' | 'info';

export interface ModalBlock {
  id: string;
  type: BlockType;
  content: string;
  styling?: {
    bgToken?: string;
    textToken?: string;
    fontSizeToken?: string;
    fontWeightToken?: string;
  };
}

export interface GuidelineConfig {
  title: string;
  formName: string;
  backgroundToken: string;
  textToken: string;
  buttonToken: string;
  buttonText: string;
  blocks: ModalBlock[];
}

@Component({
  selector: 'app-add-guideline-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TextEditorComponent,
    GuidelinesModalComponent,
    DialogComponent,
  ],
  templateUrl: './add-guideline-modal.component.html',
  styleUrls: ['./add-guideline-modal.component.scss'],
})
export class AddGuidelineModalComponent implements OnChanges {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<GuidelineConfig>();
  @Input() initialConfig: GuidelineConfig | null = null;
  @Input() editId: number | null = null;
  @Input() isSaving = false;

  @ViewChild('previewModal') previewModal?: GuidelinesModalComponent;

  readonly formOptions = [
    'Conference Application',
    'Journal Application',
    'Partnership Application',
    'RA/GRA Application',
    'RDIG Application',
  ];

  readonly editorToolbarOptions: QuillToolbarOptions = [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'bullet' }, { list: 'ordered' }],
    ['link'],
    ['clean'],
  ];

  guidelineContent = signal('');
  guidelineConfig = signal<GuidelineConfig>(this.getDefaultConfig());

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialConfig']) {
      if (this.initialConfig) {
        this.loadInitialConfig(this.initialConfig);
      } else {
        this.resetConfig();
      }
    }
  }

  onTitleChange(title: string): void {
    this.guidelineConfig.update((config) => ({ ...config, title }));
  }

  onFormChange(formName: string): void {
    this.guidelineConfig.update((config) => ({ ...config, formName }));
  }

  onContentChange(content: string): void {
    this.guidelineContent.set(content);
    this.syncContentBlock(content);
  }

  openPreview(): void {
    this.previewModal?.open();
  }

  onClose(): void {
    this.close.emit();
  }

  onSave(): void {
    if (!this.isSaving && !this.isSaveDisabled()) {
      this.save.emit(this.guidelineConfig());
    }
  }

  isSaveDisabled(): boolean {
    return this.isContentEmpty() || this.guidelineConfig().title.trim().length === 0;
  }

  isContentEmpty(): boolean {
    return this.getPlainText(this.guidelineContent()).trim().length === 0;
  }

  private loadInitialConfig(config: GuidelineConfig): void {
    const content = this.blocksToHtml(config.blocks);
    this.guidelineContent.set(content);
    this.guidelineConfig.set({
      ...config,
      blocks: this.isHtmlEmpty(content) ? [] : [this.createContentBlock(content)],
    });
  }

  private resetConfig(): void {
    this.guidelineContent.set('');
    this.guidelineConfig.set(this.getDefaultConfig());
  }

  private getDefaultConfig(): GuidelineConfig {
    return {
      title: 'Guidelines',
      formName: 'Conference Application',
      backgroundToken: 'white',
      textToken: 'var(--color-text-primary)',
      buttonToken: 'var(--color-primary)',
      buttonText: 'Close',
      blocks: [],
    };
  }

  private syncContentBlock(content: string): void {
    const currentConfig = this.guidelineConfig();
    this.guidelineConfig.set({
      ...currentConfig,
      blocks: this.isHtmlEmpty(content) ? [] : [this.createContentBlock(content)],
    });
  }

  private createContentBlock(content: string): ModalBlock {
    return {
      id: 'guideline-content',
      type: 'text',
      content,
      styling: {
        textToken: 'var(--color-text-primary)',
        fontSizeToken: 'var(--fs-base)',
        fontWeightToken: 'var(--fw-regular)',
      },
    };
  }

  private blocksToHtml(blocks: ModalBlock[]): string {
    if (blocks.length === 0) {
      return '';
    }

    if (blocks.length === 1 && this.containsHtml(blocks[0].content)) {
      return blocks[0].content;
    }

    return blocks.map((block) => this.blockToHtml(block)).join('');
  }

  private blockToHtml(block: ModalBlock): string {
    if (this.containsHtml(block.content)) {
      return block.content;
    }

    const content = this.escapeHtml(block.content).replace(/\r?\n/g, '<br>');

    if (block.type === 'heading') {
      return `<h2>${content}</h2>`;
    }

    return `<p>${content}</p>`;
  }

  private containsHtml(value: string): boolean {
    return /<\/?[a-z][\s\S]*>/i.test(value);
  }

  private isHtmlEmpty(html: string): boolean {
    return this.getPlainText(html).trim().length === 0;
  }

  private getPlainText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
