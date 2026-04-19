import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Income, IncomeType, Frequency, Bonus, Employment } from '../../../../shared/models/income.model';
import { UserService } from '../../../../shared/services/user.service';
import { EmploymentGeneralComponent } from './components/employment-general/employment-general.component';
import { EmploymentFinancialsComponent } from './components/employment-financials/employment-financials.component';

@Component({
  selector: 'app-income-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    EmploymentGeneralComponent, EmploymentFinancialsComponent
  ],
  templateUrl: './income-form.component.html',
  styleUrls: ['./income-form.component.scss']
})
export class IncomeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly user = inject(UserService);

  @Input() item?: Income | null;
  @Input() saving = false;
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  readonly incomeForm = this.fb.group({
    name: ['', Validators.required],
    company: [''],
    account: [null as number | null],
    income_type: ['employment' as IncomeType, Validators.required],
    has_cpf: [true],
    amount: [0], // Syncs with monthly behind the scenes
    frequency: ['monthly' as Frequency],
    monthly: [0, [Validators.required, Validators.min(0)]],
    average_growth_rate: [3, [Validators.required, Validators.min(-100), Validators.max(100)]],
    start_dt: [null as Date | null, Validators.required],
    end_dt: [null as Date | null],
    notes: [''],
    bonuses: this.fb.array([])
  });

  get bonuses() {
    return this.incomeForm.get('bonuses') as FormArray;
  }

  readonly incomeTypes = [
    { value: 'employment', label: 'Full-time Employment' }
  ];

  ngOnInit(): void {
    if (this.item) {
      // Clear current bonuses array
      while (this.bonuses.length) {
        this.bonuses.removeAt(0);
      }

      const employment = this.item as unknown as Employment;
      if (employment.bonuses) {
        employment.bonuses.forEach(b => this.addBonus(b));
      }

      this.incomeForm.patchValue({
        ...this.item,
        account: this.item.account as any
      });
    } else {
      // Default to currently selected account
      const selected = this.user.selectedAccount();
      if (selected) {
        this.incomeForm.patchValue({ account: selected.id });
      }
    }

    this.incomeForm.get('monthly')?.valueChanges.subscribe(val => {
      this.incomeForm.get('amount')?.setValue(val, { emitEvent: false });
    });
  }

  addBonus(bonus?: Bonus): void {
    const bonusGroup = this.fb.group({
      month: [bonus?.month || 12, [Validators.required, Validators.min(1), Validators.max(12)]],
      amount: [bonus?.amount || 0, [Validators.required, Validators.min(0)]]
    });
    this.bonuses.push(bonusGroup);
  }

  removeBonus(index: number): void {
    this.bonuses.removeAt(index);
  }

  onSubmit(): void {
    if (this.incomeForm.valid) {
      const formValue = this.incomeForm.value;

      // format dates to YYYY-MM-DD
      const start_dt = formValue.start_dt ? new Date(formValue.start_dt).toISOString().split('T')[0] : null;
      const end_dt = formValue.end_dt ? new Date(formValue.end_dt).toISOString().split('T')[0] : null;

      this.save.emit({
        ...formValue,
        start_dt,
        end_dt
      });
    }
  }
}
