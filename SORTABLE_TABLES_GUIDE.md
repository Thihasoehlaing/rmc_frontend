# Sortable Tables Implementation Guide

## Overview
All tables in the application have been enhanced with sortable column headers. Users can click on table headers to sort by that column, with visual indicators (↑ for ascending, ↓ for descending) showing the current sort direction.

## What Was Implemented

### 1. Table Sort Service (`src/app/shared/services/table-sort.service.ts`)
A reusable Angular service that provides sorting functionality:
- `getNextDirection()`: Cycles through sort directions (asc → desc → null)
- `sort()`: Sorts array by column with specified direction
- Supports nested object properties using dot notation (e.g., 'projectDetails.title')
- Handles numbers, dates, and strings intelligently

### 2. Sortable Header Directive (`src/app/shared/directives/sortable-header.directive.ts`)
A standalone directive that can be applied to table headers to make them clickable and sortable.
- Apply with `[appSortableHeader]="columnName"`
- Emits `headerClick` events when clicked
- Provides styling hooks for sorted state

### 3. Conference Settings Component
**File**: `src/app/conference_form/pages/conference-settings/`
**Features**:
- Sortable headers on the options table
- Click any column header to sort (Vote Number, Account Code, Foreign/Local, Status, Created Date)
- Visual indicators show current sort column and direction
- Sort direction cycles: ascending ↑ → descending ↓ → no sort
- Dropdown sort selector still works (resets header sorting when used)

**HTML Example**:
```html
<th class="sortable-header" (click)="onHeaderClick('label')" title="Click to sort">
  Vote Number{{ getSortIndicator('label') }}
</th>
```

**Methods Added**:
- `onHeaderClick(columnName: string)`: Handles header clicks
- `getSortIndicator(columnName: string)`: Returns sort indicator string (↑, ↓, or '')
- `isSortableColumn(columnName: string)`: Determines if column can be sorted

### 4. Inbox Component
**File**: `src/app/submissions/inbox/`
**Features**:
- Sortable headers on the applications table
- Click to sort by: Project Title, Submitted By, Status, Last Action
- Includes property mapping for nested object properties

**Methods Added**:
- `onHeaderClick(columnName: string)`: Handles header clicks
- `getSortIndicator(columnName: string)`: Returns sort indicator
- `getSortedApplications()`: Returns applications sorted by selected column

### 5. Styling
All sortable headers have consistent styling:
- `.sortable-header` class applied for styling
- Cursor changes to pointer on hover
- Background color changes on hover for visual feedback
- Arrow indicators (↑, ↓) show current sort state
- Smooth transitions for hover effects

**SCSS Added**:
```scss
&.sortable-header {
  cursor: pointer;
  user-select: none;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: var(--color-hover);
    color: var(--color-text-strong);
  }
}
```

## How to Use in Other Tables

To make any table in your application sortable, follow these steps:

### Step 1: Add Sorting Signals to Component TypeScript
```typescript
import { TableSortService, SortDirection } from '@/.../table-sort.service';

export class MyTableComponent {
  private tableSortService = inject(TableSortService);
  
  headerSortColumn = signal<string | null>(null);
  headerSortDirection = signal<SortDirection>(null);
  
  // Add these methods...
  onHeaderClick(columnName: string): void {
    const currentColumn = this.headerSortColumn();
    const currentDirection = this.headerSortDirection();

    if (currentColumn === columnName) {
      this.headerSortDirection.set(this.tableSortService.getNextDirection(currentDirection));
    } else {
      this.headerSortColumn.set(columnName);
      this.headerSortDirection.set('asc');
    }
  }

  getSortIndicator(columnName: string): string {
    if (this.headerSortColumn() !== columnName) return '';
    const direction = this.headerSortDirection();
    return direction === 'asc' ? ' ↑' : direction === 'desc' ? ' ↓' : '';
  }

  getSortedData(): any[] {
    const headerColumn = this.headerSortColumn();
    const headerDirection = this.headerSortDirection();

    if (headerColumn && headerDirection) {
      return this.tableSortService.sort(this.data(), headerColumn, headerDirection);
    }
    return this.data();
  }
}
```

### Step 2: Add Provider to Component
```typescript
@Component({
  // ...
  providers: [TableSortService]
})
```

### Step 3: Update Template HTML
```html
<table>
  <thead>
    <tr>
      <th class="sortable-header" (click)="onHeaderClick('columnName')" title="Click to sort">
        Column Label{{ getSortIndicator('columnName') }}
      </th>
    </tr>
  </thead>
  <tbody>
    @for (item of getSortedData(); track item.id) {
      <!-- table cells -->
    }
  </tbody>
</table>
```

### Step 4: Add SCSS Styling
```scss
th.sortable-header {
  cursor: pointer;
  user-select: none;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: var(--color-hover);
    color: var(--color-text-strong);
  }
}
```

## Key Features

✅ **Smart Type Handling**: Automatically detects and sorts numbers, dates, and strings correctly
✅ **Nested Properties**: Sort by nested object properties using dot notation (e.g., 'user.name')
✅ **Visual Feedback**: Clear sort indicators (arrows) and hover states
✅ **Cycle Sort**: Clicking header cycles through ascending → descending → no sort
✅ **Multi-table Support**: Can be applied to any table in the application
✅ **Performance**: Efficient sorting with proper change detection
✅ **Accessibility**: Proper titles and semantic HTML

## Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Standard JavaScript sort() algorithm
- CSS transitions for smooth animations

## Future Enhancements
Potential additions for future versions:
- Multi-column sorting (hold Shift and click)
- Sort persistence (save sort state to localStorage)
- Custom sort comparators per column
- Sort icons instead of text arrows
- Keyboard shortcuts for column sorting
- Server-side sorting integration
