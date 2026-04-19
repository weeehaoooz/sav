import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Income, IncomeType, Frequency } from '../../../../shared/models/income.model';
import { StateService } from '../../../../shared/services/state.service';
import { UserService } from '../../../../shared/services/user.service';
import { EmploymentGeneralInfoComponent } from './components/employment-general-info/employment-general-info.component';
import { EmploymentFinancialsComponent } from './components/employment-financials/employment-financials.component';

@Component({
  selector: 'app-income-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    EmploymentGeneralInfoComponent, EmploymentFinancialsComponent
  ],
  templateUrl: './income-form.component.html',
  styleUrls: ['./income-form.component.scss']
})
export class IncomeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly state = inject(StateService);
  readonly user = inject(UserService);

  @Input() item?: Income | null;
  @Input() saving = false;
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  readonly incomeForm = this.fb.group({
    name: ['', Validators.required],
    company: [''],
    account: [null as number | null],
    income_type: ['salary' as IncomeType, Validators.required],
    has_cpf: [true],
    amount: [0, [Validators.required, Validators.min(0)]],
    frequency: ['monthly' as Frequency, Validators.required],
    notes: [''],
  });

  readonly incomeTypes = [
    { value: 'salary', label: 'Full-time Employment' }
  ];

  readonly frequencies = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' },
    { value: 'one_off', label: 'One-off' },
  ];

  ngOnInit(): void {
    if (this.item) {
      this.incomeForm.patchValue({
        ...this.item,
        account: this.item.account as any
      });
    }
  }

  onSubmit(): void {
    if (this.incomeForm.valid) {
      this.save.emit(this.incomeForm.value);
    }
  }
}
