import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { NoteComponent } from '../../../shared/components/note/note.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';
import { RdigDropdownOptionsService, DropdownOptionEntityEntity as DropdownOptionEntity } from '../../../settings/rdig-dropdown-options.service';

@Component({
    selector: 'app-project-details',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        CustomHeaderComponent,
        CustomSubheaderComponent,
        SearchableDropdownComponent,
        CharacterCounterComponent,
        ValidationMessageComponent,
        NoteComponent,
        ReviewBlockComponent
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

    private readonly dropdownService = inject(RdigDropdownOptionsService);
    private readonly destroy$ = new Subject<void>();

    get projectDetails() {
        return this.parentForm.get('projectDetails') as FormGroup;
    }

    get reviewProject() { return this.parentForm.get('reviewProject') as FormGroup; }
    fc(name: string): FormControl { return this.reviewProject.get(name) as FormControl; }

    domains: { label: string; value: string }[] = [];
    filteredSubDomains: { label: string; value: string }[] = [];
    esgs: { label: string; value: string }[] = [];
    sdgs: { label: string; value: string }[] = [];

    private allSubDomainOptions: DropdownOptionEntity[] = [];

    ngOnInit(): void {
        // Load all categories from the service
        this.dropdownService.loadOptions('research_domain').subscribe();
        this.dropdownService.loadOptions('sub_research_domain').subscribe();
        this.dropdownService.loadOptions('esg_factors').subscribe();
        this.dropdownService.loadOptions('sdg_alignment').subscribe();

        // Map domains (only Active)
        this.dropdownService.getOptions('research_domain')
            .pipe(takeUntil(this.destroy$))
            .subscribe(options => {
                this.domains = options
                    .filter(o => o.status === 'Active')
                    .map(o => ({ label: o.optionName, value: o.id.toString() }));
            });

        // Cache all active sub-domains for filtering
        this.dropdownService.getOptions('sub_research_domain')
            .pipe(takeUntil(this.destroy$))
            .subscribe(options => {
                this.allSubDomainOptions = options.filter(o => o.status === 'Active');
                // Re-apply current domain filter if a domain is already selected
                const currentDomain = this.projectDetails.get('domain')?.value;
                if (currentDomain) {
                    this.filterSubDomains(currentDomain);
                }
            });

        // Map ESG factors (only Active)
        this.dropdownService.getOptions('esg_factors')
            .pipe(takeUntil(this.destroy$))
            .subscribe(options => {
                this.esgs = options
                    .filter(o => o.status === 'Active')
                    .map(o => ({ label: o.optionName, value: o.id.toString() }));
            });

        // Map SDG alignment (only Active)
        this.dropdownService.getOptions('sdg_alignment')
            .pipe(takeUntil(this.destroy$))
            .subscribe(options => {
                this.sdgs = options
                    .filter(o => o.status === 'Active')
                    .map(o => ({ label: o.optionName, value: o.id.toString() }));
            });

        // React to domain selection changes → filter sub-domains
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
            this.filteredSubDomains = [];
            return;
        }
        const domainId = parseInt(domainIdStr, 10);
        this.filteredSubDomains = this.allSubDomainOptions
            .filter(o => o.parentDomainId === domainId)
            .map(o => ({ label: o.optionName, value: o.id.toString() }));
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
}
