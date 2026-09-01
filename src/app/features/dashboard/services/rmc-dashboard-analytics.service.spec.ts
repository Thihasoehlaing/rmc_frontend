import '@angular/compiler';

import { describe, expect, it } from 'vitest';

import { mapAnalysisPortfolio } from './rmc-dashboard-analytics.service';

describe('RmcDashboardAnalyticsService', () => {
  it('maps the backend analytics contract into chart-ready records', () => {
    const submittedAt = '2026-08-01T09:00:00';
    const completedAt = '2026-08-05T14:30:00';
    const result = mapAnalysisPortfolio({
      start_date: '2026-01-01',
      end_date: '2026-08-28',
      form_codes: ['CONFERENCE'],
      record_count: 1,
      costs_available: true,
      records: [
        {
          request: {
            id: 42,
            form_id: 1,
            form_code: 'CONFERENCE',
            form_name: 'Conference Application',
            request_code: 'CONF-260042',
            batch_id: null,
            batch: null,
            applicant_staff_username: 'test.user',
            applicant_name: 'Test User',
            applicant_email: 'test@example.com',
            applicant_department: 'SOCT',
            status_code: 'approved',
            status_name: 'approved',
            current_actor_role: null,
            last_action: null,
            created_at: submittedAt,
            updated_at: completedAt,
            submitted_at: submittedAt,
            title: 'Test conference',
            rdig_request_id: null,
            conference_request_id: 7,
            journal_request_id: null,
            external_form_request_id: null,
          },
          request_id: 42,
          form_code: 'conference',
          form_name: 'Conference Application',
          submitted_at: submittedAt,
          completed_at: completedAt,
          requires_action: false,
          is_completed: true,
          cost: '1250.50',
          analytics: {
            department_code: 'SOCT',
            fund_approved: '1250.50',
            project_type: 'Non-Research',
            conference_type: 'International',
            cost_breakdown: { apu: '1000', external: '150', applicant: '100.50' },
          },
        },
      ],
    });

    expect(result.costsAvailable).toBe(true);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].formCode).toBe('CONFERENCE');
    expect(result.records[0].cost).toBe(1250.5);
    expect(result.records[0].submittedAt?.toISOString()).toContain('2026-08-01');
    expect(result.records[0].analytics?.costBreakdown).toEqual({
      apu: 1000,
      external: 150,
      applicant: 100.5,
    });
  });
});
