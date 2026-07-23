import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface TestingLoginAccount {
  username: string;
  label: string;
  groups: string;
}

interface DevAuthUsersResponse {
  data: {
    users: {
      username: string;
      name: string;
      email: string;
      department: string;
      job_title: string | null;
      photo_url?: string | null;
      role: {
        code: string;
        id: number;
        name: string;
      } | null;
    }[];
  };
  message: string;
  success: boolean;
}

@Injectable({ providedIn: 'root' })
export class TestingLoginService {
  private readonly http = inject(HttpClient);

  readonly enabled = environment.enableTestingLogin === true;

  listAccounts(): Observable<TestingLoginAccount[]> {
    if (!this.enabled) {
      return throwError(() => new Error('Testing login is not available in this environment.'));
    }

    return this.http.get<DevAuthUsersResponse>(`${environment.apiUrl}/auth/dev-users`).pipe(
      map(response =>
        response.data.users.map(user => ({
          username: user.username,
          label: user.name || user.username,
          groups: [
            user.role?.name || 'No role assigned',
            user.department,
            user.job_title,
          ].filter(Boolean).join(' / '),
        })),
      ),
    );
  }
}
