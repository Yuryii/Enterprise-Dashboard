import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Biểu tượng'
    },
    children: [
      {
        path: '',
        redirectTo: 'coreui-icons',
        pathMatch: 'full'
      },
      {
        path: 'coreui-icons',
        loadComponent: () => import('./coreui-icons.component').then(m => m.CoreUIIconsComponent),
        data: {
          title: 'Biểu tượng CoreUI'
        }
      },
      {
        path: 'brands',
        loadComponent: () => import('./coreui-icons.component').then(m => m.CoreUIIconsComponent),
        data: {
          title: 'Thương hiệu'
        }
      },
      {
        path: 'flags',
        loadComponent: () => import('./coreui-icons.component').then(m => m.CoreUIIconsComponent),
        data: {
          title: 'Cờ'
        }
      }
    ]
  }
];
