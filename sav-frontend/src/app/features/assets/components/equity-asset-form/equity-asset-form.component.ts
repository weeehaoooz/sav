import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Asset } from '../../../../shared/models/asset.model';

@Component({
  selector: 'app-equity-asset-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './equity-asset-form.component.html',
  styleUrls: ['./equity-asset-form.component.scss']
})
export class EquityAssetFormComponent {
  private readonly fb = inject(FormBuilder);

  @Input() set asset(value: Asset | null) {
    if (value) {
      this.form.patchValue({
        name: value.name,
        current_value: value.current_value,
        acquisition_value: value.acquisition_value,
        currency: value.currency,
        valuation_date: new Date(value.valuation_date)
      });
    }
  }

  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  readonly form = this.fb.group({
    name: ['', Validators.required],
    current_value: [0, [Validators.required, Validators.min(0)]],
    acquisition_value: [0, [Validators.required, Validators.min(0)]],
    currency: ['SGD', Validators.required],
    valuation_date: [new Date(), Validators.required],
    asset_type: ['equity']
  });

  onSubmit() {
    if (this.form.valid) {
      const rawValue = this.form.value;
      const data = {
        ...rawValue,
        current_value: Number(rawValue.current_value || 0),
        acquisition_value: Number(rawValue.acquisition_value || 0)
      };
      this.save.emit(data);
    }
  }
}
