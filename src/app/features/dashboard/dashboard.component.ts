import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { finalize, switchMap } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { LayoutStartupService } from '../../core/services/layout-startup.service';
import { DashboardSummaryDto, WorkflowRequestsService } from '../../core/services/workflow-requests.service';
import { DashboardSkeletonComponent } from '../../shared/components/dashboard-skeleton/dashboard-skeleton.component';
import {
  ApplicantDashboardComponent,
  FinanceDashboardComponent,
  RmcAdminDashboardComponent,
  SystemAdminDashboardComponent,
  WorkflowActorDashboardComponent,
} from './components/role-dashboards/role-dashboards.component';
import { dashboardConfigFor } from './dashboard.config';

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
    SystemAdminDashboardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly layoutStartup = inject(LayoutStartupService);
  private readonly requests = inject(WorkflowRequestsService);

  readonly user = computed(() => this.auth.currentUser());
  readonly username = computed(() => this.user()?.name ?? 'Guest');
  readonly summary = signal<DashboardSummaryDto | null>(null);
  readonly view = computed(() =>
    dashboardConfigFor(this.user(), this.summary()?.view_type ?? this.summary()?.audience),
  );
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    this.layoutStartup.start().pipe(
      switchMap(() => this.requests.getDashboard()),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (response) => this.summary.set(response.data),
      error: () => this.error.set('Could not load dashboard data. Please try again.'),
    });
  }
}
