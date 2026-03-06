import { Component, Input, signal, computed } from '@angular/core';

export interface CommentItem {
  /** Machine key used for CSS class targeting (e.g. "hos_comment") */
  key: string;
  /** Button label shown to users */
  label: string;
  /** Comment text loaded from backend */
  content?: string;
}

@Component({
  selector: 'app-form-comment-panel',
  standalone: true,
  imports: [],
  templateUrl: './form-comment-panel.component.html',
  styleUrls: ['./form-comment-panel.component.scss']
})
export class FormCommentPanelComponent {
  /** Full list of roles that may leave comments */
  @Input() comments: CommentItem[] = [
    { key: 'hos_comment',       label: 'HOS Comments' },
    { key: 'rmc_comment',       label: 'RMC Comments' },
    { key: 'reviewer1_comment', label: 'Reviewer 1 Comments' },
    { key: 'reviewer2_comment', label: 'Reviewer 2 Comments' },
    { key: 'rdig_chair_comment',label: 'RDIG Chair Comments' },
    { key: 'vc_comment',        label: 'VC Comments' }
  ];

  /** Set of currently active (visible) comment keys */
  activeKeys = signal<Set<string>>(new Set());

  /** Computed list of active comments to display */
  activeComments = computed(() => {
    const keys = this.activeKeys();
    return this.comments.filter(c => keys.has(c.key));
  });

  isActive(key: string): boolean {
    return this.activeKeys().has(key);
  }

  toggle(key: string) {
    this.activeKeys.update(current => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  toggleAll() {
    const allKeys = this.comments.map(c => c.key);
    const current = this.activeKeys();
    if (current.size === allKeys.length) {
      this.activeKeys.set(new Set());
    } else {
      this.activeKeys.set(new Set(allKeys));
    }
  }

  get allActive(): boolean {
    return this.activeKeys().size === this.comments.length;
  }
}
