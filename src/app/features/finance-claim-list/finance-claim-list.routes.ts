import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { fundingApplicationPermission } from '../../core/routing/app-route-permissions';

export const financeClaimListRoutes: Routes = [
	{
		path: '',
		canActivate: [permissionGuard],
		data: {
			permission: fundingApplicationPermission,
		},
		loadComponent: () =>
			import('./finance-claim-list.component').then(m => m.FinanceClaimListComponent),
	},
];
