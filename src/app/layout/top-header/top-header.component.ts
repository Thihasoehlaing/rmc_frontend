import { Component, signal, computed, inject, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { DatePipe } from '@angular/common';
import { NAVIGATION_DATA } from '../../core/constants/nav-data';
import { NavElement, NavFolder, NavItem } from '../../interfaces/nav.interface';
import { filter, Subscription } from 'rxjs';

interface SearchResult {
  label: string;
  route: string;
  group: string;
  icon: string;
}

interface Notification {
  id: number;
  type: 'application' | 'pending' | 'approval';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
    selector: 'app-top-header',
    standalone: true,
    imports: [RouterLink, DatePipe],
    templateUrl: './top-header.component.html',
    styleUrls: ['./top-header.component.scss']
})
export class TopHeaderComponent implements OnInit, OnDestroy {
    private router = inject(Router);
    private el = inject(ElementRef);
    private routerSub!: Subscription;

    currentDate = new Date();

    // ── Breadcrumb ───────────────────────────────────────────────
    breadcrumbs = signal<{ label: string; route: string }[]>([]);

    // ── Search ───────────────────────────────────────────────────
    searchQuery = signal('');
    searchFocused = signal(false);
    private allNavItems: SearchResult[] = [];

    searchResults = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        if (!query) return [];
        return this.allNavItems.filter(item =>
            item.label.toLowerCase().includes(query)
        ).slice(0, 8);
    });

    // ── Notifications ────────────────────────────────────────────
    notificationsOpen = signal(false);
    notificationSearch = signal('');

    notifications = signal<Notification[]>([
        { id: 1, type: 'application', title: 'New RDIG Application', message: 'Dr. Ahmad submitted a new RDIG grant application for batch 2026-A.', time: '2 hours ago', read: false },
        { id: 2, type: 'pending', title: 'Review Pending', message: 'Conference funding application #CF-2026-012 requires your review.', time: '4 hours ago', read: false },
        { id: 3, type: 'approval', title: 'Approval Required', message: 'Journal publication funding for Dr. Lee awaits HOS approval.', time: '1 day ago', read: false },
        { id: 4, type: 'application', title: 'Application Updated', message: 'RDIG application #RD-2025-089 has been revised and resubmitted.', time: '1 day ago', read: true },
        { id: 5, type: 'pending', title: 'Budget Review', message: 'Budget revision for project ACC-2025-034 needs verification.', time: '2 days ago', read: true },
        { id: 6, type: 'approval', title: 'VC Endorsement', message: 'Two proposals pending VC endorsement for external funding.', time: '3 days ago', read: true },
    ]);

    unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

    filteredNotifications = computed(() => {
        const query = this.notificationSearch().toLowerCase().trim();
        const items = this.notifications();
        if (!query) return items;
        return items.filter(n =>
            n.title.toLowerCase().includes(query) ||
            n.message.toLowerCase().includes(query)
        );
    });

    ngOnInit() {
        this.flattenNavData();
        this.updateBreadcrumbs(this.router.url);
        this.routerSub = this.router.events.pipe(
            filter((e): e is NavigationEnd => e instanceof NavigationEnd)
        ).subscribe(e => this.updateBreadcrumbs(e.urlAfterRedirects));
    }

    ngOnDestroy() {
        this.routerSub?.unsubscribe();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (!this.el.nativeElement.contains(event.target)) {
            this.notificationsOpen.set(false);
            this.searchFocused.set(false);
        }
    }

    // ── Search helpers ───────────────────────────────────────────
    private flattenNavData() {
        this.allNavItems = [];
        for (const group of NAVIGATION_DATA) {
            for (const element of group.elements) {
                this.extractNavItems(element, group.groupName);
            }
        }
    }

    private extractNavItems(element: NavElement, groupName: string) {
        if ('children' in element) {
            const folder = element as NavFolder;
            for (const child of folder.children) {
                this.extractNavItems(child, groupName);
            }
        } else {
            const item = element as NavItem;
            if (item.route) {
                this.allNavItems.push({
                    label: item.label,
                    route: item.route,
                    group: groupName,
                    icon: item.icon || 'description'
                });
            }
        }
    }

    navigateToResult(result: SearchResult) {
        this.router.navigate([result.route]);
        this.searchQuery.set('');
        this.searchFocused.set(false);
    }

    onSearchInput(event: Event) {
        this.searchQuery.set((event.target as HTMLInputElement).value);
    }

    onNotificationSearchInput(event: Event) {
        this.notificationSearch.set((event.target as HTMLInputElement).value);
    }

    // ── Breadcrumbs ──────────────────────────────────────────────
    private updateBreadcrumbs(url: string) {
        const segments = url.split('/').filter(Boolean);
        const crumbs: { label: string; route: string }[] = [
            { label: 'RMC', route: '/dashboard' }
        ];

        let path = '';
        for (const seg of segments) {
            path += '/' + seg;
            crumbs.push({ label: this.formatSegment(seg), route: path });
        }

        this.breadcrumbs.set(crumbs);
    }

    private formatSegment(segment: string): string {
        return segment
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    // ── Notifications ────────────────────────────────────────────
    toggleNotifications() {
        this.notificationsOpen.update(v => !v);
    }

    markAsRead(notification: Notification) {
        this.notifications.update(list =>
            list.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
    }

    markAllRead() {
        this.notifications.update(list =>
            list.map(n => ({ ...n, read: true }))
        );
    }

    getNotificationIcon(type: string): string {
        switch (type) {
            case 'application': return 'description';
            case 'pending': return 'pending_actions';
            case 'approval': return 'approval';
            default: return 'notifications';
        }
    }
}
