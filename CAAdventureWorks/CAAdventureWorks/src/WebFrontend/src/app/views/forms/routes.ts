import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Biểu mẫu'
    },
    children: [
      {
        path: '',
        redirectTo: 'form-control',
        pathMatch: 'full'
      },
      {
        path: 'form-control',
        loadComponent: () => import('./form-controls/form-controls.component').then(m => m.FormControlsComponent),
        data: {
          title: 'Điều khiển biểu mẫu'
        }
      },
      {
        path: 'select',
        loadComponent: () => import('./select/select.component').then(m => m.SelectComponent),
        data: {
          title: 'Danh sách chọn'
        }
      },
      {
        path: 'checks-radios',
        loadComponent: () => import('./checks-radios/checks-radios.component').then(m => m.ChecksRadiosComponent),
        data: {
          title: 'Checkbox & Radio'
        }
      },
      {
        path: 'range',
        loadComponent: () => import('./ranges/ranges.component').then(m => m.RangesComponent),
        data: {
          title: 'Thanh giá trị'
        }
      },
      {
        path: 'input-group',
        loadComponent: () => import('./input-groups/input-groups.component').then(m => m.InputGroupsComponent),
        data: {
          title: 'Nhóm nhập liệu'
        }
      },
      {
        path: 'floating-labels',
        loadComponent: () => import('./floating-labels/floating-labels.component').then(m => m.FloatingLabelsComponent),
        data: {
          title: 'Nhãn nổi'
        }
      },
      {
        path: 'layout',
        loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
        data: {
          title: 'Bố cục'
        }
      },
      {
        path: 'validation',
        loadComponent: () => import('./validation/validation.component').then(m => m.ValidationComponent),
        data: {
          title: 'Kiểm tra hợp lệ'
        }
      }
    ]
  }
];
