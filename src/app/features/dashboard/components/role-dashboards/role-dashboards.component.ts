import { Component, Input } from '@angular/core';

import { DashboardSummaryDto } from '../../../../core/services/workflow-requests.service';
import { DashboardViewConfig } from '../../dashboard.config';
import { DashboardRoleViewComponent } from '../dashboard-role-view/dashboard-role-view.component';
import { RmcAdminAnalyticsDashboardComponent } from '../rmc-admin-dashboard/rmc-admin-dashboard.component';

@Component({
  selector: 'app-applicant-dashboard',
  standalone: true,
  imports: [DashboardRoleViewComponent],
  template: `<app-dashboard-role-view
    [summary]="summary"
    [view]="view"
    [username]="username"
  ></app-dashboard-role-view>`,
})
export class ApplicantDashboardComponent {
  @Input({ required: true }) summary!: DashboardSummaryDto;
  @Input({ required: true }) view!: DashboardViewConfig;
  @Input() username = 'Guest';
}

@Component({
  selector: 'app-workflow-actor-dashboard',
  standalone: true,
  imports: [DashboardRoleViewComponent],
  template: `<app-dashboard-role-view
    [summary]="summary"
    [view]="view"
    [username]="username"
  ></app-dashboard-role-view>`,
})
export class WorkflowActorDashboardComponent {
  @Input({ required: true }) summary!: DashboardSummaryDto;
  @Input({ required: true }) view!: DashboardViewConfig;
  @Input() username = 'Guest';
}

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [DashboardRoleViewComponent],
  template: `<app-dashboard-role-view
    [summary]="summary"
    [view]="view"
    [username]="username"
  ></app-dashboard-role-view>`,
})
export class FinanceDashboardComponent {
  @Input({ required: true }) summary!: DashboardSummaryDto;
  @Input({ required: true }) view!: DashboardViewConfig;
  @Input() username = 'Guest';
}

@Component({
  selector: 'app-rmc-admin-dashboard',
  standalone: true,
  imports: [DashboardRoleViewComponent],
  template: `<app-dashboard-role-view
    [summary]="summary"
    [view]="view"
    [username]="username"
  ></app-dashboard-role-view>`,
})
export class RmcAdminDashboardComponent {
  @Input({ required: true }) summary!: DashboardSummaryDto;
  @Input({ required: true }) view!: DashboardViewConfig;
  @Input() username = 'Guest';
}

@Component({
  selector: 'app-rmc-admin-analysis-dashboard',
  standalone: true,
  imports: [RmcAdminAnalyticsDashboardComponent],
  template: `<app-rmc-admin-analytics-dashboard
    [summary]="summary"
    [view]="view"
    [username]="username"
  />`,
})
export class RmcAdminAnalysisDashboardComponent {
  @Input({ required: true }) summary!: DashboardSummaryDto;
  @Input({ required: true }) view!: DashboardViewConfig;
  @Input() username = 'Guest';
}

@Component({
  selector: 'app-system-admin-dashboard',
  standalone: true,
  imports: [DashboardRoleViewComponent],
  template: `<app-dashboard-role-view
    [summary]="summary"
    [view]="view"
    [username]="username"
  ></app-dashboard-role-view>`,
})
export class SystemAdminDashboardComponent {
  @Input({ required: true }) summary!: DashboardSummaryDto;
  @Input({ required: true }) view!: DashboardViewConfig;
  @Input() username = 'Guest';
}
