import { Component, Input, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { NoteComponent } from '../../../shared/components/note/note.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';

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
export class ProjectDetailsComponent implements OnInit {
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

    get projectDetails() {
        return this.parentForm.get('projectDetails') as FormGroup;
    }

    // ── Review form controls ─────────────────────────────────────
    get reviewProject() { return this.parentForm.get('reviewProject') as FormGroup; }
    fc(name: string): FormControl { return this.reviewProject.get(name) as FormControl; }

    domains = [
        { label: 'Cloud Computing & IoT', value: 'cloud' },
        { label: 'Artificial Intelligence', value: 'ai' },
        { label: 'Sustainability & Green Tech', value: 'sustainability' },
        { label: 'Biomedical Sciences', value: 'biomedical' },
        { label: 'Data Science & Analytics', value: 'data' }
    ];

    subDomainsMap: Record<string, { label: string; value: string }[]> = {
        cloud: [
            { label: 'Edge Computing', value: 'edge' },
            { label: 'Cloud Security', value: 'sec' }
        ],
        ai: [
            { label: 'Machine Learning', value: 'ml' },
            { label: 'Natural Language Processing', value: 'nlp' },
            { label: 'Computer Vision', value: 'cv' }
        ],
        sustainability: [
            { label: 'Renewable Energy', value: 'energy' },
            { label: 'Circular Economy', value: 'circular' }
        ],
        biomedical: [
            { label: 'Genomics', value: 'genomics' },
            { label: 'Drug Discovery', value: 'drug' }
        ],
        data: [
            { label: 'Big Data', value: 'bigdata' },
            { label: 'Business Intelligence', value: 'bi' }
        ]
    };

    filteredSubDomains: { label: string; value: string }[] = [];

    esgs = [
        { label: 'Environmental', value: 'env' },
        { label: 'Social', value: 'soc' },
        { label: 'Governance', value: 'gov' }
    ];

    sdgs = Array.from({ length: 17 }, (_, i) => ({
        label: `SDG ${i + 1}: ${this.getSdgLabel(i + 1)}`,
        value: `sdg${i + 1}`
    }));

    ngOnInit(): void {
        this.projectDetails.get('domain')?.valueChanges.subscribe(domain => {
            this.filteredSubDomains = this.subDomainsMap[domain] ?? [];
            this.projectDetails.get('subDomain')?.setValue('');
        });

        const currentDomain = this.projectDetails.get('domain')?.value;
        if (currentDomain) {
            this.filteredSubDomains = this.subDomainsMap[currentDomain] ?? [];
        }
    }

    getSdgLabel(n: number): string {
        const labels = [
            'No Poverty', 'Zero Hunger', 'Good Health & Well-being', 'Quality Education',
            'Gender Equality', 'Clean Water & Sanitation', 'Affordable & Clean Energy',
            'Decent Work & Economic Growth', 'Industry, Innovation & Infrastructure',
            'Reduced Inequalities', 'Sustainable Cities & Communities',
            'Responsible Consumption & Production', 'Climate Action', 'Life Below Water',
            'Life on Land', 'Peace, Justice & Strong Institutions', 'Partnerships for the Goals'
        ];
        return labels[n - 1] ?? '';
    }

    get keywordCount(): number {
        const val: string = this.projectDetails.get('keywords')?.value ?? '';
        if (!val.trim()) return 0;
        return val.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0).length;
    }
}
