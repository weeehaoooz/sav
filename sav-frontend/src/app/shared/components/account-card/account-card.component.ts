import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Account } from '../../models/account.model';

@Component({
  selector: 'app-account-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './account-card.component.html',
  styleUrls: ['./account-card.component.scss']
})
export class AccountCardComponent {
  @Input({ required: true }) account!: Account;
  @Output() edit = new EventEmitter<Account>();
  @Output() delete = new EventEmitter<number>();

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  get age(): number | null {
    if (!this.account.date_of_birth) return null;
    try {
      const birthDate = new Date(this.account.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  }

  onEdit(): void {
    this.edit.emit(this.account);
  }

  onDelete(): void {
    this.delete.emit(this.account.id);
  }
}
