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
    data: { title: 'Executive Dashboard' }
  },
  {
    path: 'human-resources',
    canActivate: [roleGuard(['HumanResources', 'Executive'])],
    loadComponent: () =>
      import('./human-resources/human-resources.component').then((m) => m.HumanResourcesComponent),
    data: { title: 'Human Resources' }
  },
  {
    path: 'finance',
    canActivate: [roleGuard(['Finance', 'Executive'])],
    loadComponent: () =>
      import('./finance/finance.component').then((m) => m.FinanceComponent),
    data: { title: 'Finance' }
  },
  {
    path: 'information-services',
    canActivate: [roleGuard(['Information-Services', 'Executive'])],
    loadComponent: () =>
      import('./information-services/information-services.component').then((m) => m.InformationServicesComponent),
    data: { title: 'Information Services' }
  },
  {
    path: 'facilities',
    canActivate: [roleGuard(['Facilities-And-Maintenance', 'Executive'])],
    loadComponent: () =>
      import('./facilities/facilities.component').then((m) => m.FacilitiesComponent),
    data: { title: 'Facilities & Maintenance' }
  },
  {
    path: 'production',
    canActivate: [roleGuard(['Production', 'Executive'])],
    loadComponent: () =>
      import('./production/production.component').then((m) => m.ProductionComponent),
    data: { title: 'Production' }
  },
  {
    path: 'production-control',
    canActivate: [roleGuard(['Production-Control', 'Executive'])],
    loadComponent: () =>
      import('./production-control/production-control.component').then((m) => m.ProductionControlComponent),
    data: { title: 'Production Control' }
  },
  {
    path: 'sales',
    canActivate: [roleGuard(['Sales', 'Executive'])],
    loadComponent: () =>
      import('./sales/sales.component').then((m) => m.SalesComponent),
    data: { title: 'Sales' }
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
    data: { title: 'Marketing' }
  },
  {
    path: 'purchasing',
    canActivate: [roleGuard(['Purchasing', 'Executive'])],
    loadComponent: () =>
      import('./purchasing/purchasing.component').then((m) => m.PurchasingComponent),
    data: { title: 'Purchasing' }
  },
  {
    path: 'quality-assurance',
    canActivate: [roleGuard(['Quality-Assurance', 'Executive'])],
    loadComponent: () =>
      import('./quality-assurance/quality-assurance.component').then((m) => m.QualityAssuranceComponent),
    data: { title: 'Quality Assurance' }
  },
  {
    path: 'document-control',
    canActivate: [roleGuard(['Document-Control', 'Quality-Assurance', 'Executive'])],
    loadComponent: () =>
      import('./document-control/document-control.component').then((m) => m.DocumentControlComponent),
    data: { title: 'Document Control' }
  },
  {
    path: 'engineering',
    canActivate: [roleGuard(['Engineering', 'Executive'])],
    loadComponent: () =>
      import('./engineering/engineering.component').then((m) => m.EngineeringComponent),
    data: { title: 'Engineering' }
  },
  {
    path: 'tool-design',
    canActivate: [roleGuard(['Tool-Design', 'Engineering', 'Executive'])],
    loadComponent: () =>
      import('./tool-design/tool-design.component').then((m) => m.ToolDesignComponent),
    data: { title: 'Tool Design' }
  },
  {
    path: 'shipping-receiving',
    canActivate: [roleGuard(['Shipping-and-Receiving', 'Executive'])],
    loadComponent: () =>
      import('./shipping-receiving/shipping-receiving.component').then((m) => m.ShippingReceivingComponent),
    data: { title: 'Shipping & Receiving' }
  }
];
