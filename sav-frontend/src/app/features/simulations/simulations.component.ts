import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatDividerModule } from '@angular/material/divider';

import { StateService } from '../../shared/services/state.service';
import { ApiService } from '../../shared/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { MetricCardComponent, MetricCardConfig } from '../../shared/components/metric-card/metric-card.component';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { RetirementResult } from '../../shared/models/simulation.model';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-simulations',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatDividerModule, PageHeaderComponent, MetricCardComponent, ChartCardComponent,
  ],
  templateUrl: './simulations.component.html',
  styleUrls: ['./simulations.component.scss'],
})
export class SimulationsComponent {
  readonly state = inject(StateService);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  readonly running = signal(false);
  readonly result = signal<RetirementResult | null>(null);

  readonly params = this.fb.group({
    current_age: [35, [Validators.required, Validators.min(18), Validators.max(80)]],
    retirement_age: [65, [Validators.required, Validators.min(40), Validators.max(90)]],
    current_net_worth: [0, Validators.min(0)],
    monthly_savings: [2000, Validators.min(0)],
    annual_return: [0.07, [Validators.min(0), Validators.max(0.5)]],
    inflation_rate: [0.025, [Validators.min(0), Validators.max(0.2)]],
    annual_expenses: [60000, Validators.min(0)],
  });

  readonly metrics = computed<MetricCardConfig[]>(() => {
    const r = this.result();
    if (!r) return [];
    return [
      { label: 'Readiness Score', value: r.readiness_score, format: 'percent', icon: 'elderly', accentColor: r.readiness_score >= 80 ? '#10b981' : r.readiness_score >= 50 ? '#f59e0b' : '#f43f5e' },
      { label: 'Target Nest Egg', value: r.target_nest_egg, format: 'currency', icon: 'savings', accentColor: '#6366f1' },
      { label: 'Projected at Retirement', value: r.projected_at_retirement, format: 'currency', icon: 'account_balance', accentColor: '#06b6d4' },
      { label: 'FIRE Age', value: r.fire_age ?? 0, format: 'number', icon: 'local_fire_department', accentColor: '#f59e0b', subtitle: r.fire_age ? `In ${(r.fire_age ?? 0) - (this.params.value.current_age ?? 35)} years` : 'Not yet reached' },
    ];
  });

  readonly projectionChart = computed<EChartsOption>(() => {
    const r = this.result();
    if (!r) return {};
    const retirementAge = this.params.value.retirement_age ?? 65;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e2740',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { color: '#f0f4ff', fontFamily: 'Inter' },
        formatter: (params: any) => {
          const d = params[0].data;
          return `Age ${params[0].axisValue}<br/>Net Worth: SGD ${Number(d).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        },
      },
      xAxis: {
        type: 'category',
        data: r.projections.map(p => p.age),
        axisLabel: { color: '#8b9cc8', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#8b9cc8', fontSize: 10, formatter: (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k` },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      },
      visualMap: {
        show: false,
        pieces: [
          { lte: retirementAge, color: '#6366f1' },
          { gt: retirementAge, color: '#f43f5e' },
        ],
        dimension: 0,
        seriesIndex: 0,
      },
      series: [{
        type: 'line',
        data: r.projections.map(p => p.net_worth),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99,102,241,0.3)' },
              { offset: 1, color: 'rgba(99,102,241,0.02)' },
            ],
          },
        },
      }],
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: 'rgba(255,255,255,0.2)' },
        data: [{ xAxis: retirementAge, label: { formatter: 'Retirement', color: '#8b9cc8', fontSize: 10 } }],
      },
    };
  });

  runSimulation(): void {
    if (this.params.invalid) return;
    this.running.set(true);
    this.api.runRetirementSimulation(this.params.value as Record<string, number>).subscribe({
      next: (result) => {
        this.result.set(result);
        this.running.set(false);
      },
      error: () => this.running.set(false),
    });
  }
}
