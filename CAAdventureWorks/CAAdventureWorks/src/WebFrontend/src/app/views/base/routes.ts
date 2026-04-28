import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Cơ bản'
    },
    children: [
      {
        path: '',
        redirectTo: 'cards',
        pathMatch: 'full'
      },
      {
        path: 'accordion',
        loadComponent: () => import('./accordion/accordions.component').then(m => m.AccordionsComponent),
        data: {
          title: 'Thu gọn mở rộng'
        }
      },
      {
        path: 'breadcrumbs',
        loadComponent: () => import('./breadcrumbs/breadcrumbs.component').then(m => m.BreadcrumbsComponent),
        data: {
          title: 'Đường dẫn điều hướng'
        }
      },
      {
        path: 'cards',
        loadComponent: () => import('./cards/cards.component').then(m => m.CardsComponent),
        data: {
          title: 'Thẻ nội dung'
        }
      },
      {
        path: 'carousel',
        loadComponent: () => import('./carousels/carousels.component').then(m => m.CarouselsComponent),
        data: {
          title: 'Trình chiếu'
        }
      },
      {
        path: 'collapse',
        loadComponent: () => import('./collapses/collapses.component').then(m => m.CollapsesComponent),
        data: {
          title: 'Thu gọn'
        }
      },
      {
        path: 'list-group',
        loadComponent: () => import('./list-groups/list-groups.component').then(m => m.ListGroupsComponent),
        data: {
          title: 'Nhóm danh sách'
        }
      },
      {
        path: 'navs',
        loadComponent: () => import('./navs/navs.component').then(m => m.NavsComponent),
        data: {
          title: 'Điều hướng & Tab'
        }
      },
      {
        path: 'pagination',
        loadComponent: () => import('./paginations/paginations.component').then(m => m.PaginationsComponent),
        data: {
          title: 'Phân trang'
        }
      },
      {
        path: 'placeholder',
        loadComponent: () => import('./placeholders/placeholders.component').then(m => m.PlaceholdersComponent),
        data: {
          title: 'Khung chờ'
        }
      },
      {
        path: 'popovers',
        loadComponent: () => import('./popovers/popovers.component').then(m => m.PopoversComponent),
        data: {
          title: 'Hộp bật lên'
        }
      },
      {
        path: 'progress',
        loadComponent: () => import('./progress/progress.component').then(m => m.AppProgressComponent),
        data: {
          title: 'Tiến độ'
        }
      },
      {
        path: 'spinners',
        loadComponent: () => import('./spinners/spinners.component').then(m => m.SpinnersComponent),
        data: {
          title: 'Biểu tượng tải'
        }
      },
      {
        path: 'tables',
        loadComponent: () => import('./tables/tables.component').then(m => m.TablesComponent),
        data: {
          title: 'Bảng dữ liệu'
        }
      },
      {
        path: 'tabs',
        loadComponent: () => import('./tabs/tabs.component').then(m => m.AppTabsComponent),
        data: {
          title: 'Tab'
        }
      },
      {
        path: 'tooltips',
        loadComponent: () => import('./tooltips/tooltips.component').then(m => m.TooltipsComponent),
        data: {
          title: 'Chú giải'
        }
      }
    ]
  }
];


