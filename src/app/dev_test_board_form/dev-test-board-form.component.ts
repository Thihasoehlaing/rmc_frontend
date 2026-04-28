import { Component, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomHeaderComponent } from '../shared/components/custom-header/custom-header.component';
import { SearchableDropdownComponent } from '../shared/components/searchable-dropdown/searchable-dropdown.component';

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

export interface ModalConfig {
  title: string;
  backgroundToken: string;
  textToken: string;
  buttonToken: string;
  buttonText: string;
  blocks: ModalBlock[];
}

// Design Token Definitions
const DESIGN_TOKENS = {
  colors: [
    { label: 'Primary Blue', value: 'var(--color-primary)' },
    { label: 'Text Primary', value: 'var(--color-text-primary)' },
    { label: 'Text Muted', value: 'var(--color-text-muted)' },
    { label: 'Success Green', value: 'var(--color-success)' },
    { label: 'Warning Orange', value: 'var(--color-warning)' },
    { label: 'Error Red', value: 'var(--color-error)' },
    { label: 'Info Cyan', value: 'var(--color-info)' },
    { label: 'Border', value: 'var(--color-border)' },
    { label: 'Background', value: 'var(--color-background)' },
  ],
  backgrounds: [
    { label: 'White', value: 'white' },
    { label: 'Light Gray', value: 'var(--color-bg-light)' },
    { label: 'Light Blue', value: 'var(--color-bg-light-blue)' },
    { label: 'Light Green', value: 'var(--color-bg-light-green)' },
    { label: 'Light Yellow', value: 'var(--color-bg-light-yellow)' },
    { label: 'Light Red', value: 'var(--color-bg-light-red)' },
  ],
  buttons: [
    { label: 'Primary Blue', value: 'var(--color-primary)' },
    { label: 'Success Green', value: 'var(--color-success)' },
    { label: 'Warning Orange', value: 'var(--color-warning)' },
    { label: 'Error Red', value: 'var(--color-error)' },
    { label: 'Info Cyan', value: 'var(--color-info)' },
  ],
  warningBoxes: [
    { label: 'Yellow (Default)', value: 'var(--color-bg-light-yellow)' },
    { label: 'Light Orange', value: 'var(--color-bg-light-orange)' },
    { label: 'Light Red', value: 'var(--color-bg-light-red)' },
    { label: 'Light Blue', value: 'var(--color-bg-light-blue)' },
  ],
  infoBoxes: [
    { label: 'Light Blue (Default)', value: 'var(--color-bg-light-blue)' },
    { label: 'Light Cyan', value: 'var(--color-bg-light-cyan)' },
    { label: 'Light Purple', value: 'var(--color-bg-light-purple)' },
    { label: 'Light Green', value: 'var(--color-bg-light-green)' },
  ],
  fontSizes: [
    { label: 'Display Heading (2rem)', value: 'var(--fs-3xl)' },
    { label: 'Section Heading (1.75rem)', value: 'var(--fs-2xl)' },
    { label: 'Large Title (1.5rem)', value: 'var(--fs-xl)' },
    { label: 'Sub-title (1.25rem)', value: 'var(--fs-lg)' },
    { label: 'Emphasis Text (1.125rem)', value: 'var(--fs-md)' },
    { label: 'Body Text (1rem)', value: 'var(--fs-base)' },
    { label: 'Small Text (0.85rem)', value: 'var(--fs-sm)' },
    { label: 'Micro Label (0.75rem)', value: 'var(--fs-xs)' },
  ],
  fontWeights: [
    { label: 'Light (300)', value: 'var(--fw-light)' },
    { label: 'Regular (400)', value: 'var(--fw-regular)' },
    { label: 'Medium (500)', value: 'var(--fw-medium)' },
    { label: 'Semibold (600)', value: 'var(--fw-semibold)' },
    { label: 'Bold (700)', value: 'var(--fw-bold)' },
    { label: 'Black (900)', value: 'var(--fw-black)' },
  ],
};

@Component({
  selector: 'app-dev-test-board-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomHeaderComponent,
    SearchableDropdownComponent,
  ],
  templateUrl: './dev-test-board-form.component.html',
  styleUrl: './dev-test-board-form.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DevTestBoardFormComponent {
  editorForm: FormGroup;
  modalConfig = signal<ModalConfig>({
    title: 'Guidelines for Applicants',
    backgroundToken: 'white',
    textToken: 'var(--color-text-primary)',
    buttonToken: 'var(--color-primary)',
    buttonText: 'Close',
    blocks: [],
  });
  isPreviewFullscreen = signal<boolean>(false);

  blockForms: Map<string, FormGroup> = new Map();

  colorTokens = DESIGN_TOKENS.colors;
  backgroundTokens = DESIGN_TOKENS.backgrounds;
  buttonTokens = DESIGN_TOKENS.buttons;
  warningBoxTokens = DESIGN_TOKENS.warningBoxes;
  infoBoxTokens = DESIGN_TOKENS.infoBoxes;
  fontSizeTokens = DESIGN_TOKENS.fontSizes;
  fontWeightTokens = DESIGN_TOKENS.fontWeights;

  constructor(private fb: FormBuilder) {
    this.editorForm = this.fb.group({
      title: ['Guidelines for Applicants', Validators.required],
      backgroundToken: ['white', Validators.required],
      textToken: ['var(--color-text-primary)', Validators.required],
      buttonToken: ['var(--color-primary)', Validators.required],
      buttonText: ['Close', Validators.required],
    });

    // Subscribe to form changes
    this.editorForm.valueChanges.subscribe((values) => {
      const currentConfig = this.modalConfig();
      this.modalConfig.set({
        ...currentConfig,
        title: values.title,
        backgroundToken: values.backgroundToken,
        textToken: values.textToken,
        buttonToken: values.buttonToken,
        buttonText: values.buttonText,
      });
    });
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
        bgToken: type === 'warning' ? 'var(--color-bg-light-yellow)' : type === 'highlight' ? 'var(--color-bg-light)' : type === 'info' ? 'var(--color-bg-light-blue)' : undefined,
        textToken: 'var(--color-text-primary)',
        fontSizeToken: defaults[type].fontSize,
        fontWeightToken: defaults[type].fontWeight,
      },
    };

    const currentConfig = this.modalConfig();
    this.modalConfig.set({
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
    const currentConfig = this.modalConfig();
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
    this.modalConfig.set({ ...currentConfig, blocks: updatedBlocks });
  }

  removeBlock(id: string) {
    const currentConfig = this.modalConfig();
    this.modalConfig.set({
      ...currentConfig,
      blocks: currentConfig.blocks.filter((b) => b.id !== id),
    });
    this.blockForms.delete(id);
  }

  exportConfig() {
    console.log('Exported Configuration:', this.modalConfig());
  }

  togglePreviewFullscreen() {
    this.isPreviewFullscreen.update((val) => !val);
  }

  trackByBlockId(index: number, block: ModalBlock) {
    return block.id;
  }
}
