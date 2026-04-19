import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Account } from '../../../../../../shared/models/account.model';

@Component({
  selector: 'app-employment-general-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  templateUrl: './employment-general-info.component.html',
  styleUrls: ['./employment-general-info.component.scss']
})
export class EmploymentGeneralInfoComponent {
  @Input() form!: FormGroup;
  @Input() accounts: Account[] = [];
  @Input() incomeTypes: { value: string; label: string }[] = [];
}
