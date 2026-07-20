import { describe, expect, it } from 'vitest';

import { actionRoute, detailRoute } from './request-display.util';

describe('request display routes', () => {
  it('uses the request code for conference detail URLs', () => {
    expect(
      detailRoute({
        id: 42,
        form_code: 'CONFERENCE',
        request_code: 'CONF/26 0002',
      }),
    ).toBe('/conference/detail/CONF%2F26%200002');
  });

  it('opens conference inbox actions in the conference detail page', () => {
    expect(
      actionRoute({
        request_id: 42,
        form_code: 'CONFERENCE',
        request_code: 'CONF-260002',
      }),
    ).toBe('/conference/detail/CONF-260002');
  });

  it('preserves the journal request-code route behavior', () => {
    expect(detailRoute({ id: 7, form_code: 'JOURNAL', request_code: 'JOUR-260002' })).toBe(
      '/journal/detail/JOUR-260002',
    );
  });
});
