import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ThemeService } from '../../shared/services/theme.service';

@Component({
  selector: 'app-simulations',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, PageHeaderComponent],
  templateUrl: './simulations.component.html',
  styleUrls: ['./simulations.component.scss'],
})
export class SimulationsComponent {
  private themeService = inject(ThemeService);
  isDark = this.themeService.isDark;
}
