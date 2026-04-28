import { Routes } from '@angular/router';
import { authGuard } from '../../../core/guards/auth.guard';
import { roleGuard } from '../../../core/guards/role.guard';

export const financeRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard, roleGuard(['Finance', 'Executive'])],
    loadComponent: () =>
      import('./finance.component').then((m) => m.FinanceComponent),
    data: { title: 'Dashboard Tài chính' }
  },
  {
    path: 'debt-optimization',
    canActivate: [authGuard, roleGuard(['Finance', 'Executive'])],
    loadComponent: () =>
      import('./debt-optimization.component').then((m) => m.DebtOptimizationComponent),
    data: { title: 'Tối ưu Công nợ' }
  }
];
