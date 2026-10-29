import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WorkspaceService, Workspace } from '../../core/services/workspace.service';
import { SHARED_SETTINGS_MODULES } from '../settings/settings.config';

@Component({
  standalone: true,
  imports: [RouterLink],
  templateUrl: './workspaces.component.html',
  styleUrl: './workspaces.component.scss',
})
export class WorkspacesComponent implements OnInit {
  readonly workspaces = inject(WorkspaceService);
  readonly auth = inject(AuthService);
  readonly failed = signal(false);
  readonly menuOpen = signal(false);
  readonly settings = SHARED_SETTINGS_MODULES;

  ngOnInit(): void { this.load(); }

  @HostListener('document:click', ['$event'])
  dismissMenu(event: MouseEvent): void {
    const target = event.target;
    if (this.menuOpen() && !(target instanceof Element && target.closest('.workspace-settings__toggle'))) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  dismissMenuWithEscape(): void { this.menuOpen.set(false); }

  load(): void {
    this.failed.set(false);
    this.workspaces.load(true).subscribe({
      next: response => {
        if (!response.data.can_manage_settings && response.data.items.length === 1) {
          void this.workspaces.open(response.data.items[0]);
        }
      },
      error: () => this.failed.set(true),
    });
  }

  initial(name: string): string { return Array.from(name.trim())[0]?.toLocaleUpperCase() || '?'; }

  destination(workspace: Workspace): string | null {
    return this.workspaces.destination(workspace)?.href ?? null;
  }

  enter(workspace: Workspace): void { void this.workspaces.open(workspace); }
}
