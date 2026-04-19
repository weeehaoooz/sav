import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AccountDetailsComponent } from './components/account-details/account-details.component';
import { SecurityComponent } from './components/security/security.component';
import { PreferencesComponent } from './components/preferences/preferences.component';

type SettingsTab = 'account' | 'security' | 'preferences';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    AccountDetailsComponent,
    SecurityComponent,
    PreferencesComponent
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  activeTab = signal<SettingsTab>('account');

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }
}
