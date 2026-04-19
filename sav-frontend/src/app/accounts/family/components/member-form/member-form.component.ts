import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Account, AccountType, AccountRole } from '../../../../shared/models/account.model';

@Component({
  selector: 'app-member-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './member-form.component.html',
  styleUrls: ['./member-form.component.scss'],
})
export class MemberFormComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() account: Account | null = null;
  @Input() saving = false;
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  readonly accountTypes: { value: AccountType; label: string }[] = [
    { value: 'primary', label: 'Primary User' },
    { value: 'partner', label: 'Partner / Spouse' },
    { value: 'child_minor', label: 'Child (Minor)' },
    { value: 'child_teen', label: 'Child (Teen)' },
    { value: 'dependent', label: 'Other Dependent' },
  ];

  readonly accountRoles: { value: AccountRole; label: string }[] = [
    { value: 'owner', label: 'Owner (Full Access)' },
    { value: 'co_owner', label: 'Co-owner (Manage All)' },
    { value: 'viewer', label: 'Viewer (Read-only)' },
    { value: 'trustee', label: 'Trustee (Managed for)' },
  ];

  readonly avatarColors = [
    '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#3b82f6'
  ];

  readonly memberForm: FormGroup = this.fb.group({
    display_name: ['', Validators.required],
    account_type: ['child_minor' as AccountType, Validators.required],
    role: ['trustee' as AccountRole, Validators.required],
    date_of_birth: [''],
    avatar_color: ['#6366f1', Validators.required],
  });

  ngOnInit(): void {
    this.updateForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account']) {
      this.updateForm();
    }
  }

  private updateForm(): void {
    if (this.account) {
      this.memberForm.patchValue({
        display_name: this.account.display_name,
        account_type: this.account.account_type,
        role: this.account.role,
        date_of_birth: this.account.date_of_birth ? this.account.date_of_birth.substring(0, 10) : '',
        avatar_color: this.account.avatar_color,
      });
    } else {
      this.memberForm.reset({
        account_type: 'child_minor',
        role: 'trustee',
        avatar_color: this.avatarColors[Math.floor(Math.random() * this.avatarColors.length)],
      });
    }
  }

  onSubmit(): void {
    if (this.memberForm.invalid) return;
    this.save.emit(this.memberForm.value);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  selectColor(color: string): void {
    this.memberForm.patchValue({ avatar_color: color });
  }
}
