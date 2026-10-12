import { Component } from '@angular/core';
import { CatalogManagerComponent } from './catalog-manager.component';

@Component({
  selector: 'app-manage-currency',
  standalone: true,
  imports: [CatalogManagerComponent],
  template: `
    <app-catalog-manager
      kind="currency"
      title="Manage Currencies"
      subtitle="Maintain currency codes and their linked countries."
      [allowAdd]="true"
      [showCode]="true"
      [showSharedWith]="false"
      codeLabel="Currency Code"
      nameLabel="Currency Name"
    ></app-catalog-manager>
  `,
})
export class ManageCurrencyComponent {}
