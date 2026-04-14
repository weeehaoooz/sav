import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { StateService } from '../../shared/services/state.service';
import { LiabilityService } from '../../shared/services/liability.service';
import { MetricCardComponent, MetricCardConfig } from '../../shared/components/metric-card/metric-card.component';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AssetService } from '../../shared/services/asset.service';
import type { EChartsOption } from 'echarts';
import { NetworthService } from '../../shared/services/networth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, MetricCardComponent, ChartCardComponent, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  readonly state = inject(StateService);
  readonly netWorthService = inject(NetworthService);
  readonly assetService = inject(AssetService);
  readonly liabilityService = inject(LiabilityService);

  // ── Metric Cards ─────────────────────────────────────────────────────────
  readonly metrics = computed<MetricCardConfig[]>(() => {
    const d = this.state.dashboard();
    return [
      {
        label: 'Net Worth',
        value: this.netWorthService.networth(),
        format: 'currency',
        icon: 'account_balance',
        accentColor: '#6366f1',
        subtitle: '(Net Value) Total Assets minus Total Liabilities (debts, loans)',
      },
      {
        label: 'Monthly Cash Flow',
        value: d?.cash_flow?.monthly_cash_flow ?? this.state.monthlyCashFlow(),
        format: 'currency',
        icon: 'swap_vert',
        accentColor: '#06b6d4',
        subtitle: 'Income minus expenses',
      },
      {
        label: 'Retirement Readiness',
        value: d?.retirement_readiness ?? 0,
        format: 'percent',
        icon: 'elderly',
        accentColor: '#10b981',
        subtitle: `FIRE age: ${d?.fire_age ?? '—'}`,
      },
      {
        label: 'Emergency Fund',
        value: d?.emergency_fund?.months_covered ?? 0,
        format: 'months',
        icon: 'shield',
        accentColor: '#f59e0b',
        subtitle: 'Months of expenses covered',
      },
    ];
  });

  // ── Asset Allocation Donut ────────────────────────────────────────────────
  readonly assetAllocationChart = computed<EChartsOption>(() => {
    const byType = this.assetService.assetsByType();
    const data = Object.entries(byType).map(([type, assets]) => ({
      name: this.formatAssetType(type),
      value: assets.reduce((s, a) => s + (Number(a.current_value) || 0), 0),
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const val = Number(params.value).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return `${params.name}: SGD ${val} (${params.percent}%)`;
        },
        backgroundColor: '#1e2740',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { color: '#f0f4ff', fontFamily: 'Inter' },
      },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'middle',
        textStyle: { color: '#8b9cc8', fontSize: 11 },
      },
      series: [{
        type: 'pie',
        radius: ['50%', '78%'],
        center: ['38%', '50%'],
        data,
        label: { show: false },
        emphasis: {
          itemStyle: { shadowBlur: 16, shadowOffsetX: 0, shadowColor: 'rgba(99,102,241,0.4)' },
        },
        color: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'],
      }],
    };
  });

  // ── Income vs Expenses Bar ────────────────────────────────────────────────
  readonly cashFlowChart = computed<EChartsOption>(() => {
    const d = this.state.dashboard();
    const monthlyIncome = d?.cash_flow.monthly_income ?? this.state.totalMonthlyIncome();
    const monthlyExpenses = d?.cash_flow.monthly_expenses ?? this.state.totalMonthlyExpenses();

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e2740',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { color: '#f0f4ff', fontFamily: 'Inter' },
      },
      xAxis: {
        type: 'category',
        data: ['Income', 'Expenses', 'Net'],
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        axisLabel: { color: '#8b9cc8', fontFamily: 'Inter', fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#8b9cc8',
          fontFamily: 'Inter',
          fontSize: 10,
          formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`,
        },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      },
      series: [{
        type: 'bar',
        data: [
          { value: monthlyIncome, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
          { value: monthlyExpenses, itemStyle: { color: '#f43f5e', borderRadius: [4, 4, 0, 0] } },
          {
            value: monthlyIncome - monthlyExpenses,
            itemStyle: {
              color: monthlyIncome >= monthlyExpenses ? '#6366f1' : '#f59e0b',
              borderRadius: [4, 4, 0, 0],
            },
          },
        ],
        barWidth: '40%',
      }],
    };
  });

  private formatAssetType(type: string): string {
    const labels: Record<string, string> = {
      bank: 'Bank', equity: 'Equity', cpf: 'CPF',
    };
    return labels[type] ?? type;
  }
}
