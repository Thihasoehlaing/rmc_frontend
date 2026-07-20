import { Component } from '@angular/core';
import { CatalogManagerComponent } from './catalog-manager.component';

@Component({
  selector: 'app-manage-project-account-code',
  standalone: true,
  imports: [CatalogManagerComponent],
  template: `
    <app-catalog-manager
      kind="project-account-code"
      title="Manage Project Account Code"
      subtitle="Manage externally sourced project account codes shared by Conference and Journal applications."
      [allowAdd]="false"
      [showCode]="true"
      [showSharedWith]="true"
      codeLabel="Project Account Code"
      nameLabel="Description"
    ></app-catalog-manager>
  `,
})
export class ManageProjectAccountCodeComponent {}
