import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Giao diện'
    },
    children: [
      {
        path: '',
        redirectTo: 'colors',
        pathMatch: 'full'
      },
      {
        path: 'colors',
        loadComponent: () => import('./colors.component').then(m => m.ColorsComponent),
        data: {
          title: 'Màu sắc'
        }
      },
      {
        path: 'typography',
        loadComponent: () => import('./typography.component').then(m => m.TypographyComponent),
        data: {
          title: 'Kiểu chữ'
        }
      }
    ]
  }
];

