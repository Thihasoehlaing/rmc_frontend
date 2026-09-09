import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CustomSubheaderComponent } from '../../../../shared/components/custom-subheader/custom-subheader.component';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { CharacterCounterComponent } from '../../../../shared/components/character-counter/character-counter.component';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';
import { MasterDataService } from '../../../../core/services/master-data.service';
import { TextareaAutosizeDirective } from '../../../../shared/directives/textarea-autosize.directive';

@Component({
    selector: 'app-project-details',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        CustomSubheaderComponent,
        SearchableDropdownComponent,
        CharacterCounterComponent,
        ValidationMessageComponent,
        NoteComponent,
        ReviewBlockComponent,
        TextareaAutosizeDirective
    ],
    templateUrl: './project-details.component.html',
    styleUrls: ['./project-details.component.scss']
})
export class ProjectDetailsComponent implements OnInit, OnDestroy {
    @Input({ required: true }) parentForm!: FormGroup;
    @Input() showHosComments = false;
    @Input() showRmcComments = false;
    @Input() showR1Comments = false;
    @Input() showR2Comments = false;
    @Input() showRdigChairComments = false;
    @Input() showVcComments = false;
    @Input() showCeoComments = false;

    get showAnyComments(): boolean {
      return this.showHosComments || this.showRmcComments ||
             this.showR1Comments || this.showR2Comments ||
             this.showRdigChairComments || this.showVcComments || this.showCeoComments;
    }
    @Input() workflow!: RdigWorkflowService;

    private readonly masterData = inject(MasterDataService);
    private readonly router = inject(Router);
    private readonly destroy$ = new Subject<void>();

    get projectDetails() {
        return this.parentForm.get('projectDetails') as FormGroup;
    }

    get reviewProject() { return this.parentForm.get('reviewProject') as FormGroup; }
    fc(name: string): FormControl { return this.reviewProject.get(name) as FormControl; }

    domains = signal<{ label: string; value: string }[]>([]);
    filteredSubDomains = signal<{ label: string; value: string }[]>([]);
    esgs = signal<{ label: string; value: string }[]>([]);
    sdgs = signal<{ label: string; value: string }[]>([]);
    compareOptionValues = (left: unknown, right: unknown): boolean => String(left) === String(right);

    ngOnInit(): void {
        // Domains, ESGs and SDGs come from the real backend master-data lists.
        this.masterData.getResearchDomains()
            .pipe(takeUntil(this.destroy$))
            .subscribe(res => {
                const domains = (res.data ?? [])
                    .filter(o => o.is_active)
                    .map(o => ({ label: o.domain_name, value: o.id.toString() }));
                setTimeout(() => this.domains.set(domains));
            });

        this.masterData.getEsgs()
            .pipe(takeUntil(this.destroy$))
            .subscribe(res => {
                const esgs = (res.data ?? [])
                    .filter(o => o.is_active)
                    .map(o => ({ label: o.esg_name, value: o.id.toString() }));
                setTimeout(() => this.esgs.set(esgs));
            });

        this.masterData.getSdgs()
            .pipe(takeUntil(this.destroy$))
            .subscribe(res => {
                const sdgs = (res.data ?? [])
                    .filter(o => o.is_active)
                    .map(o => ({ label: o.sdg_name, value: o.id.toString() }));
                setTimeout(() => this.sdgs.set(sdgs));
            });

        // React to domain selection changes → fetch that domain's sub-domains
        this.projectDetails.get('domain')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(domainIdStr => {
                this.filterSubDomains(domainIdStr);
                this.projectDetails.get('subDomain')?.setValue('');
            });

        // Apply initial domain filter if form was pre-populated
        const currentDomain = this.projectDetails.get('domain')?.value;
        if (currentDomain) {
            this.filterSubDomains(currentDomain);
        }
    }

    private filterSubDomains(domainIdStr: string): void {
        if (!domainIdStr) {
            this.filteredSubDomains.set([]);
            return;
        }
        const domainId = parseInt(domainIdStr, 10);
        this.masterData.getSubResearchDomains(domainId)
            .pipe(takeUntil(this.destroy$))
            .subscribe(res => {
                const subDomains = (res.data ?? [])
                    .filter(o => o.is_active)
                    .map(o => ({ label: o.sub_domain_name, value: o.id.toString() }));
                setTimeout(() => this.filteredSubDomains.set(subDomains));
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get keywordCount(): number {
        const val: string = this.projectDetails.get('keywords')?.value ?? '';
        if (!val.trim()) return 0;
        return val.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0).length;
    }

    manageResearchDomains(): void {
        // RDIG dropdown options management has been removed
    }

    manageSubResearchDomains(): void {
        // RDIG dropdown options management has been removed
    }

    manageEsg(): void {
        // RDIG dropdown options management has been removed
    }

    manageSdg(): void {
        // RDIG dropdown options management has been removed
    }
}
