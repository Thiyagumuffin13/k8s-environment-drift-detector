import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DriftDetail, DRIFT_TYPES } from '../../models/drift-detail';

@Component({
  selector: 'app-drift-form-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatDialogModule, MatInputModule, MatFormFieldModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatSlideToggleModule
  ],
  templateUrl: './drift-form-dialog.component.html',
  styleUrl: './drift-form-dialog.component.scss'
})
export class DriftFormDialogComponent {
  form: FormGroup;
  isEdit: boolean;
  driftTypes = DRIFT_TYPES;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DriftFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DriftDetail | null
  ) {
    this.isEdit = !!data;
    this.form = this.fb.group({
      environmentName: [data?.environmentName ?? '', [Validators.required, Validators.minLength(1)]],
      resourceName: [data?.resourceName ?? '', [Validators.required, Validators.minLength(1)]],
      driftType: [data?.driftType ?? '', Validators.required],
      isResolved: [data?.isResolved ?? false]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
