import { Component, OnInit, signal } from '@angular/core';

import {
  BreadcrumbComponent,
  BreadcrumbItemComponent,
  BreadcrumbRouterComponent,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  RowComponent
} from '@coreui/angular';
import { DocsComponentsComponent, DocsExampleComponent } from '@docs-components/public-api';

@Component({
  templateUrl: './breadcrumbs.component.html',
  imports: [RowComponent, ColComponent, CardComponent, CardHeaderComponent, CardBodyComponent, DocsExampleComponent, BreadcrumbComponent, BreadcrumbItemComponent, BreadcrumbRouterComponent, DocsComponentsComponent]
})
export class BreadcrumbsComponent implements OnInit {
  public breadcrumbItems = signal<any>([]);

  constructor() { }

  ngOnInit(): void {
    this.breadcrumbItems.set([
      { label: 'Trang chủ', url: '/', attributes: { title: 'Trang chủ' } },
      { label: 'Thư viện', url: '/' },
      { label: 'Dữ liệu', url: '/dashboard/' },
      { label: 'CoreUI', url: '/' }
    ]);

    setTimeout(() => {
      this.breadcrumbItems.set([
        { label: 'CoreUI', url: '/' },
        { label: 'Dữ liệu', url: '/dashboard/' },
        { label: 'Thư viện', url: '/' },
        { label: 'Trang chủ', url: '/', attributes: { title: 'Trang chủ' } }
      ]);
    }, 5000);
  }
}
