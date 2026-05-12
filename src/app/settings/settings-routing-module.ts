import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminSettingsComponent } from './admin-settings/admin-settings.component';
import { GuidelinesComponent } from './guidelines/guidelines.component';
import { DropdownsComponent } from './dropdowns/dropdowns.component';
import { BatchesComponent } from './batches/batches.component';
import { StaffAccessComponent } from './staff-access/staff-access.component';

const routes: Routes = [
  { path: 'admin-settings', component: AdminSettingsComponent },
  { path: 'guidelines', component: GuidelinesComponent },
  { path: 'dropdowns', component: DropdownsComponent },
  { path: 'rdig-dropdown-options', component: DropdownsComponent },
  { path: 'batches', component: BatchesComponent },
  { path: 'staff-access', component: StaffAccessComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
