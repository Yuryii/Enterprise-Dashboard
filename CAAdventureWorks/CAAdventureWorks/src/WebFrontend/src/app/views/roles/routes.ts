import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { RolesHomeComponent } from './roles-home/roles-home.component';

export const routes: Routes = [
  {
    path: '',
    component: RolesHomeComponent,
    canActivate: [authGuard],
  },
  {
    path: 'executive',
    canActivate: [roleGuard(['Executive'])],
    loadComponent: () =>
      import('./executive/executive.component').then((m) => m.ExecutiveComponent),
    data: { title: 'Điều hành' }
  },
  {
    path: 'human-resources',
    canActivate: [roleGuard(['HumanResources', 'Executive'])],
    loadComponent: () =>
      import('./human-resources/human-resources.component').then((m) => m.HumanResourcesComponent),
    data: { title: 'Nhân sự' }
  },
  {
    path: 'finance',
    canActivate: [roleGuard(['Finance', 'Executive'])],
    loadComponent: () =>
      import('./finance/finance.component').then((m) => m.FinanceComponent),
    data: { title: 'Tài chính' }
  },
  {
    path: 'data-management',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./data-management/data-management.component').then((m) => m.DataManagementComponent),
    data: { title: 'Quản lý dữ liệu' }
  },
  {
    path: 'information-services',
    canActivate: [roleGuard(['Information-Services', 'Executive'])],
    loadComponent: () =>
      import('./information-services/information-services.component').then((m) => m.InformationServicesComponent),
    data: { title: 'Dịch vụ thông tin' }
  },
  {
    path: 'facilities',
    canActivate: [roleGuard(['Facilities-And-Maintenance', 'Executive'])],
    loadComponent: () =>
      import('./facilities/facilities.component').then((m) => m.FacilitiesComponent),
    data: { title: 'Cơ sở vật chất & Bảo trì' }
  },
  {
    path: 'production',
    canActivate: [roleGuard(['Production', 'Executive'])],
    loadComponent: () =>
      import('./production/production.component').then((m) => m.ProductionComponent),
    data: { title: 'Sản xuất' }
  },
  {
    path: 'production-control',
    canActivate: [roleGuard(['Production-Control', 'Executive'])],
    loadComponent: () =>
      import('./production-control/production-control.component').then((m) => m.ProductionControlComponent),
    data: { title: 'Điều phối sản xuất' }
  },
  {
    path: 'sales',
    canActivate: [roleGuard(['Sales', 'Executive'])],
    loadComponent: () =>
      import('./sales/sales.component').then((m) => m.SalesComponent),
    data: { title: 'Bán hàng' }
  },
  {
    path: 'alerts',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./alerts/alerts.component').then((m) => m.AlertsComponent),
    data: { title: 'Quản lý Cảnh báo' }
  },
  {
    path: 'marketing',
    canActivate: [roleGuard(['Marketing', 'Executive'])],
    loadComponent: () =>
      import('./marketing/marketing.component').then((m) => m.MarketingComponent),
    data: { title: 'Tiếp thị' }
  },
  {
    path: 'purchasing',
    canActivate: [roleGuard(['Purchasing', 'Executive'])],
    loadComponent: () =>
      import('./purchasing/purchasing.component').then((m) => m.PurchasingComponent),
    data: { title: 'Mua hàng' }
  },
  {
    path: 'quality-assurance',
    canActivate: [roleGuard(['Quality-Assurance', 'Executive'])],
    loadComponent: () =>
      import('./quality-assurance/quality-assurance.component').then((m) => m.QualityAssuranceComponent),
    data: { title: 'Đảm bảo chất lượng' }
  },
  {
    path: 'document-control',
    canActivate: [roleGuard(['Document-Control', 'Quality-Assurance', 'Executive'])],
    loadComponent: () =>
      import('./document-control/document-control.component').then((m) => m.DocumentControlComponent),
    data: { title: 'Kiểm soát tài liệu' }
  },
  {
    path: 'engineering',
    canActivate: [roleGuard(['Engineering', 'Executive'])],
    loadComponent: () =>
      import('./engineering/engineering.component').then((m) => m.EngineeringComponent),
    data: { title: 'Kỹ thuật' }
  },
  {
    path: 'tool-design',
    canActivate: [roleGuard(['Tool-Design', 'Engineering', 'Executive'])],
    loadComponent: () =>
      import('./tool-design/tool-design.component').then((m) => m.ToolDesignComponent),
    data: { title: 'Thiết kế công cụ' }
  },
  {
    path: 'shipping-receiving',
    canActivate: [roleGuard(['Shipping-and-Receiving', 'Executive'])],
    loadComponent: () =>
      import('./shipping-receiving/shipping-receiving.component').then((m) => m.ShippingReceivingComponent),
    data: { title: 'Shipping & Receiving' }
  },
  {
    path: 'ai-chart',
    canActivate: [roleGuard(['Sales', 'Executive'])],
    loadComponent: () =>
      import('./ai-chart/ai-chart.component').then((m) => m.AiChartComponent),
    data: { title: 'AI Chart' }
  }
];
