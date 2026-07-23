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
});
