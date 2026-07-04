import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
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
import { FormOption, WorkflowService } from '../../../settings/workflow/workflow.service';

export interface GuidelineConfig {
  title: string;
  formId: number | null;
  contentHtml: string;
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
export class AddGuidelineModalComponent implements OnChanges, OnInit {
  private readonly workflowService = inject(WorkflowService);

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<GuidelineConfig>();
  @Input() initialConfig: GuidelineConfig | null = null;
  @Input() editId: number | null = null;
  @Input() isSaving = false;

  @ViewChild('previewModal') previewModal?: GuidelinesModalComponent;

  readonly forms = signal<FormOption[]>([]);

  readonly editorToolbarOptions: QuillToolbarOptions = [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'bullet' }, { list: 'ordered' }],
    ['link'],
    ['clean'],
  ];

  guidelineContent = signal('');
  guidelineConfig = signal<GuidelineConfig>(this.getDefaultConfig());

  ngOnInit(): void {
    this.workflowService.listForms().subscribe({
      next: (res) => {
        if (res.success) {
          this.forms.set((res.data ?? []).filter((f) => f.is_active));
        }
      },
      error: () => this.forms.set([]),
    });
  }

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

  onFormChange(formIdStr: string): void {
    const formId = formIdStr ? Number(formIdStr) : null;
    this.guidelineConfig.update((config) => ({ ...config, formId }));
  }

  onContentChange(content: string): void {
    this.guidelineContent.set(content);
    this.guidelineConfig.update((config) => ({ ...config, contentHtml: content }));
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
    return (
      this.isContentEmpty() ||
      this.guidelineConfig().title.trim().length === 0 ||
      this.guidelineConfig().formId === null
    );
  }

  isContentEmpty(): boolean {
    return this.getPlainText(this.guidelineContent()).trim().length === 0;
  }

  private loadInitialConfig(config: GuidelineConfig): void {
    this.guidelineContent.set(config.contentHtml);
    this.guidelineConfig.set({ ...config });
  }

  private resetConfig(): void {
    this.guidelineContent.set('');
    this.guidelineConfig.set(this.getDefaultConfig());
  }

  private getDefaultConfig(): GuidelineConfig {
    return {
      title: '',
      formId: null,
      contentHtml: '',
    };
  }

  private getPlainText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ');
  }
}
