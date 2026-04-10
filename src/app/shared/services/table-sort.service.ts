import { Injectable } from '@angular/core';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

@Injectable()
export class TableSortService {
  /**
   * Get the next sort direction for a column
   * Cycle: asc -> desc -> null
   */
  getNextDirection(currentDirection: SortDirection): SortDirection {
    if (currentDirection === 'asc') return 'desc';
    if (currentDirection === 'desc') return null;
    return 'asc';
  }

  /**
   * Sort array by column and direction
   */
  sort<T extends Record<string, any>>(
    data: T[],
    column: string,
    direction: SortDirection
  ): T[] {
    if (!direction || !column) {
      return [...data];
    }

    return [...data].sort((a, b) => {
      let aVal = this.getNestedValue(a, column);
      let bVal = this.getNestedValue(b, column);

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === 'asc' ? 1 : -1;
      if (bVal == null) return direction === 'asc' ? -1 : 1;

      // Handle different types
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (aVal instanceof Date && bVal instanceof Date) {
        return direction === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
}
