import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DriftService } from '../../services/drift.service';
import { DriftDetail } from '../../models/drift-detail';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
  gradient: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  loading = true;
  error = '';
  drifts: DriftDetail[] = [];
  recentDrifts: DriftDetail[] = [];
  statCards: StatCard[] = [];
  environments: { name: string; total: number; unresolved: number }[] = [];

  constructor(private driftService: DriftService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';
    this.driftService.getAll().subscribe({
      next: (drifts) => {
        this.drifts = drifts;
        this.computeStats();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to connect to API. Make sure the backend is running on port 5138.';
        this.loading = false;
      }
    });
  }

  private computeStats(): void {
    const total = this.drifts.length;
    const resolved = this.drifts.filter(d => d.isResolved).length;
    const unresolved = total - resolved;
    const envSet = new Set(this.drifts.map(d => d.environmentName));

    this.statCards = [
      {
        label: 'Total Drifts', value: total, icon: 'radar', colorClass: 'primary',
        gradient: 'linear-gradient(135deg, #1e1b4b, #3730a3)'
      },
      {
        label: 'Unresolved', value: unresolved, icon: 'warning_amber', colorClass: 'danger',
        gradient: 'linear-gradient(135deg, #450a0a, #991b1b)'
      },
      {
        label: 'Resolved', value: resolved, icon: 'check_circle', colorClass: 'success',
        gradient: 'linear-gradient(135deg, #064e3b, #065f46)'
      },
      {
        label: 'Environments', value: envSet.size, icon: 'cloud', colorClass: 'info',
        gradient: 'linear-gradient(135deg, #0c4a6e, #0369a1)'
      }
    ];

    this.recentDrifts = [...this.drifts]
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
      .slice(0, 6);

    this.environments = Array.from(envSet).map(env => ({
      name: env,
      total: this.drifts.filter(d => d.environmentName === env).length,
      unresolved: this.drifts.filter(d => d.environmentName === env && !d.isResolved).length
    }));
  }

  getDriftClass(driftType: string): string {
    const map: Record<string, string> = {
      ConfigDrift: 'config', ResourceDrift: 'resource',
      VersionDrift: 'version', ScaleDrift: 'scale'
    };
    return map[driftType] ?? 'other';
  }

  formatDriftType(driftType: string): string {
    return driftType.replace(/([A-Z])/g, ' $1').trim();
  }
}
