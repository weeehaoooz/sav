import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../shared/services/api.service';
import { Asset, AssetValuationHistory } from '../../../shared/models/asset.model';

@Component({
  selector: 'app-asset-history-dialog',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, 
    MatTableModule, MatIconModule, MatSnackBarModule
  ],
  templateUrl: './asset-history-dialog.component.html',
  styles: [`
    .history-table { width: 100%; margin-top: 1rem; }
    .header { display: flex; justify-content: space-between; align-items: center; }
    .dialog-content { min-width: 500px; max-height: 70vh; overflow-y: auto; }
    .delete-btn { color: #fb7185; }
    .cpf-breakdown { font-size: 11px; color: #94a3b8; display: block; }
  `]
})
export class AssetHistoryDialogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackbar = inject(MatSnackBar);
  readonly dialogRef = inject(MatDialogRef<AssetHistoryDialogComponent>);
  readonly data = inject<{ asset: Asset }>(MAT_DIALOG_DATA);

  readonly history = signal<AssetValuationHistory[]>([]);
  readonly loading = signal(true);
  readonly columns = ['date', 'value', 'actions'];

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading.set(true);
    this.api.getAssetHistory(this.data.asset.id).subscribe({
      next: (data) => {
        this.history.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.snackbar.open('Failed to load history', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  deleteEntry(id: number): void {
    if (!confirm('Are you sure you want to delete this historical valuation?')) return;

    this.api.deleteAssetHistory(id).subscribe({
      next: () => {
        this.snackbar.open('Entry deleted', 'Close', { duration: 3000 });
        this.loadHistory();
      },
      error: () => {
        this.snackbar.open('Failed to delete entry', 'Close', { duration: 3000 });
      }
    });
  }
}
