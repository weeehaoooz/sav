import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Asset } from '../../../../shared/models/asset.model';
import { UserService } from '../../../../shared/services/user.service';

@Component({
  selector: 'app-cpf-asset-form',
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
  templateUrl: './cpf-asset-form.component.html',
  styleUrls: ['./cpf-asset-form.component.scss']
})
export class CpfAssetFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly userService = inject(UserService);

  @Input() set asset(value: Asset | null) {
    if (value) {
      this.form.patchValue({
        name: value.name,
        cpf_oa: value.cpf_oa,
        cpf_sa: value.cpf_sa,
        cpf_ma: value.cpf_ma,
        cpf_ra: value.cpf_ra,
        valuation_date: new Date(value.valuation_date)
      });
    }
  }

  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  readonly form = this.fb.group({
    name: ['CPF Accounts', Validators.required],
    cpf_oa: [0, [Validators.required, Validators.min(0)]],
    cpf_sa: [0, [Validators.required, Validators.min(0)]],
    cpf_ma: [0, [Validators.required, Validators.min(0)]],
    cpf_ra: [0, [Validators.required, Validators.min(0)]],
    valuation_date: [new Date(), Validators.required],
    current_value: [0],
    asset_type: ['cpf']
  });

  ngOnInit() {
    this.form.valueChanges.subscribe(val => {
      const total = Number(val.cpf_oa || 0) + Number(val.cpf_sa || 0) + Number(val.cpf_ma || 0) + Number(val.cpf_ra || 0);
      const roundedTotal = Math.round(total * 100) / 100;
      if (this.form.get('current_value')?.value !== roundedTotal) {
        this.form.get('current_value')?.setValue(roundedTotal, { emitEvent: false });
      }
    });
  }

  get userAge(): number {
    return this.userService.selectedAccount()?.age ?? 0;
  }

  onSubmit() {
    if (this.form.valid) {
      const rawValue = this.form.value;
      const data = {
        ...rawValue,
        cpf_oa: Number(rawValue.cpf_oa || 0),
        cpf_sa: Number(rawValue.cpf_sa || 0),
        cpf_ma: Number(rawValue.cpf_ma || 0),
        cpf_ra: Number(rawValue.cpf_ra || 0),
        current_value: Number(rawValue.current_value || 0)
      };
      this.save.emit(data);
    }
  }
}
