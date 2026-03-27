import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Centralised service for fetching RDIG applications.
 *
 * Filtering is performed SERVER-SIDE (server.mjs) — the Angular client only
 * receives applications the current user is authorised to see.
 *
 * The user's identity is passed as query parameters so the server can apply
 * the correct visibility rules without fetching and filtering the entire
 * collection on the client.
 *
 * NOTE: In production these params would be derived from a verified JWT on
 * the server; query params are used here because this is a json-server demo.
 */
@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private readonly BASE = 'http://localhost:3000';

  /**
   * Returns ONLY the applications the currently logged-in user may see.
   * An empty observable is returned when no session is active.
   */
  getInboxApplications(): Observable<any[]> {
    const user = this.auth.currentUser();
    if (!user) return of([]);

    const params = new HttpParams()
      .set('userId',     user.id)
      .set('roles',      user.groups.join(','))
      .set('leaderName', user.name)
      .set('department', user.department);

    return this.http.get<any[]>(`${this.BASE}/applications`, { params });
  }
}
