import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { nextTableSortState, SortDirection } from '../../../shared/services/table-sort.service';

type AccessStatus = 'active' | 'blocked';
type StatusFilter = 'all' | AccessStatus;
type SortColumn = 'name' | 'staffId' | 'department' | 'role';

interface StaffAccessRecord {
  id: number;
  name: string;
  staffId: string;
  department: string;
  role: string;
  email: string;
  status: AccessStatus;
  blockedDate: string;
  reason: string;
  initials: string;
}

@Component({
  selector: 'app-staff-access',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent],
  templateUrl: './staff-access.component.html',
  styleUrls: ['./staff-access.component.scss'],
})
export class StaffAccessComponent {
  readonly columns: DataTableColumn[] = [
    { key: 'name', label: 'Staff Name', sortable: true },
    { key: 'staffId', label: 'Staff ID', sortable: true },
    { key: 'department', label: 'Department', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
    { key: 'blockedDate', label: 'Blocked Date' },
    { key: 'reason', label: 'Reason' },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
      headerAlign: 'center',
    },
  ];
  readonly staffRecords = signal<StaffAccessRecord[]>([
    {
      id: 1,
      name: 'Ahmad Razif bin Omar',
      staffId: 'USM0999',
      department: 'IT',
      role: 'System Admin',
      email: 'razif.omar@uni.edu.my',
      status: 'active',
      blockedDate: '',
      reason: '',
      initials: 'AR',
    },
    {
      id: 2,
      name: 'Dr. Hafizuddin bin Rashid',
      staffId: 'USM0345',
      department: 'Engineering',
      role: 'Senior Lecturer',
      email: 'hafizuddin@uni.edu.my',
      status: 'active',
      blockedDate: '',
      reason: '',
      initials: 'DH',
    },
    {
      id: 3,
      name: 'Dr. Hassan Ali bin Mohamed',
      staffId: 'USM1205',
      department: 'Research Dept',
      role: 'Senior Researcher',
      email: 'hassan.ali@uni.edu.my',
      status: 'active',
      blockedDate: '',
      reason: '',
      initials: 'DH',
    },
    {
      id: 4,
      name: 'Dr. Siti Aminah bte Kamaruddin',
      staffId: 'USM0002',
      department: 'Computer Science',
      role: 'Associate Professor',
      email: 'siti.aminah@uni.edu.my',
      status: 'active',
      blockedDate: '',
      reason: '',
      initials: 'DS',
    },
    {
      id: 5,
      name: 'Mohd Faris bin Azlan',
      staffId: 'USM0234',
      department: 'Computer Science',
      role: 'Lecturer',
      email: 'faris.azlan@uni.edu.my',
      status: 'blocked',
      blockedDate: '08 Apr 2026',
      reason: 'Account audit',
      initials: 'MF',
    },
    {
      id: 6,
      name: 'Nurul Aina bt Yusof',
      staffId: 'USM0456',
      department: 'HR',
      role: 'HR Officer',
      email: 'nurul.aina@uni.edu.my',
      status: 'active',
      blockedDate: '',
      reason: '',
      initials: 'NA',
    },
    {
      id: 7,
      name: 'Pn. Rohani bt Ismail',
      staffId: 'USM0567',
      department: 'Research Dept',
      role: 'Research Officer',
      email: 'rohani@uni.edu.my',
      status: 'active',
      blockedDate: '',
      reason: '',
      initials: 'PR',
    },
    {
      id: 8,
      name: 'Prof. Dr. Ahmad Zaki bin Hassan',
      staffId: 'USM0001',
      department: 'Computer Science',
      role: 'Professor',
      email: 'ahmad.zaki@uni.edu.my',
      status: 'blocked',
      blockedDate: '22 Apr 2026',
      reason: 'Pending committee review',
      initials: 'PD',
    },
    {
      id: 9,
      name: 'Prof. Dr. Zulkifli bin Ahmad',
      staffId: 'USM0112',
      department: 'Mathematics',
      role: 'Professor',
      email: 'zulkifli@uni.edu.my',
      status: 'active',
      blockedDate: '',
      reason: '',
      initials: 'PD',
    },
    {
      id: 10,
      name: 'Siti Norbayah bt Kamal',
      staffId: 'USM0891',
      department: 'Engineering',
      role: 'Admin Staff',
      email: 'norbayah@uni.edu.my',
      status: 'active',
      blockedDate: '',
      reason: '',
      initials: 'SN',
    },
  ]);

  readonly departmentFilter = signal('all');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly searchFilter = signal('');
  readonly sortColumn = signal<SortColumn | null>(null);
  readonly sortDirection = signal<SortDirection>(null);

  readonly blockedCount = computed(
    () => this.staffRecords().filter((staff) => staff.status === 'blocked').length,
  );

  readonly departmentOptions = computed(() => {
    const values = this.staffRecords().map((staff) => staff.department);
    return Array.from(new Set(values)).sort((first, second) => first.localeCompare(second));
  });

  readonly filteredStaff = computed(() => {
    const department = this.departmentFilter();
    const status = this.statusFilter();
    const search = this.searchFilter().trim().toLowerCase();

    return this.staffRecords().filter((staff) => {
      const matchesDepartment = department === 'all' || staff.department === department;
      const matchesStatus = status === 'all' || staff.status === status;
      if (!matchesDepartment || !matchesStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [staff.name, staff.staffId, staff.department, staff.role, staff.email]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  });

  readonly sortedStaff = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection();
    if (!column || !direction) return this.filteredStaff();
    const directionFactor = direction === 'asc' ? 1 : -1;

    return [...this.filteredStaff()].sort((first, second) => {
      const firstValue = first[column].toLowerCase();
      const secondValue = second[column].toLowerCase();
      return firstValue.localeCompare(secondValue) * directionFactor;
    });
  });

  setDepartmentFilter(value: string): void {
    this.departmentFilter.set(value || 'all');
  }

  setStatusFilter(value: string): void {
    if (value === 'active' || value === 'blocked' || value === 'all') {
      this.statusFilter.set(value);
      return;
    }

    this.statusFilter.set('all');
  }

  setSearchFilter(value: string): void {
    this.searchFilter.set(value);
  }

  setSort(column: string): void {
    if (!['name', 'staffId', 'department', 'role'].includes(column)) return;
    const next = nextTableSortState(
      { column: this.sortColumn(), direction: this.sortDirection() },
      column,
    );
    this.sortColumn.set(next.column as SortColumn | null);
    this.sortDirection.set(next.direction);
  }

  toggleAccess(staffId: number): void {
    this.staffRecords.update((records) =>
      records.map((staff) => {
        if (staff.id !== staffId) {
          return staff;
        }

        if (staff.status === 'blocked') {
          return {
            ...staff,
            status: 'active',
            blockedDate: '',
            reason: '',
          };
        }

        return {
          ...staff,
          status: 'blocked',
          blockedDate: this.formatDate(new Date()),
          reason: 'Access manually blocked by admin',
        };
      }),
    );
  }

  private formatDate(value: Date): string {
    const day = value.getDate().toString().padStart(2, '0');
    const month = value.toLocaleString('en-US', { month: 'short' });
    const year = value.getFullYear().toString();
    return `${day} ${month} ${year}`;
  }
}
