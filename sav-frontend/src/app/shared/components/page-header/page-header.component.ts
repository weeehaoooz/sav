import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>('');
  actionLabel = input<string>('');
  actionIcon = input<string>('add');

  actionClicked = output<void>();

  onAction(): void {
    this.actionClicked.emit();
  }
}
