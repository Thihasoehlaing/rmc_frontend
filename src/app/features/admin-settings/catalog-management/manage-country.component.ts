import { Component } from '@angular/core';
import { CatalogManagerComponent } from './catalog-manager.component';

@Component({
  selector: 'app-manage-country',
  standalone: true,
  imports: [CatalogManagerComponent],
  template: `
    <app-catalog-manager
      kind="country"
      title="Manage Countries"
      subtitle="Maintain country options used by RDIG external collaborator forms."
      [allowAdd]="true"
      [showCode]="true"
      [showSharedWith]="false"
      codeLabel="Country Code"
      nameLabel="Country Name"
    ></app-catalog-manager>
  `,
})
export class ManageCountryComponent {}
