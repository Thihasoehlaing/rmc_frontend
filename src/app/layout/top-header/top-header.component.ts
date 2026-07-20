import { Component, signal, computed, inject, OnInit, OnDestroy, ElementRef, HostListener, NgZone } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { DatePipe } from '@angular/common';
import { NAVIGATION_DATA } from '../../core/constants/nav-data';
import { NavElement, NavFolder, NavItem } from '../../core/interfaces/nav.interface';
import { PermissionService } from '../../core/services/permission.service';
import { NotificationService } from '../../core/services/notification.service';
import { AppNotification } from '../../core/interfaces/notification.interface';
import { SidebarService } from '../../core/services/sidebar.service';
import { filter, Subscription } from 'rxjs';

interface SearchResult {
  label: string;
  route: string;
  group: string;
  icon: string;
}

@Component({
    selector: 'app-top-header',
    standalone: true,
    imports: [RouterLink, DatePipe],
    templateUrl: './top-header.component.html',
    styleUrls: ['./top-header.component.scss']
})
export class TopHeaderComponent implements OnInit, OnDestroy {
    private router      = inject(Router);
    private el          = inject(ElementRef);
    private ngZone      = inject(NgZone);
    private permService = inject(PermissionService);
    readonly notifSvc   = inject(NotificationService);
    readonly sidebarService = inject(SidebarService);
    private routerSub!: Subscription;

    currentDate = new Date();

    // ── Swipe-to-delete ──────────────────────────────────────────
    private readonly SWIPE_THRESHOLD = 80; // Swipe right to delete
    private dragClickSuppress = new Set<number>();

    // ── Badge pulse animation ────────────────────────────────────
    badgeAnimating = signal(false);
    private animTimer?: ReturnType<typeof setInterval>;

    // ── Stale-click feedback ─────────────────────────────────────
    staleNotifId = signal<number | null>(null);
    private staleTimer?: ReturnType<typeof setTimeout>;

    // ── Breadcrumb ───────────────────────────────────────────────
    breadcrumbs = signal<{ label: string; route: string }[]>([]);

    // ── Search ───────────────────────────────────────────────────
    searchQuery  = signal('');
    searchFocused = signal(false);

    private allowedNavItems = computed<SearchResult[]>(() => {
        const items: SearchResult[] = [];
        for (const group of NAVIGATION_DATA) {
            if (!this.permService.canAccess(group.permission)) continue;
            for (const element of group.elements) {
                this.extractNavItems(element, group.groupName, items);
            }
        }
        return items;
    });

