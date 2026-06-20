import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConferenceGuidelinesModalComponent } from '../conference-guidelines-modal/conference-guidelines-modal.component';
import { ConferenceDetailsFormComponent } from '../forms/conference-details-form/conference-details-form.component';
import { AuthorDetailsFormComponent } from '../forms/author-details-form/author-details-form.component';
import { SupportingDocumentsFormComponent } from '../forms/supporting-documents-form/supporting-documents-form.component';
import { DeclarationFormComponent } from '../forms/declaration-form/declaration-form.component';

interface FormSection {
  id: string;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-conference-form-accordion',
  standalone: true,
  imports: [
    CommonModule,
    ConferenceGuidelinesModalComponent,
    ConferenceDetailsFormComponent,
    AuthorDetailsFormComponent,
    SupportingDocumentsFormComponent,
    DeclarationFormComponent
  ],
  templateUrl: './conference-form-accordion.component.html',
  styleUrl: './conference-form-accordion.component.scss'
})
export class ConferenceFormAccordionComponent {
  activeSection = signal<string>('conference-details');

  formSections: FormSection[] = [
    {
      id: 'conference-details',
      title: 'Conference Details',
      icon: 'conference'
    },
    {
      id: 'author-details',
      title: 'Author Details',
      icon: 'person'
    },
    {
      id: 'supporting-documents',
      title: 'Supporting Documents / Manuscript Details',
      icon: 'description'
    },
    {
      id: 'declaration',
      title: 'Declaration',
      icon: 'check_circle'
    }
  ];

  toggleSection(sectionId: string) {
    this.activeSection.set(this.activeSection() === sectionId ? '' : sectionId);
  }

  isActive(sectionId: string): boolean {
    return this.activeSection() === sectionId;
  }
}
