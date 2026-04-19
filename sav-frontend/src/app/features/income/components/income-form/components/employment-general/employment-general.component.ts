import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Account } from '../../../../../../shared/models/account.model';

@Component({
  selector: 'app-employment-general',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSlideToggleModule, MatDatepickerModule, MatNativeDateModule
  ],
  templateUrl: './employment-general.component.html',
  styleUrls: ['./employment-general.component.scss']
})
export class EmploymentGeneralComponent {
  @Input() form!: FormGroup;
  @Input() accounts: Account[] = [];
  @Input() incomeTypes: { value: string; label: string }[] = [];
}
