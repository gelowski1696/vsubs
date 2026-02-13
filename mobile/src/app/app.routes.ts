import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage) },
      { path: 'customers', loadComponent: () => import('./features/customers/customers.page').then((m) => m.CustomersPage) },
      { path: 'plans', loadComponent: () => import('./features/plans/plans.page').then((m) => m.PlansPage) },
      { path: 'subscriptions', loadComponent: () => import('./features/subscriptions/subscriptions.page').then((m) => m.SubscriptionsPage) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage) },
    ],
  },
  { path: '', redirectTo: '/tabs/dashboard', pathMatch: 'full' },
];