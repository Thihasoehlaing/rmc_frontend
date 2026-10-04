import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Router } from '@angular/router';
import { SidebarService } from '../../core/services/sidebar.service';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { NAVIGATION_DATA } from '../../core/constants/nav-data';
import { RESTRICTED_WORKFLOW_SIDEBAR_ROUTES } from '../../core/constants/restricted-sidebar-routes';
import { NavElement, NavFolder } from '../../core/interfaces/nav.interface';
import { FormCacheService } from '../../core/services/form-cache.service';
import { UserGroup } from '../../core/interfaces/user.interface';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  sidebarService        = inject(SidebarService);
  private authService   = inject(AuthService);
  private permService   = inject(PermissionService);
  private router        = inject(Router);
  private formCache     = inject(FormCacheService);

  isExpanded = this.sidebarService.isExpanded;
  pinned     = this.sidebarService.pinned;

  /** Live user — updates automatically when login/logout fires. */
  currentUser = this.authService.currentUser;

  ngOnInit(): void {
    this.formCache.getActiveForms(true).subscribe({ error: () => undefined });
  }

  private readonly restrictedWorkflowGroups: UserGroup[] = ['VC', 'HR', 'CEO', 'CFO', 'Finance'];
  private readonly restrictedSidebarRoutes = new Set<string>(RESTRICTED_WORKFLOW_SIDEBAR_ROUTES);

  /**
   * Computed: navigation groups and their elements are filtered through
   * PermissionService on every change to the current user signal.
   * No role checks live here — all logic is in PermissionService.
   */
  filteredNavGroups = computed(() => {
    const activeFormCodes = this.formCache.activeFormCodes();
    const restrictToWorkflowSidebar = this.shouldUseRestrictedWorkflowSidebar();

    // Recursively filter elements and their children by ABAC permission.
    // Folders whose children are all filtered out are also removed.
    const filterElements = (elements: NavElement[]): NavElement[] =>
      elements
        .filter(el => this.permService.canAccess(el.permission))
        .filter(el => this.isConfiguredFormActive(el, activeFormCodes))
        .filter(el => !restrictToWorkflowSidebar || this.isAllowedRestrictedSidebarElement(el))
        .map(el =>
          this.isFolder(el)
            ? { ...el, children: filterElements(el.children) }
            : el
        )
        .filter(el => !this.isFolder(el) || (el as NavFolder).children.length > 0);

    return NAVIGATION_DATA
      .filter(group => this.permService.canAccess(group.permission))
      .map(group => ({
        ...group,
        elements: filterElements(group.elements),
      }))
      .filter(group => group.elements.length > 0);
  });

  // Track expanded folders; pre-populate with any folder that has isExpanded: true
  expandedFolders = signal<Set<string>>(
    new Set(
      NAVIGATION_DATA
        .flatMap(g => g.elements)
        .filter((el): el is NavFolder => 'children' in el && !!el.isExpanded)
        .map(f => f.label)
    )
  );

  onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  toggleFolder(folder: NavFolder) {
    const label = folder.label;
    this.expandedFolders.update((set: Set<string>) => {
      const newSet = new Set(set);
      newSet.has(label) ? newSet.delete(label) : newSet.add(label);
      return newSet;
    });

    // Navigate to the folder's route if it exists
    if (folder.route) {
      this.router.navigateByUrl(folder.route);
    }
  }

  isFolderExpanded(folder: NavFolder): boolean {
    return this.expandedFolders().has(folder.label);
  }

  isFolder(element: NavElement): element is NavFolder {
    return 'children' in element;
  }

  private isConfiguredFormActive(
    element: NavElement,
    activeFormCodes: Set<string>,
  ): boolean {
    const formCode = element.formCode?.toUpperCase();
    return !formCode || activeFormCodes.has(formCode);
  }

  private shouldUseRestrictedWorkflowSidebar(): boolean {
    const groups = this.currentUser()?.groups ?? [];
    return this.restrictedWorkflowGroups.some(group => groups.includes(group));
  }

  private isAllowedRestrictedSidebarElement(element: NavElement): boolean {
    if (this.isFolder(element)) {
      return element.children.some(child => this.isAllowedRestrictedSidebarElement(child));
    }

    return !!element.route && this.restrictedSidebarRoutes.has(element.route);
  }

  asItem(element: NavElement) {
    return element as any;
  }

  onMouseEnter() { this.sidebarService.setHover(true); }

  onMouseLeave() {
    this.sidebarService.setHover(false);
  }

  togglePin() { this.sidebarService.togglePin(); }

  closeMobileSidebar(): void {
    this.sidebarService.closeMobile();
  }

  /** Log out and navigate to the login page. */
  logout(): void {
    this.authService.logout();
  }
}
