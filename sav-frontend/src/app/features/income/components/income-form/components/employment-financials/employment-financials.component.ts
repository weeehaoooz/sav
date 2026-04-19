import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-employment-financials',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './employment-financials.component.html',
  styleUrls: ['./employment-financials.component.scss']
})
export class EmploymentFinancialsComponent {
  @Input() form!: FormGroup;
  @Input() frequencies: { value: string; label: string }[] = [];
}
