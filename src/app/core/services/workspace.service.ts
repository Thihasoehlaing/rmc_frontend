import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, tap, shareReplay, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Workspace {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  domain_url: string | null;
  display_order: number;
  forms?: { id: number; code: string; name: string }[];
  role: { id: number | null; code: string | null; name: string | null } | null;
}
export interface WorkspaceAccess {
  workspace_id: number;
  code: string;
  name: string;
  is_active: boolean;
  role_id: number | null;
}
export type ManagedWorkspace = Omit<Workspace, 'role'>;
export type WorkspaceSettingsPayload = Pick<ManagedWorkspace, 'name' | 'domain_url' | 'is_active' | 'display_order'>;
interface WorkspaceResponse { data: { items: Workspace[]; can_manage_settings: boolean }; }

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private owner = '';
  private inFlight: Observable<WorkspaceResponse> | null = null;
  private loaded = false;
  readonly items = signal<Workspace[]>([]);
  readonly canManageSettings = signal(false);
  readonly code = signal('RMC');
  readonly current = computed(() => this.items().find(item => item.code === this.code()));

  load(force = false): Observable<WorkspaceResponse> {
    const username = JSON.parse(localStorage.getItem('user') || '{}').username || '';
    if (username !== this.owner) {
      this.owner = username;
      this.loaded = false;
      this.inFlight = null;
      this.items.set([]);
      this.canManageSettings.set(false);
      this.code.set('RMC');
      sessionStorage.setItem(`rmc.workspace.${username}`, 'RMC');
    }
    if (this.loaded && !force) return of({ data: { items: this.items(), can_manage_settings: this.canManageSettings() } });
    if (this.inFlight) return this.inFlight;
    const owner = this.owner;
    const pending = this.http.get<WorkspaceResponse>(`${environment.apiUrl}/workspaces`).pipe(
      tap(response => {
        if (owner !== this.owner) return;
        this.items.set(response.data.items);
        this.canManageSettings.set(response.data.can_manage_settings);
        this.loaded = true;
        // This repository serves RMC only. Other workspaces open their own domains.
        this.select('RMC');
      }),
      finalize(() => { if (this.inFlight === pending) this.inFlight = null; }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.inFlight = pending;
    return pending;
  }

  select(code: string): void {
    this.code.set(code);
    sessionStorage.setItem(`rmc.workspace.${this.owner}`, code);
  }

  rememberRmcRoute(route: string): void {
    const key = `rmc.workspace.return.${this.owner}`;
    if (route.startsWith('/') && !route.startsWith('//') && !/^\/(?:login|workspaces|settings|main-settings)(?:\/|\?|$)/.test(route)) {
      sessionStorage.setItem(key, route);
    } else sessionStorage.removeItem(key);
  }

  destination(workspace: Workspace): URL | null {
    if (!workspace.domain_url && workspace.code !== 'RMC') return null;
    const target = new URL(workspace.domain_url || window.location.origin);
    if (!['https:', 'http:'].includes(target.protocol)) return null;
    if (workspace.code === 'RMC') {
      const pending = sessionStorage.getItem(`rmc.workspace.return.${this.owner}`);
      if (pending?.startsWith('/') && !pending.startsWith('//')) {
        const destination = new URL(pending, target);
        if (destination.origin === target.origin) return destination;
      }
      if (target.pathname === '/') target.pathname = '/dashboard';
    }
    return target;
  }

  async open(workspace: Workspace): Promise<boolean> {
    const target = this.destination(workspace);
    if (!target) return false;
    if (workspace.code === 'RMC') {
      this.select('RMC');
      sessionStorage.removeItem(`rmc.workspace.return.${this.owner}`);
      if (target.origin === window.location.origin) return this.router.navigateByUrl(target.pathname + target.search + target.hash);
    }
    // Other applications load their own bundle and establish their own SSO session.
    // Never transfer access tokens through URLs or browser storage between domains.
    window.location.assign(target.href);
    return true;
  }

  managed() {
    return this.http.get<{ data: ManagedWorkspace[] }>(`${environment.apiUrl}/settings/workspaces`);
  }

  createSettings(payload: WorkspaceSettingsPayload & {code: string}) {
    return this.http.post<{ data: ManagedWorkspace }>(`${environment.apiUrl}/settings/workspaces`, payload);
  }

  saveSettings(id: number, payload: WorkspaceSettingsPayload) {
    return this.http.put<{ data: ManagedWorkspace }>(`${environment.apiUrl}/settings/workspaces/${id}`, payload);
  }

  userAccess(userId: number) {
    return this.http.get<{ data: WorkspaceAccess[] }>(`${environment.apiUrl}/settings/users/${userId}/workspaces`);
  }

  saveAccess(userId: number, row: WorkspaceAccess) {
    return this.http.put<{ data: WorkspaceAccess[] }>(`${environment.apiUrl}/settings/users/${userId}/workspaces/${row.workspace_id}`,
      { is_active: row.is_active, role_id: row.role_id });
  }
}
