import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { DriftService } from '../../services/drift.service';
import { DriftDetail, getDriftTypeClass } from '../../models/drift-detail';
import { DriftFormDialogComponent } from '../../shared/drift-form-dialog/drift-form-dialog.component';

@Component({
  selector: 'app-drift-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule,
    MatTooltipModule, MatSnackBarModule, MatDialogModule,
    MatProgressSpinnerModule, MatChipsModule, MatBadgeModule
  ],
  templateUrl: './drift-list.component.html',
  styleUrl: './drift-list.component.scss'
})
export class DriftListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['id', 'environmentName', 'resourceName', 'driftType', 'detectedAt', 'isResolved', 'actions'];
  dataSource = new MatTableDataSource<DriftDetail>([]);
  filterValue = '';
  loading = false;
  error = '';

  constructor(
    private driftService: DriftService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';
    this.driftService.getAll().subscribe({
      next: (drifts) => {
        this.dataSource.data = drifts;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.setupFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load drifts. Make sure the backend is running.';
        this.loading = false;
      }
    });
  }

  private setupFilter(): void {
    this.dataSource.filterPredicate = (data: DriftDetail, filter: string) => {
      const search = filter.toLowerCase();
      return (
        data.environmentName.toLowerCase().includes(search) ||
        data.resourceName.toLowerCase().includes(search) ||
        data.driftType.toLowerCase().includes(search)
      );
    };
  }

  applyFilter(): void {
    this.dataSource.filter = this.filterValue.trim().toLowerCase();
  }

  clearFilter(): void {
    this.filterValue = '';
    this.dataSource.filter = '';
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(DriftFormDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: null,
      panelClass: 'dark-dialog'
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.driftService.create(result).subscribe({
          next: () => {
            this.loadData();
            this.showSnack('Drift event created successfully', 'success');
          },
          error: () => this.showSnack('Failed to create drift', 'error')
        });
      }
    });
  }

  openEditDialog(drift: DriftDetail): void {
    const ref = this.dialog.open(DriftFormDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: { ...drift },
      panelClass: 'dark-dialog'
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.driftService.update({ ...drift, ...result }).subscribe({
          next: () => {
            this.loadData();
            this.showSnack('Drift event updated successfully', 'success');
          },
          error: () => this.showSnack('Failed to update drift', 'error')
        });
      }
    });
  }

  toggleResolve(drift: DriftDetail): void {
    const updated = { ...drift, isResolved: !drift.isResolved };
    this.driftService.update(updated).subscribe({
      next: () => {
        drift.isResolved = !drift.isResolved;
        const msg = drift.isResolved ? 'Marked as resolved' : 'Marked as active';
        this.showSnack(msg, 'success');
      },
      error: () => this.showSnack('Failed to update status', 'error')
    });
  }

  deleteDrift(drift: DriftDetail): void {
    if (!confirm(`Delete drift "${drift.resourceName}" in ${drift.environmentName}?`)) return;
    this.driftService.delete(drift.id).subscribe({
      next: () => {
        this.dataSource.data = this.dataSource.data.filter(d => d.id !== drift.id);
        this.showSnack('Drift event deleted', 'success');
      },
      error: () => this.showSnack('Failed to delete drift', 'error')
    });
  }

  getDriftClass(driftType: string): string {
    return getDriftTypeClass(driftType);
  }

  formatDriftType(driftType: string): string {
    return driftType.replace(/([A-Z])/g, ' $1').trim();
  }

  private showSnack(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, '✕', {
      duration: 3500,
      panelClass: type === 'error' ? 'snack-error' : 'snack-success',
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
