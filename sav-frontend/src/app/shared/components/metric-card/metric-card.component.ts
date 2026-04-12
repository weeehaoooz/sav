import { Component, input, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface MetricCardConfig {
  label: string;
  value: number;
  format?: 'currency' | 'percent' | 'number' | 'months';
  trend?: number; // positive = up, negative = down
  icon?: string;
  accentColor?: string;
  subtitle?: string;
}

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, MatIconModule],
  templateUrl: './metric-card.component.html',
  styleUrls: ['./metric-card.component.scss'],
})
export class MetricCardComponent {
  config = input.required<MetricCardConfig>();

  readonly formattedValue = computed(() => {
    const { value, format } = this.config();
    if (format === 'currency') return null; // handled by CurrencyPipe in template
    if (format === 'percent') return `${value.toFixed(0)}%`;
    if (format === 'months') return `${value.toFixed(0)} mo`;
    return value.toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  });

  readonly isCurrency = computed(() => this.config().format === 'currency');

  readonly trendLabel = computed(() => {
    const trend = this.config().trend;
    if (trend == null) return null;
    return trend >= 0 ? `+${trend.toFixed(0)}%` : `${trend.toFixed(0)}%`;
  });

  readonly trendPositive = computed(() => (this.config().trend ?? 0) >= 0);
}
