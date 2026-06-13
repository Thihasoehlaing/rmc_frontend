import { Component, signal, inject, ViewEncapsulation, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

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

const DESIGN_TOKENS = {
  colors: [
    { label: 'Primary Blue', value: 'var(--color-primary)' },
    { label: 'Text Primary', value: 'var(--color-text-primary)' },
    { label: 'Text Muted', value: 'var(--color-text-muted)' },
    { label: 'Success Green', value: 'var(--color-success)' },
    { label: 'Warning Orange', value: 'var(--color-warning)' },
    { label: 'Error Red', value: 'var(--color-error)' },
    { label: 'Info Cyan', value: 'var(--color-info)' },
  ],
  backgrounds: [
    { label: 'White', value: 'white' },
    { label: 'Light Gray', value: 'var(--color-bg-light)' },
    { label: 'Light Blue', value: 'var(--color-bg-light-blue)' },
    { label: 'Light Green', value: 'var(--color-bg-light-green)' },
  ],
  fontSizes: [
    { label: 'Display Heading (2rem)', value: 'var(--fs-3xl)' },
    { label: 'Section Heading (1.75rem)', value: 'var(--fs-2xl)' },
    { label: 'Large Title (1.5rem)', value: 'var(--fs-xl)' },
    { label: 'Sub-title (1.25rem)', value: 'var(--fs-lg)' },
    { label: 'Body Text (1rem)', value: 'var(--fs-base)' },
    { label: 'Small Text (0.85rem)', value: 'var(--fs-sm)' },
  ],
  fontWeights: [
    { label: 'Regular (400)', value: 'var(--fw-regular)' },
    { label: 'Medium (500)', value: 'var(--fw-medium)' },
    { label: 'Semibold (600)', value: 'var(--fw-semibold)' },
    { label: 'Bold (700)', value: 'var(--fw-bold)' },
  ],
};

@Component({
  selector: 'app-add-guideline-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './add-guideline-modal.component.html',
  styleUrls: ['./add-guideline-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AddGuidelineModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<GuidelineConfig>();
  @Input() initialConfig: GuidelineConfig | null = null;
  @Input() editId: number | null = null;

  private fb = inject(FormBuilder);

  editorForm: FormGroup;
  guidelineConfig = signal<GuidelineConfig>({
    title: 'Guidelines',
    formName: 'Conference Application',
    backgroundToken: 'white',
    textToken: 'var(--color-text-primary)',
    buttonToken: 'var(--color-primary)',
    buttonText: 'Close',
    blocks: [],
  });

  blockForms: Map<string, FormGroup> = new Map();

  colorTokens = DESIGN_TOKENS.colors;
  backgroundTokens = DESIGN_TOKENS.backgrounds;
  fontSizeTokens = DESIGN_TOKENS.fontSizes;
  fontWeightTokens = DESIGN_TOKENS.fontWeights;

  formOptions = [
    { label: 'Conference Application', value: 'Conference Application' },
    { label: 'Journal Application', value: 'Journal Application' },
    { label: 'Partnership Application', value: 'Partnership Application' },
    { label: 'RA/GRA Application', value: 'RA/GRA Application' },
    { label: 'RDIG Application', value: 'RDIG Application' },
  ];

  blockTypes: { label: string; value: BlockType; icon: string }[] = [
    { label: 'Text', value: 'text', icon: 'text_fields' },
    { label: 'Highlight', value: 'highlight', icon: 'highlight' },
    { label: 'Heading', value: 'heading', icon: 'title' },
    { label: 'Warning', value: 'warning', icon: 'warning' },
    { label: 'Info', value: 'info', icon: 'info' },
  ];

  isPreviewFullscreen = signal(false);

  constructor() {
    this.editorForm = this.fb.group({
      title: ['Guidelines', Validators.required],
      formName: ['Conference Application', Validators.required],
      backgroundToken: ['white', Validators.required],
      textToken: ['var(--color-text-primary)', Validators.required],
      buttonToken: ['var(--color-primary)', Validators.required],
      buttonText: ['Close', Validators.required],
    });

    this.editorForm.valueChanges.subscribe((values) => {
      const currentConfig = this.guidelineConfig();
      this.guidelineConfig.set({
        ...currentConfig,
        title: values.title,
        formName: values.formName,
        backgroundToken: values.backgroundToken,
        textToken: values.textToken,
        buttonToken: values.buttonToken,
        buttonText: values.buttonText,
      });
    });

    // If the modal is instantiated with an initial config (edit mode), load it.
    if (this.initialConfig) {
      this.loadInitialConfig(this.initialConfig);
    }
  }

  ngOnInit() {
    if (this.initialConfig) {
      this.loadInitialConfig(this.initialConfig);
    }
  }

  private loadInitialConfig(config: GuidelineConfig) {
    // set the main form values
    this.editorForm.patchValue({
      title: config.title,
      formName: config.formName,
      backgroundToken: config.backgroundToken,
      textToken: config.textToken,
      buttonToken: config.buttonToken,
      buttonText: config.buttonText,
    });

    // set the guideline signal and create block forms
    this.guidelineConfig.set({ ...config });

    // clear any existing block forms then recreate from config
    this.blockForms.forEach((_, key) => this.blockForms.delete(key));
    config.blocks.forEach((b) => this.createBlockForm(b));
  }

  addBlock(type: BlockType) {
    const id = Date.now().toString();
    const defaults = {
      text: { fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-regular)' },
      highlight: { fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-bold)' },
      heading: { fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-bold)' },
      warning: { fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-regular)' },
      info: { fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-regular)' },
    };

    const newBlock: ModalBlock = {
      id,
      type,
      content: '',
      styling: {
        bgToken:
          type === 'highlight'
            ? 'var(--color-warning-light)'
            : type === 'warning'
              ? 'var(--color-bg-light-yellow)'
              : type === 'info'
                ? 'var(--color-bg-light-blue)'
                : undefined,
        textToken: 'var(--color-text-primary)',
        fontSizeToken: defaults[type].fontSize,
        fontWeightToken: defaults[type].fontWeight,
      },
    };

    const currentConfig = this.guidelineConfig();
    this.guidelineConfig.set({
      ...currentConfig,
      blocks: [...currentConfig.blocks, newBlock],
    });

    this.createBlockForm(newBlock);
  }

  createBlockForm(block: ModalBlock) {
    const form = this.fb.group({
      content: [block.content, Validators.required],
      bgToken: [block.styling?.bgToken || '#ffffff'],
      textToken: [block.styling?.textToken || 'var(--color-text-primary)'],
      fontSizeToken: [block.styling?.fontSizeToken || 'var(--fs-base)'],
      fontWeightToken: [block.styling?.fontWeightToken || 'var(--fw-regular)'],
    });

    form.valueChanges.subscribe((values) => {
      this.updateBlock(block.id, values);
    });

    this.blockForms.set(block.id, form);
  }

  updateBlock(id: string, values: any) {
    const currentConfig = this.guidelineConfig();
    const updatedBlocks = currentConfig.blocks.map((block) =>
      block.id === id
        ? {
            ...block,
            content: values.content,
            styling: {
              bgToken: values.bgToken,
              textToken: values.textToken,
              fontSizeToken: values.fontSizeToken,
              fontWeightToken: values.fontWeightToken,
            },
          }
        : block
    );
    this.guidelineConfig.set({ ...currentConfig, blocks: updatedBlocks });
  }

  reorderBlocks(event: CdkDragDrop<ModalBlock[]>) {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const currentConfig = this.guidelineConfig();
    const reorderedBlocks = [...currentConfig.blocks];
    moveItemInArray(reorderedBlocks, event.previousIndex, event.currentIndex);
    this.guidelineConfig.set({ ...currentConfig, blocks: reorderedBlocks });
  }

  removeBlock(id: string) {
    const currentConfig = this.guidelineConfig();
    this.guidelineConfig.set({
      ...currentConfig,
      blocks: currentConfig.blocks.filter((b) => b.id !== id),
    });
    this.blockForms.delete(id);
  }

  togglePreviewFullscreen() {
    this.isPreviewFullscreen.update((val) => !val);
  }

  onClose() {
    this.close.emit();
  }

  onSave() {
    if (this.editorForm.valid && this.guidelineConfig().blocks.length > 0) {
      this.save.emit(this.guidelineConfig());
      this.close.emit();
    }
  }

  trackByBlockId(index: number, block: ModalBlock) {
    return block.id;
  }
}
