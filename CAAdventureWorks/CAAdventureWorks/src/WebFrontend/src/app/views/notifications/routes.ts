import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Thông báo'
    },
    children: [
      {
        path: '',
        redirectTo: 'badges',
        pathMatch: 'full'
      },
      {
        path: 'alerts',
        loadComponent: () => import('./alerts/alerts.component').then(m => m.AlertsComponent),
        data: {
          title: 'Cảnh báo'
        }
      },
      {
        path: 'badges',
        loadComponent: () => import('./badges/badges.component').then(m => m.BadgesComponent),
        data: {
          title: 'Huy hiệu'
        }
      },
      {
        path: 'modal',
        loadComponent: () => import('./modals/modals.component').then(m => m.ModalsComponent),
        data: {
          title: 'Hộp thoại'
        }
      },
      {
        path: 'toasts',
        loadComponent: () => import('./toasters/toasters.component').then(m => m.ToastersComponent),
        data: {
          title: 'Thông báo nhanh'
        }
      }
    ]
  }
];
