import { Component } from '@angular/core';
import { CatalogManagerComponent } from './catalog-manager.component';

@Component({
  selector: 'app-manage-external-form-category',
  standalone: true,
  imports: [CatalogManagerComponent],
  template: `
    <app-catalog-manager
      kind="external-grant-category"
      title="Manage External Form Category"
      subtitle="Manage the External Grant Category options displayed on the External Project Data Entry form."
      [allowAdd]="true"
      [showCode]="false"
      [showSharedWith]="false"
      nameLabel="External Grant Category"
    ></app-catalog-manager>
  `,
})
export class ManageExternalFormCategoryComponent {}
