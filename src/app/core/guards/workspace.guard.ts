import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { WorkspaceService } from '../services/workspace.service';
import { FormCacheService } from '../services/form-cache.service';

export const workspaceGuard: CanActivateChildFn = async (_route, state) => {
  const workspaces = inject(WorkspaceService);
  const forms = inject(FormCacheService);
  const router = inject(Router);
  if (/^\/(?:main-settings|workspaces|profile|notifications|no-access|error)(?:\/|\?|$)/.test(state.url)) return true;
  try {
    await firstValueFrom(workspaces.load());
    if (!workspaces.items().some(item => item.code === 'RMC')) return router.parseUrl('/workspaces');
    workspaces.select('RMC');
    const prefix = state.url.split('/')[1];
    const code = ({ rdig: 'RDIG', conference: 'CONFERENCE', journal: 'JOURNAL',
      ragra: 'RA_GRA', 'travel-authorization': 'TRAVEL_AUTH', 'external-project-data-entry': 'EXTERNAL', partnership: 'PARTNERSHIP' } as Record<string, string>)[prefix];
    if (code) {
      const response = await firstValueFrom(forms.getForms());
      const form = response.data.find(form => form.form_code === code);
      if (!form || form.workspace_code !== 'RMC') return router.parseUrl('/workspaces');
      workspaces.select(form.workspace_code);
    }
    if (!workspaces.current()) return router.parseUrl('/workspaces');
    return true;
  } catch {
    return router.parseUrl('/workspaces');
  }
};
