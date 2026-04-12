import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Asset } from '../../../../shared/models/asset.model';

@Component({
  selector: 'app-bank-asset-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './bank-asset-form.component.html',
  styleUrls: ['./bank-asset-form.component.scss']
})
export class BankAssetFormComponent {
  private readonly fb = inject(FormBuilder);

  @Input() set asset(value: Asset | null) {
    if (value) {
      this.form.patchValue({
        name: value.name,
        current_value: value.current_value,
        valuation_date: new Date(value.valuation_date)
      });
    }
  }

  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  readonly form = this.fb.group({
    name: ['', Validators.required],
    current_value: [0, [Validators.required, Validators.min(0)]],
    valuation_date: [new Date(), Validators.required],
    asset_type: ['bank']
  });

  onSubmit() {
    if (this.form.valid) {
      this.save.emit(this.form.value);
    }
  }
}
