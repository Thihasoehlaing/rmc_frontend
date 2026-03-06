import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  username = 'RMC_Admin';

  stats = [
    { label: 'Total Applications', value: '1,284', icon: 'description', trend: +12, color: '#3b82f6' },
    { label: 'Pending Review', value: '43', icon: 'pending_actions', trend: -5, color: '#f59e0b' },
    { label: 'Approved Today', value: '12', icon: 'check_circle', trend: +18, color: '#10b981' },
    { label: 'Total Funding', value: 'RM 12.4M', icon: 'payments', trend: +2, color: '#8b5cf6' }
  ];

  recentApps = [
    { id: 'RDIG-2024-001', title: 'Smart Agriculture using IoT', status: 'Approved', date: new Date('2024-03-01') },
    { id: 'RDIG-2024-002', title: 'Blockchain for Supply Chain', status: 'Pending', date: new Date('2024-03-02') },
    { id: 'CONF-2024-045', title: 'IEEE AI Conference 2024', status: 'In-Review', date: new Date('2024-03-03') },
    { id: 'RDIG-2024-003', title: 'Sustainable Energy Solutions', status: 'Rejected', date: new Date('2024-02-28') }
  ];
}
