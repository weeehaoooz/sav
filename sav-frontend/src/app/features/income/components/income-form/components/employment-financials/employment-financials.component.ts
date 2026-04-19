import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { inject } from '@angular/core';

@Component({
  selector: 'app-employment-financials',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, 
    MatSelectModule, MatButtonModule, MatIconModule
  ],
  templateUrl: './employment-financials.component.html',
  styleUrls: ['./employment-financials.component.scss']
})
export class EmploymentFinancialsComponent {
  private readonly fb = inject(FormBuilder);
  @Input() form!: FormGroup;

  get bonuses() {
    return this.form.get('bonuses') as FormArray;
  }

  addBonus(): void {
    const bonusGroup = this.fb.group({
      month: [12, [Validators.required, Validators.min(1), Validators.max(12)]],
      amount: [0, [Validators.required, Validators.min(0)]]
    });
    this.bonuses.push(bonusGroup);
  }

  removeBonus(index: number): void {
    this.bonuses.removeAt(index);
  }

  readonly months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
}
