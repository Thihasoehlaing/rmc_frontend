import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface TestingLoginAccount {
  username: string;
  workspaceCode: 'RMC' | 'HR_SERVICES' | 'FINANCE';
  label: string;
  roleName: string;
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

    return forkJoin({
      rmc: this.http.get<DevAuthUsersResponse>(`${environment.apiUrl}/auth/dev-users`),
      hr: this.http.get<{ data: { users: { username: string; name: string; role_name: string; department: string; job_title?: string }[] } }>(`${environment.fhHrApiUrl}/auth/dev-users`).pipe(
        catchError(() => of({ data: { users: [] } })),
      ),
    }).pipe(
      map(({ rmc, hr }) => [
        ...rmc.data.users.flatMap(user => (['RMC', 'FINANCE'] as const).map(workspaceCode => ({
          workspaceCode,
          username: user.username,
          label: user.name || user.username,
          roleName: user.role?.name || 'No role assigned',
          groups: [
            user.role?.name || 'No role assigned',
            user.department,
            user.job_title,
          ].filter(Boolean).join(' / '),
        }))),
        ...hr.data.users.map(user => ({
          workspaceCode: 'HR_SERVICES' as const,
          username: user.username,
          label: user.name || user.username,
          roleName: user.role_name,
          groups: [user.role_name, user.department, user.job_title].filter(Boolean).join(' / '),
        })),
      ]),
    );
  }
}
