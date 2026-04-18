import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export interface MetricCellRendererParams extends ICellRendererParams {
  currency?: string;
  useColor?: boolean;
  useIcon?: boolean;
  usePrefix?: boolean;
  suffix?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  color?: string;
  icon?: string;
  weight?: string | number;
  fontSize?: string;
}

@Component({
  selector: 'app-metric-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metric-cell-renderer.component.html',
  styleUrls: ['./metric-cell-renderer.component.scss']
})
export class MetricCellRendererComponent implements ICellRendererAngularComp {
  params!: MetricCellRendererParams;
  formattedValue: string = '';
  currencySymbol: string = '';
  displayColor: string = 'inherit';
  icon: string | null = null;
  prefix: string = '';
  suffix: string = '';
  weight: string | number = 400;
  fontSize: string = '13px';
  iconSize: string = '13px';

  agInit(params: MetricCellRendererParams): void {
    this.params = params;
    this.updateValues(params);
  }

  refresh(params: MetricCellRendererParams): boolean {
    this.params = params;
    this.updateValues(params);
    return true;
  }

  private updateValues(params: MetricCellRendererParams): void {
    const minDigits = params.minimumFractionDigits ?? 2;
    const maxDigits = params.maximumFractionDigits ?? 2;
    const val = this.params.value;
    const absVal = Math.abs(val);

    this.formattedValue = absVal.toLocaleString('en-SG', { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits });
    this.currencySymbol = params.currency ? `${params.currency} ` : '';
    this.suffix = params.suffix ?? '';
    this.weight = params.weight ?? 400;
    this.fontSize = params.fontSize ?? '13px';
    this.iconSize = this.fontSize; // keep icon proportional to text

    if (params.useColor) {
      this.displayColor = val >= 0 ? '#34d399' : '#fb7185';
    } else {
      this.displayColor = params.color ?? 'inherit';
    }

    if (params.useIcon) {
      this.icon = val >= 0 ? 'trending_up' : 'trending_down';
    } else {
      this.icon = params.icon || null;
    }

    if (params.usePrefix) {
      this.prefix = val >= 0 ? '+' : '-';
    } else {
      this.prefix = '';
    }
  }
}
