import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { StateService } from '../../services/state.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { CurrencyPipe, UpperCasePipe, CommonModule, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Account } from '../../models/account.model';
import { NetworthService } from '../../services/networth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    UpperCasePipe,
    TitleCasePipe
  ],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
})
export class TopbarComponent {
  readonly state = inject(StateService);
  readonly auth = inject(AuthService);
  readonly userService = inject(UserService);
  private readonly eRef = inject(ElementRef);
  readonly netWorthService = inject(NetworthService);

  isMenuOpen = signal(false);

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isMenuOpen.set(false);
    }
  }

  selectAccount(account: Account): void {
    this.userService.selectAccount(account);
    this.isMenuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
  }
}
