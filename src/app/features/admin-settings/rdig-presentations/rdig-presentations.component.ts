import { HttpClient } from '@angular/common/http';
import { finalize, Subject, switchMap, catchError, of, from, concatMap, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MasterDataService, StaffOption } from '../../../core/services/master-data.service';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BatchSittingService } from '../batch-sitting.service';
import { BatchSitting } from '../../../core/interfaces/batch-sitting.interface';
import { AdminSettingsPageHeaderComponent } from '../../../shared/components/admin-settings-page-header/admin-settings-page-header.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { formatMalaysiaScheduleDateTime } from '../../../shared/utils/date-time.util';

interface InvitationApplication {
  id: number; request_code: string; project_title: string; applicant_name: string;
  recipients: {recipient_username: string; recipient_name: string; recipient_email: string; recipient_type: string}[];
  invitation_status: 'SENT' | 'PARTIAL' | 'NOT_SENT';
}
interface InvitationResult {sent: number; already_sent: number; failed: number; skipped: number;}

interface PresentationSlot {
  id: number; batch_id: number; start_at: string; duration_minutes: number;
  venue: string; status: string; attendees: StaffOption[];
}

@Component({
  selector: 'app-rdig-presentations', standalone: true,
  imports: [SearchableDropdownComponent, FormsModule, ReactiveFormsModule, RouterLink, AdminSettingsPageHeaderComponent,
    DialogComponent, DatePickerComponent, ValidationMessageComponent],
  templateUrl: './rdig-presentations.component.html',
  styleUrl: './rdig-presentations.component.scss',
})
export class RdigPresentationsComponent {
  private readonly http = inject(HttpClient);
  private readonly slotsUrl = `${environment.apiUrl}/admin-settings/rdig-presentations/slots`;
  private readonly applicationsUrl = `${environment.apiUrl}/admin-settings/rdig-presentations/applications`;
  private readonly invitationRequests = new Subject<string>();
  readonly applications = signal<InvitationApplication[]>([]);
  readonly applicationsLoading = signal(false);
  readonly invitationsError = signal('');
  readonly selectedApplications = signal<number[]>([]);
  readonly sending = signal(false);
  readonly invitationMessage = signal('');
  private readonly slotRequests = new Subject<string>();
  readonly slots = signal<PresentationSlot[]>([]);
  readonly slotsLoading = signal(false);
  readonly slotsError = signal('');
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly saveSuccess = signal('');
  private readonly batchesApi = inject(BatchSittingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly staffApi = inject(MasterDataService);
  readonly staffResults = signal<StaffOption[]>([]);
  readonly selectedAttendees = signal<StaffOption[]>([]);
  readonly staffError = signal('');
  attendeeIds: number[] = [];
  readonly batches = signal<BatchSitting[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly tab = signal<'slots' | 'invitations'>('slots');
  readonly slotDialog = signal(false);
  readonly mailDialog = signal(false);
  batchId = '';
  search = '';
  slotStatus = 'all';
  readonly form = this.fb.nonNullable.group({
    date: ['', Validators.required], time: ['', Validators.required],
    duration: [20, [Validators.required, Validators.min(1), Validators.max(1440)]],
    venue: ['', [Validators.required, Validators.maxLength(500)]],
    attendees: this.fb.nonNullable.control<number[]>([], Validators.required),
  });
  constructor() {
    this.invitationRequests.pipe(switchMap(batchId => {
      this.applicationsLoading.set(true); this.invitationsError.set('');
      this.applications.set([]); this.selectedApplications.set([]);
      return this.http.get<{data: {items: InvitationApplication[]}}>(this.applicationsUrl, {params: {batch_id: batchId}}).pipe(
        catchError(error => { this.invitationsError.set(error?.error?.message || 'Unable to load approved applications.'); return of(null); }),
      );
    }), takeUntilDestroyed(this.destroyRef)).subscribe(response => {
      this.applications.set(response?.data.items ?? []); this.applicationsLoading.set(false);
    });
    this.slotRequests.pipe(switchMap(batchId => {
      this.slotsLoading.set(true); this.slotsError.set(''); this.slots.set([]);
      return this.http.get<{data: {items: PresentationSlot[]}}>(this.slotsUrl, {params: {batch_id: batchId}}).pipe(
        catchError(error => { this.slotsError.set(error?.error?.message || 'Unable to load presentation slots.'); return of(null); }),
      );
    }), takeUntilDestroyed(this.destroyRef)).subscribe(response => {
      this.slots.set(response?.data.items ?? []); this.slotsLoading.set(false);
    });
    this.loadBatches();
    this.staffApi.searchStaff().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.staffResults.set(response.data),
      error: () => this.staffError.set('Unable to load staff. Please refresh the page to try again.'),
    });
  }
  staffOptions() {
    return this.staffResults().map(staff => ({
      label: `${staff.fullname || staff.username} (${staff.username})`, value: staff.id,
    }));
  }
  selectAttendees(ids: number[]): void {
    this.attendeeIds = [...new Set(ids)];
    this.selectedAttendees.set(this.staffResults().filter(staff => this.attendeeIds.includes(staff.id)));
    this.syncAttendees();
  }
  removeAttendee(id: number): void {
    this.selectAttendees(this.attendeeIds.filter(value => value !== id));
  }
  private syncAttendees(): void {
    this.form.controls.attendees.setValue(this.selectedAttendees().map(staff => staff.id));
    this.form.controls.attendees.markAsTouched();
  }
  loadBatches(): void {
    this.loading.set(true); this.error.set('');
    this.batchesApi.loadAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: batches => {
        this.batches.set(batches);
        if (!this.batchId) this.batchId = String(batches.find(b => b.status === 'active')?.id ?? batches[0]?.id ?? '');
        this.loading.set(false);
        this.loadSlots();
      },
      error: () => { this.error.set('Unable to load batches. Please try again.'); this.loading.set(false); },
    });
  }
  loadSlots(): void {
    if (this.batchId) { this.slotRequests.next(this.batchId); this.invitationRequests.next(this.batchId); }
  }
  visibleApplications(): InvitationApplication[] {
    const query = this.search.trim().toLowerCase();
    return this.applications().filter(item => `${item.request_code} ${item.applicant_name} ${item.project_title}`.toLowerCase().includes(query));
  }
  toggleApplication(id: number): void {
    this.selectedApplications.update(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
  }
  allSelected(): boolean {
    const items = this.visibleApplications().filter(item => item.invitation_status !== 'SENT');
    return items.length > 0 && items.every(item => this.selectedApplications().includes(item.id));
  }
  toggleAll(): void {
    this.selectedApplications.set(this.allSelected() ? [] : this.visibleApplications()
      .filter(item => item.invitation_status !== 'SENT').map(item => item.id));
  }
  internalTeam(item: InvitationApplication): string {
    return item.recipients.filter(person => person.recipient_type === 'CO_RESEARCHER')
      .map(person => person.recipient_name || person.recipient_username).join(', ') || '—';
  }
  sendInvitations(): void {
    if (this.sending() || !this.selectedApplications().length) return;
    this.sending.set(true); this.invitationMessage.set('');
    let sent = 0; let already = 0; let unsuccessful = 0;
    from([...this.selectedApplications()]).pipe(concatMap(id => this.http.post<{data: InvitationResult}>(
      `${this.applicationsUrl}/${id}/invite`, {},
    ).pipe(tap(response => {
      sent += response.data.sent; already += response.data.already_sent;
      unsuccessful += response.data.failed + response.data.skipped;
    }), catchError(error => {
      unsuccessful++;
      this.invitationsError.set(error?.error?.message || 'An invitation could not be processed.');
      return of(null);
    }))), takeUntilDestroyed(this.destroyRef), finalize(() => this.sending.set(false))).subscribe({
      complete: () => {
        const error = this.invitationsError();
        this.invitationMessage.set(`${sent} email(s) sent. ${already} already sent. ${unsuccessful} failed or skipped.`);
        // Refresh recorded delivery statuses after processing the selected applications.
        if (this.batchId) this.invitationRequests.next(this.batchId);
        if (error) this.invitationsError.set(error);
      },
    });
  }
  visibleSlots(): PresentationSlot[] {
    const query = this.search.trim().toLowerCase();
    return this.slots().filter(slot => (this.slotStatus === 'all' || slot.status === this.slotStatus)
      && (!query || `${slot.venue} ${slot.attendees.map(staff => staff.fullname).join(' ')}`.toLowerCase().includes(query)));
  }
  saveSlot(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.batchId) return;
    this.saving.set(true); this.saveError.set(''); this.saveSuccess.set('');
    const value = this.form.getRawValue();
    this.http.post<{data: PresentationSlot}>(this.slotsUrl, {
      batch_id: Number(this.batchId), start_at: `${value.date}T${value.time}:00`,
      duration_minutes: value.duration, venue: value.venue, attendee_ids: value.attendees,
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.slotDialog.set(false); this.saveSuccess.set('Presentation slot saved.'); this.loadSlots(); },
      error: error => this.saveError.set(error?.error?.message || 'Unable to save this slot. Please try again.'),
    });
  }
  closeSlot(): void { if (!this.saving()) this.slotDialog.set(false); }
  selectedBatch(): BatchSitting | undefined { return this.batches().find(b => String(b.id) === this.batchId); }
  period(value: string | null | undefined): string { return formatMalaysiaScheduleDateTime(value, 'Not configured'); }
  openSlot(): void {
    this.saveError.set('');
    this.form.reset({date: '', time: '', duration: 20, venue: '', attendees: []});
    this.selectedAttendees.set([]);
    this.attendeeIds = [];
    this.slotDialog.set(true);
  }
}
