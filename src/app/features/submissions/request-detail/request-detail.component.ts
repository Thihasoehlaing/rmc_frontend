import { CommonModule, KeyValue } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, switchMap } from 'rxjs';

import {
  RequestContextDto,
  RequestSummaryDto,
  WorkflowRequestsService,
} from '../../../core/services/workflow-requests.service';
import { formTypeLabel, STATUS_COLORS } from '../../../core/services/request-display.util';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.scss',
})
export class RequestDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly requests = inject(WorkflowRequestsService);

  loading = signal(true);
  error = signal<string | null>(null);
  request = signal<RequestSummaryDto | null>(null);
  context = signal<RequestContextDto | null>(null);

  readonly detail = computed(() => {
    const ctx = this.context();
    return ctx?.form_detail ?? ctx?.rdig ?? ctx?.conference ?? ctx?.journal ?? ctx?.external_project ?? null;
  });

  ngOnInit(): void {
    const requestId = Number(this.route.snapshot.paramMap.get('requestId'));
    if (!Number.isFinite(requestId)) {
      this.error.set('Invalid request id.');
      this.loading.set(false);
      return;
    }

    this.requests
      .getRequest(requestId)
      .pipe(
        switchMap((res) => {
          this.request.set(res.data);
          return this.requests.getFormContext(res.data.form_code, requestId);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => this.context.set(res.data),
        error: () => this.error.set('Could not load the application detail.'),
      });
  }

  get title(): string {
    const req = this.request();
    return req?.title?.trim() || req?.request_code || 'Application Detail';
  }

  get formLabel(): string {
    const req = this.request();
    return formTypeLabel(req?.form_code, req?.form_name);
  }

  statusColor(): string {
    const req = this.request();
    return req ? STATUS_COLORS[req.status_code] ?? '#6b7280' : '#6b7280';
  }

  openPrint(): void {
    const id = this.request()?.id ?? this.request()?.request_id;
    if (id != null) {
      this.requests.downloadPrint(id).subscribe({
        next: (response) => {
          const blob = response.body;
          if (!blob) return;
          const fileName = this.printFileName(
            response.headers.get('content-disposition'),
            this.request()?.request_code ?? 'application',
          );
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = fileName;
          anchor.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.error.set('Could not download the print PDF. Please try again.'),
      });
    }
  }

  keepOrder = (_a: KeyValue<string, unknown>, _b: KeyValue<string, unknown>): number => 0;

  private printFileName(contentDisposition: string | null, fallbackCode: string): string {
    const match = contentDisposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    return match?.[1] ? decodeURIComponent(match[1].replace(/"/g, '')) : `${fallbackCode}.pdf`;
  }
}
