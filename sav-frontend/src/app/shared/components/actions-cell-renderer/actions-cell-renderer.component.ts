import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export interface ActionButtonConfig {
  icon: string;
  tooltip?: string;
  class?: string;
  color?: string;
  backgroundColor?: string;
  action: (params: ICellRendererParams) => void;
  show?: (params: ICellRendererParams) => boolean;
}

export interface ActionCellRendererParams extends ICellRendererParams {
  actions: ActionButtonConfig[];
}

@Component({
  selector: 'app-actions-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './actions-cell-renderer.component.html',
  styleUrls: ['./actions-cell-renderer.component.scss']
})
export class ActionsCellRendererComponent implements ICellRendererAngularComp {
  params!: ActionCellRendererParams;
  actions: ActionButtonConfig[] = [];

  agInit(params: ActionCellRendererParams): void {
    this.params = params;
    this.actions = params.actions || [];
  }

  refresh(params: ActionCellRendererParams): boolean {
    this.params = params;
    this.actions = params.actions || [];
    return true;
  }
}
