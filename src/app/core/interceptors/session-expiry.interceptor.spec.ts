import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';

import { handleExpiredLoginSession } from './session-expiry.interceptor';

describe('sessionExpiryInterceptor', () => {
  const logout = vi.fn();

  beforeEach(() => {
    logout.mockReset();
  });

  it('logs out when the API reports an expired login session', () => {
    const error = new HttpErrorResponse({
      status: 401,
      error: {
        error_code: 40143,
        message: 'Login session expired, please relogin again.',
        status_code: 401,
      },
    });

    handleExpiredLoginSession(error, logout);

    expect(logout).toHaveBeenCalledOnce();
  });

  it('does not log out for a different unauthorized error', () => {
    const error = new HttpErrorResponse({
      status: 401,
      error: { error_code: 40101 },
    });

    handleExpiredLoginSession(error, logout);

    expect(logout).not.toHaveBeenCalled();
  });
});
