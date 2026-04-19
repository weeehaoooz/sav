import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./accounts/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./accounts/auth/register/register.component').then(m => m.RegisterComponent)
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: '',
    loadComponent: () => import('./shared/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'assets',
        loadComponent: () => import('./features/assets/assets.component').then(m => m.AssetsComponent),
      },
      {
        path: 'assets/:id',
        loadComponent: () => import('./features/assets/asset-details/asset-details.component').then(m => m.AssetDetailsComponent),
      },
      {
        path: 'income',
        loadComponent: () => import('./features/income/income.component').then(m => m.IncomeComponent),
      },
      {
        path: 'income/:id',
        loadComponent: () => import('./features/income/income-details/income-details.component').then(m => m.IncomeDetailsComponent),
      },
      {
        path: 'simulations',
        loadComponent: () => import('./features/simulations/simulations.component').then(m => m.SimulationsComponent),
      },
      {
        path: 'family',
        loadComponent: () => import('./accounts/family/family.component').then(m => m.FamilyComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./accounts/settings/settings.component').then(m => m.SettingsComponent),
      },
      {
        path: 'accounts',
        loadChildren: () => import('./accounts/accounts.routes').then(m => m.routes),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