    searchResults = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        if (!query) return [];
        return this.allowedNavItems().filter(item =>
            item.label.toLowerCase().includes(query)
        ).slice(0, 8);
    });

    // ── Notifications ────────────────────────────────────────────
    notificationsOpen   = signal(false);
    notificationSearch  = signal('');

    unreadCount = computed(() => this.notifSvc.unreadCount());

    filteredNotifications = computed(() => {
        const query = this.notificationSearch().toLowerCase().trim();
        const items = this.notifSvc.notifications();
        if (!query) return items;
        return items.filter(n =>
            n.title.toLowerCase().includes(query) ||
            n.message.toLowerCase().includes(query)
        );
    });

    ngOnInit() {
        this.updateBreadcrumbs(this.router.url);
        this.routerSub = this.router.events.pipe(
            filter((e): e is NavigationEnd => e instanceof NavigationEnd)
        ).subscribe(e => this.updateBreadcrumbs(e.urlAfterRedirects));

        this.notifSvc.loadUnreadCount().subscribe();

        // Badge pulse every 30 s — fires while panel is closed and there are unreads
        this.animTimer = setInterval(() => {
            if (this.unreadCount() > 0 && !this.notificationsOpen()) {
                this.badgeAnimating.set(true);
                setTimeout(() => this.badgeAnimating.set(false), 800);
            }
        }, 30_000);
    }

    ngOnDestroy() {
        this.routerSub?.unsubscribe();
        clearInterval(this.animTimer);
        clearTimeout(this.staleTimer);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (!this.el.nativeElement.contains(event.target)) {
            this.notificationsOpen.set(false);
            this.searchFocused.set(false);
        }
    }

    // ── Search helpers ───────────────────────────────────────────
    private extractNavItems(element: NavElement, groupName: string, results: SearchResult[]) {
        if (!this.permService.canAccess(element.permission)) return;
        if ('children' in element) {
            const folder = element as NavFolder;
            for (const child of folder.children) {
                this.extractNavItems(child, groupName, results);
            }
        } else {
            const item = element as NavItem;
            if (item.route) {
                results.push({
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
        const cleanUrl = url.split('?')[0].split('#')[0];
        const applicationLabel = this.getApplicationBreadcrumbLabel(cleanUrl);
        const crumbs: { label: string; route: string }[] = [
            { label: 'RMC', route: '/dashboard' }
        ];

        if (applicationLabel) {
            this.breadcrumbs.set([
                ...crumbs,
                { label: applicationLabel, route: cleanUrl }
            ]);
            return;
        }

        const segments = cleanUrl.split('/').filter(Boolean);
        let path = '';
        for (const seg of segments) {
            path += '/' + seg;
            crumbs.push({ label: this.formatSegment(seg), route: path });
        }

        this.breadcrumbs.set(crumbs);
    }

    private formatSegment(segment: string): string {
        const routeLabels: Record<string, string> = {
            'workflow': 'Workflow Configuration',
        };

        if (routeLabels[segment]) {
            return routeLabels[segment];
        }

        return segment
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    private getApplicationBreadcrumbLabel(path: string): string | null {
        const applicationRoutes: Record<string, string> = {
            '/rdig': 'RDIG Application',
            '/conference/application': 'Conference Application',
            '/journal/application': 'Journal Publication',
            '/ragra': 'RA/GRA Application',
            '/travel': 'Travel Authorization Application',
            '/partnership/application': 'Partnership Application',
            '/proposal': 'Proposal Application',
        };

        return applicationRoutes[path] ?? null;
    }

    // ── Notifications ────────────────────────────────────────────
    toggleNotifications() {
        const opening = !this.notificationsOpen();
        this.notificationsOpen.set(opening);
        // Stop animation on open; refresh list
        if (opening) {
            this.badgeAnimating.set(false);
            this.notifSvc.loadPopupNotifications().subscribe();
        }
    }

    viewAllNotifications() {
        this.notificationsOpen.set(false);
        this.router.navigateByUrl('/notifications');
    }

    onNotificationClick(notification: AppNotification) {
        // Suppress if this was the end of a drag gesture
        if (this.dragClickSuppress.has(notification.id!)) return;

        if (notification.id != null) {
            this.notifSvc.markAsRead(notification.id);
        }

        // Expired notification — show inline feedback, no navigation
        if (notification.status === 'expired') {
            clearTimeout(this.staleTimer);
            this.staleNotifId.set(notification.id ?? null);
            this.staleTimer = setTimeout(() => this.staleNotifId.set(null), 2500);
            return;
        }

        const route = notification.data['route'] as string | undefined;
        if (route) {
            this.router.navigateByUrl(route);
            this.notificationsOpen.set(false);
        }
    }

    // ── Swipe-to-delete ──────────────────────────────────────────

    /**
     * Interactive 60fps swipe-to-delete handled entirely outside Angular zone.
     * Uses direct DOM transform manipulation instead of CD signals to bypass any frame lags.
     */
    onPointerDown(e: PointerEvent, id: number) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        
        const itemEl = e.currentTarget as HTMLElement;
        const wrapEl = itemEl.parentElement as HTMLElement;
        const deleteEl = wrapEl.querySelector('.notif-swipe-delete') as HTMLElement;
        
        itemEl.setPointerCapture(e.pointerId);
        
        const startX = e.clientX;
        const startY = e.clientY;
        let currentDelta = 0;
        let isDragging = false;
        
        // Setup initial drag state class
        wrapEl.classList.remove('notif-swipe-wrap--snap');
        wrapEl.classList.add('notif-swipe-wrap--dragging');
        
        const onMove = (me: PointerEvent) => {
            const dy = Math.abs(me.clientY - startY);
            const dx = me.clientX - startX;
            
            // Allow native scrolling if movement is primarily vertical
            if (!isDragging && dy > 10 && dy > Math.abs(dx)) {
                cleanup();
                return;
            }
            
            if (Math.abs(dx) > 5) isDragging = true;
            if (!isDragging) return;
            
            // Limit swipe to RIGHT only (positive dx), up to 120px
            currentDelta = Math.max(0, Math.min(dx, 120));
            
            // Prevent text selection / pull-to-refresh while actively dragging
            if (me.cancelable) me.preventDefault();
            
            // ── 60fps Direct DOM manipulation ──
            itemEl.style.transform = `translateX(${currentDelta}px)`;
            
            if (deleteEl) {
                // Calculate how close we are to the threshold
                const progress = Math.min(Math.abs(currentDelta) / Math.abs(this.SWIPE_THRESHOLD), 1);
                
                // Smoothly scale icon and reveal red background
                const icon = deleteEl.querySelector('.material-icons') as HTMLElement;
                if (icon) icon.style.transform = `scale(${0.5 + (progress * 0.6)})`;
                deleteEl.style.opacity = progress > 0.1 ? Math.max(0.5, progress).toString() : '0';
                
                if (currentDelta >= this.SWIPE_THRESHOLD) {
                    wrapEl.classList.add('notif-swipe-wrap--threshold');
                } else {
                    wrapEl.classList.remove('notif-swipe-wrap--threshold');
                }
            }
        };

        const cleanup = () => {
            itemEl.removeEventListener('pointermove', onMove);
            itemEl.removeEventListener('pointerup', cleanup);
            itemEl.removeEventListener('pointercancel', cleanup);
            
            // Remove dragging class, apply snap class for CSS transitions
            wrapEl.classList.remove('notif-swipe-wrap--dragging');
            wrapEl.classList.add('notif-swipe-wrap--snap');
            
            // Suppress the click event since the user was dragging (irrespective of confirm or abort)
            if (Math.abs(currentDelta) > 5) {
                this.ngZone.run(() => {
                    this.dragClickSuppress.add(id);
                    setTimeout(() => this.dragClickSuppress.delete(id), 250); // Release suppression safely after animation
                });
            }
            
            if (currentDelta >= this.SWIPE_THRESHOLD) {
                // Confirmed swipe — slide out & fade out simultaneously
                itemEl.style.transform = `translateX(150%)`;
                itemEl.style.opacity = '0';
                
                if (deleteEl) {
                    deleteEl.style.opacity = '0';
                }
                
                setTimeout(() => {
                    // Smoothly auto-collapse the container height to 0 before removing from array
                    wrapEl.style.height = `${wrapEl.offsetHeight}px`;
                    wrapEl.offsetHeight; // force reflow
                    wrapEl.style.transition = 'height 200ms ease, opacity 200ms ease';
                    wrapEl.style.overflow = 'hidden';
                    wrapEl.style.height = '0px';
                    wrapEl.style.opacity = '0';
                    
                    setTimeout(() => {
                        this.ngZone.run(() => {
                            this.notifSvc.delete(id).subscribe();
                        });
                    }, 200); // Wait for collapse
                }, 300); // Wait for CSS transform/fade out
            } else {
                // Aborted swipe — snap back
                itemEl.style.transform = ''; // Removes inline style so CSS snaps it to 0
                wrapEl.classList.remove('notif-swipe-wrap--threshold');
                
                if (deleteEl) {
                    deleteEl.style.opacity = '0';
                    const icon = deleteEl.querySelector('.material-icons') as HTMLElement;
                    if (icon) icon.style.transform = '';
                }
            }
        };

        this.ngZone.runOutsideAngular(() => {
            itemEl.addEventListener('pointermove', onMove, { passive: false });
            itemEl.addEventListener('pointerup', cleanup);
            itemEl.addEventListener('pointercancel', cleanup);
        });
    }

    markAsRead(id: number) {
        this.notifSvc.markAsRead(id);
    }
    
    markAllRead() {
        this.notifSvc.markAllRead();
    }

    relativeTime(createdAt: string): string {
        return this.notifSvc.relativeTime(createdAt);
    }

    getNotificationIcon(type: string): string {
        return this.notifSvc.getIcon(type);
    }
}

