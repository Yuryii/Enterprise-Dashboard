import { INavData } from '@coreui/angular';

export interface NavRole extends INavData {
  roles?: string[];
}

export const navItems: INavData[] = [
  {
    title: true,
    name: 'Các Phòng Ban',
    iconComponent: { name: 'cil-people' },
  },
  {
    name: 'Ban Điều Hành',
    url: '/roles/executive',
    iconComponent: { name: 'cil-chart-line' },
    roles: ['Executive'],
  } as NavRole,
  {
    name: 'Nhân Sự',
    url: '/roles/human-resources',
    iconComponent: { name: 'cil-user-follow' },
    roles: ['HumanResources', 'Executive-General-And-Administration-Manager'],
  } as NavRole,
  {
    name: 'Tài Chính',
    url: '/roles/finance',
    iconComponent: { name: 'cil-dollar' },
    roles: ['Finance', 'Executive-General-And-Administration-Manager'],
  } as NavRole,
  {
    name: 'Dịch Vụ Thông Tin',
    url: '/roles/information-services',
    iconComponent: { name: 'cil-code' },
    roles: [
      'Information-Services',
      'Executive-General-And-Administration-Manager',
    ],
  } as NavRole,
  {
    name: 'Cơ Sở Vật Chất',
    url: '/roles/facilities',
    iconComponent: { name: 'cil-building' },
    roles: [
      'Facilities-And-Maintenance',
      'Executive-General-And-Administration-Manager',
    ],
  } as NavRole,
  {
    name: 'Sản Xuất',
    url: '/roles/production',
    iconComponent: { name: 'cil-industry' },
    roles: ['Production', 'Manufacturing'],
  } as NavRole,
  {
    name: 'Kiểm Soát Sản Xuất',
    url: '/roles/production-control',
    iconComponent: { name: 'cil-settings' },
    roles: ['Production-Control', 'Manufacturing'],
  } as NavRole,
  {
    name: 'Kinh Doanh',
    url: '/roles/sales',
    iconComponent: { name: 'cil-cart' },
    roles: ['Sales', 'Sales-and-Marketing'],
  } as NavRole,
  {
    name: 'Marketing',
    url: '/roles/marketing',
    iconComponent: { name: 'cil-bullhorn' },
    roles: ['Marketing', 'Sales-and-Marketing'],
  } as NavRole,
  {
    name: 'Mua Hàng',
    url: '/roles/purchasing',
    iconComponent: { name: 'cil-package' },
    roles: ['Purchasing'],
  } as NavRole,
  {
    name: 'Kiểm Tra Chất Lượng',
    url: '/roles/quality-assurance',
    iconComponent: { name: 'cil-check-circle' },
    roles: ['Quality-Assurance', 'Quality-Assurance-Manager'],
  } as NavRole,
  {
    name: 'Kiểm Soát Tài Liệu',
    url: '/roles/document-control',
    iconComponent: { name: 'cil-description' },
    roles: ['Document-Control', 'Quality-Assurance-Manager'],
  } as NavRole,
  {
    name: 'Kỹ Thuật',
    url: '/roles/engineering',
    iconComponent: { name: 'cil-contact' },
    roles: ['Engineering', 'Research-and-Development'],
  } as NavRole,
  {
    name: 'Thiết Kế Dụng Cụ',
    url: '/roles/tool-design',
    iconComponent: { name: 'cil-construction' },
    roles: ['Tool-Design', 'Research-and-Development'],
  } as NavRole,
  {
    name: 'Vận Chuyển & Nhận Hàng',
    url: '/roles/shipping-receiving',
    iconComponent: { name: 'cil-truck' },
    roles: ['Shipping-and-Receiving'],
  } as NavRole,
];
