import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AccountDetailsComponent } from './components/account-details/account-details.component';
import { SecurityComponent } from './components/security/security.component';
import { PreferencesComponent } from './components/preferences/preferences.component';

type ProfileTab = 'account' | 'security' | 'preferences';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    AccountDetailsComponent,
    SecurityComponent,
    PreferencesComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  activeTab = signal<ProfileTab>('account');

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }
}
