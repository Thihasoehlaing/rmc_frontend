import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GuidelinesResponse } from '../../../core/interfaces/components.interface';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-guidelines-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guidelines-modal.component.html',
  styleUrls: ['./guidelines-modal.component.scss'],
})
export class GuidelinesModalComponent implements OnChanges {
  private http = inject(HttpClient);

  @Input() title = 'Guidelines for Applicants';
  @Input() endpoint = '';
  @Input() contentOverride: string | null = null;
  @Input() buttonText = 'Close';
  @Output() closed = new EventEmitter<void>();

  isOpen = signal(false);
  isLoading = signal(false);
  content = signal('');
  private hasFetched = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contentOverride'] && this.contentOverride !== null) {
      this.content.set(this.contentOverride || '<p>No guidelines available at this time.</p>');
      this.isLoading.set(false);
    }
  }

  open(): void {
    this.isOpen.set(true);
    if (this.contentOverride !== null) {
      this.content.set(this.contentOverride || '<p>No guidelines available at this time.</p>');
      this.isLoading.set(false);
      return;
    }

    if (!this.hasFetched) {
      this.fetchGuidelines();
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  private async fetchGuidelines(): Promise<void> {
    if (!this.endpoint) {
      this.content.set('<p>No guidelines endpoint provided.</p>');
      return;
    }

    this.isLoading.set(true);
    try {
      const endpoint = /^https?:\/\//i.test(this.endpoint)
        ? this.endpoint
        : `${environment.apiBaseUrl}/${this.endpoint.replace(/^\/+/, '')}`;
      const res = await firstValueFrom(this.http.get<GuidelinesResponse>(endpoint));
      // Two response shapes are supported: the real admin-settings guideline
      // endpoint returns a single object ({ data: { content_html } }); the
      // older mock endpoints return an array ({ data: [{ rdig_guidelines_content }] }).
      const data = res?.data;
      const html =
        (Array.isArray(data) ? data[0]?.rdig_guidelines_content : data?.content_html) ||
        '<p>No guidelines available at this time.</p>';
      this.content.set(html);
      this.hasFetched = true;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this.content.set('<p>No guidelines available at this time.</p>');
        return;
      }

      console.error('Failed to fetch guidelines:', err);
      this.content.set('<p>Error loading guidelines. Please try again later.</p>');
    } finally {
      this.isLoading.set(false);
    }
  }
}
