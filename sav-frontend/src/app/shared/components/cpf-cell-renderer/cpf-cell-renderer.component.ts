import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export interface CpfCellRendererParams extends ICellRendererParams {
  currency?: string;
}

@Component({
  selector: 'app-cpf-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cpf-cell-renderer.component.html',
  styleUrls: ['./cpf-cell-renderer.component.scss']
})
export class CpfCellRendererComponent implements ICellRendererAngularComp {
  params!: CpfCellRendererParams;
  formattedValue: string = '';
  currency: string = 'SGD';
  oa: string = '0.00';
  sa: string = '0.00';
  ma: string = '0.00';

  agInit(params: CpfCellRendererParams): void {
    this.params = params;
    this.updateValues(params);
  }

  refresh(params: CpfCellRendererParams): boolean {
    this.params = params;
    this.updateValues(params);
    return true;
  }

  private updateValues(params: CpfCellRendererParams): void {
    this.currency = params.currency || 'SGD';
    const cfg = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

    this.formattedValue = Number(params.value ?? 0).toLocaleString('en-SG', cfg);
    this.oa = Number(params.data.cpf_oa || 0).toLocaleString('en-SG', cfg);
    this.sa = Number(params.data.cpf_sa || 0).toLocaleString('en-SG', cfg);
    this.ma = Number(params.data.cpf_ma || 0).toLocaleString('en-SG', cfg);
  }
}
