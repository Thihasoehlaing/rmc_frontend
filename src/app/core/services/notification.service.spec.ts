import '@angular/compiler';

import { mapBackendNotification } from './notification.service';

describe('mapBackendNotification', () => {
  it('uses the notification id and routes request notifications to application detail', () => {
    const notification = mapBackendNotification({
      id: 17,
      recipient_id: 42,
      request_id: 9,
      form_code: 'JOURNAL',
      request_no: 'JOUR-260001',
      event_type: 'REQUEST_WAITING_REVIEW',
      redirect_url: '/journal/application/9',
      title: 'Review required',
      message: 'Please review this request.',
      is_read: false,
      created_at: '2026-07-13T08:00:00',
    });

    expect(notification.id).toBe(17);
    expect(notification.type).toBe('ACTION');
    expect(notification.data['recipientId']).toBe(42);
    expect(notification.data['entityModule']).toBe('journal');
    expect(notification.data['route']).toBe('/journal/detail/JOUR-260001');
  });

  it('keeps the backend redirect for notifications without a request', () => {
    const notification = mapBackendNotification({
      id: 18,
      redirect_url: '/dashboard',
    });

    expect(notification.data['route']).toBe('/dashboard');
  });

  it('routes applicant resubmission notifications back to the editable form', () => {
    const notification = mapBackendNotification({
      id: 19,
      request_id: 12,
      form_code: 'CONFERENCE',
      request_no: 'CONF-260012',
      event_type: 'REQUEST_RESUBMISSION_REQUIRED',
      redirect_url: '/conference/application?request_id=12',
    });

    expect(notification.type).toBe('ACTION');
    expect(notification.data['route']).toBe('/conference/application?request_id=12');
  });
});
