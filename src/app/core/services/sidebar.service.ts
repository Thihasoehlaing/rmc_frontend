import { Injectable, signal, computed } from '@angular/core';

export type SidebarMode = 'collapsed' | 'expanded' | 'fixed';

@Injectable({
    providedIn: 'root'
})
export class SidebarService {
    // Primary state: is the sidebar permanently pinned?
    private isPinned = signal<boolean>(false);

    // Temporary state: is the user hovering over the collapsed sidebar?
    private isHovered = signal<boolean>(false);

    // Derived states for public consumption
    isExpanded = computed(() => this.isPinned() || this.isHovered());
    pinned = computed(() => this.isPinned());

    // Derived mode for CSS classes
    mode = computed<SidebarMode>(() => {
        if (this.isPinned()) return 'fixed';
        return this.isHovered() ? 'expanded' : 'collapsed';
    });

    togglePin() {
        this.isPinned.update(v => !v);
    }

    setHover(hovering: boolean) {
        if (!this.isPinned()) {
            this.isHovered.set(hovering);
        }
    }
}
