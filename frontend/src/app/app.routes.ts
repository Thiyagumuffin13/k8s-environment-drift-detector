import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'drifts',
    loadComponent: () =>
      import('./pages/drift-list/drift-list.component').then(m => m.DriftListComponent)
  },
  { path: '**', redirectTo: '' }
];
