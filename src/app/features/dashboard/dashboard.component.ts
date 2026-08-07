import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import {
  DashboardSummaryDto,
  WorkflowRequestsService,
} from '../../core/services/workflow-requests.service';
import { DashboardSkeletonComponent } from '../../shared/components/dashboard-skeleton/dashboard-skeleton.component';
import {
  ApplicantDashboardComponent,
  FinanceDashboardComponent,
  RmcAdminAnalysisDashboardComponent,
  RmcAdminDashboardComponent,
  SystemAdminDashboardComponent,
  WorkflowActorDashboardComponent,
} from './components/role-dashboards/role-dashboards.component';
import { dashboardConfigFor } from './dashboard.config';
import { RMC_ANALYSIS_MOCK_DATA } from './data/rmc-analysis-dashboard.mock';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardSkeletonComponent,
    ApplicantDashboardComponent,
    WorkflowActorDashboardComponent,
    FinanceDashboardComponent,
    RmcAdminDashboardComponent,
    RmcAdminAnalysisDashboardComponent,
    SystemAdminDashboardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly requests = inject(WorkflowRequestsService);
  private readonly route = inject(ActivatedRoute);

  readonly analysisMode = this.route.snapshot.data['analysis'] === true;
  readonly user = computed(() => this.auth.currentUser());
  readonly username = computed(() => this.user()?.name ?? 'Guest');
  readonly summary = signal<DashboardSummaryDto | null>(null);
  readonly view = computed(() =>
    dashboardConfigFor(
      this.user(),
      this.analysisMode ? null : (this.summary()?.view_type ?? this.summary()?.audience),
    ),
  );
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (this.analysisMode) {
      this.summary.set(RMC_ANALYSIS_MOCK_DATA.summary);
      this.loading.set(false);
      return;
    }
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    this.requests
      .getDashboard()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.summary.set(response.data),
        error: () => this.error.set('Could not load dashboard data. Please try again.'),
      });
  }
}
