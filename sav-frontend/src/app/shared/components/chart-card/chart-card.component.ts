import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './chart-card.component.html',
  styleUrls: ['./chart-card.component.scss'],
})
export class ChartCardComponent {
  title = input.required<string>();
  subtitle = input<string>('');
  options = input.required<EChartsOption>();
  height = input<string>('280px');
  loading = input<boolean>(false);
}
