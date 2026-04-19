import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LogoComponent } from '../../components/logo/logo.component';

export interface NavItem {
  label: string;
  icon: string;
  path: string;
  hasDivider?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatRippleModule, MatTooltipModule, LogoComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  readonly collapsed = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { label: 'Assets', icon: 'account_balance', path: '/assets', hasDivider: true },
    { label: 'Income', icon: 'trending_up', path: '/income', hasDivider: true },
    { label: 'Simulations', icon: 'timeline', path: '/simulations', hasDivider: true },
    { label: 'Family', icon: 'people', path: '/family', hasDivider: true }
  ];

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
  }
}