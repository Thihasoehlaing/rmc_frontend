import { beforeEach, describe, expect, it } from 'vitest';

import { ActionLoadingService } from './action-loading.service';

describe('ActionLoadingService', () => {
  let service: ActionLoadingService;

  beforeEach(() => {
    service = new ActionLoadingService();
  });

  it('publishes action-specific loading content', () => {
    service.begin('Submitting application', 'Please wait.');

    expect(service.state()).toEqual({
      id: 1,
      title: 'Submitting application',
      message: 'Please wait.',
    });
  });

  it('does not let an older action hide a newer action', () => {
    const firstId = service.begin('First action');
    const secondId = service.begin('Second action');

    service.end(firstId);
    expect(service.state()?.title).toBe('Second action');

    service.end(secondId);
    expect(service.state()).toBeNull();
  });

  it('waits for every concurrent request regardless of completion order', () => {
    const first = service.beginRequest('GET');
    const second = service.beginRequest('PUT');
    service.end(second);
    expect(service.state()?.id).toBe(first);
    service.end(first);
    expect(service.state()).toBeNull();
  });

  it('keeps an action-specific title while its HTTP requests finish', () => {
    const action = service.begin('Submitting application');
    const request = service.beginRequest('POST');
    expect(service.state()?.title).toBe('Submitting application');
    service.end(request);
    expect(service.state()?.title).toBe('Submitting application');
    service.end(action);
    expect(service.state()).toBeNull();
  });
});
