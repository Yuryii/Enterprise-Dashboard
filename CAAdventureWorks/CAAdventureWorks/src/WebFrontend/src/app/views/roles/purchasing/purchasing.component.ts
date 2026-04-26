import { CommonModule, CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ChartData, ChartOptions } from 'chart.js';
import { getStyle } from '@coreui/utils';
import { ButtonDirective, CardBodyComponent, CardComponent, CardHeaderComponent, ColComponent, FormCheckComponent, FormCheckInputDirective, FormControlDirective, FormLabelDirective, FormSelectDirective, ProgressComponent, RowComponent, TemplateIdDirective, WidgetStatAComponent, WidgetStatBComponent } from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import { PurchasingDashboardService } from './purchasing-dashboard.service';
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';

export interface ChartDef {
  id: string;
  label: string;
}

@Component({
  selector: 'app-purchasing',
  standalone: true,
  templateUrl: './purchasing.component.html',
  styleUrls: ['./purchasing.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GridsterComponent,
    GridsterItemComponent,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FormLabelDirective,
    FormControlDirective,
    FormSelectDirective,
    FormCheckComponent,
    FormCheckInputDirective,
    ButtonDirective,
    ChartjsComponent,
    IconDirective,
    TemplateIdDirective,
    WidgetStatAComponent,
    CurrencyPipe,
    DecimalPipe,
    PercentPipe
  ]
})
export class PurchasingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly purchasingDashboardService = inject(PurchasingDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly widgetPiePalette = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56'
  ];

  private readonly purchasingChartPalette = {
    trendLine: '#2563EB',
    trendFill: 'rgba(37, 99, 235, 0.12)',
    topVendor: '#0F766E',
    topProducts: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA'],
    receiveRate: '#2563EB',
    rejectRate: '#F97316',
    leadTime: '#14B8A6',
    region: '#F59E0B'
  };

  readonly title = 'Mua hàng';
  readonly subtitle = 'Hiệu suất nhà cung cấp, đơn mua và vận hành nhập hàng';

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<any>(null);

  private readonly gridsterStorageKey = 'purchasing_grid_layout';
  private readonly hiddenChartsStorageKey = 'purchasing_hidden_charts';

  readonly isEditMode = signal(false);
  readonly showChartPicker = signal(false);

  readonly gridsterOptions = signal<GridsterConfig>({
    draggable: { enabled: false },
    resizable: { enabled: false },
    pushItems: true,
    minCols: 12,
    maxCols: 12,
    minRows: 20,
    fixedRowHeight: 80,
    keepFixedHeightInMobile: false,
    keepFixedWidthInMobile: false,
    mobileBreakpoint: 640,
    itemChangeCallback: (_item, _itemComponent) => this.saveLayoutToStorage()
  });

  readonly gridsterItems = signal<GridsterItemConfig[]>(
    this.loadLayoutFromStorage() ?? this.getDefaultLayout()
  );

  readonly availableCharts: ChartDef[] = [
    { id: 'spend-trend', label: 'Xu hướng chi mua' },
    { id: 'order-status', label: 'Trạng thái đơn mua' },
    { id: 'top-vendors', label: 'Top nhà cung cấp' },
    { id: 'top-products', label: 'Top sản phẩm' },
    { id: 'vendor-delivery-rate', label: 'Tỷ lệ giao hàng' },
    { id: 'lead-time', label: 'Lead time' },
    { id: 'vendors-by-region', label: 'Nhà cung cấp theo vùng' }
  ];

  readonly hiddenChartIds = signal<Set<string>>(this.loadHiddenChartsFromStorage());

  isChartChecked(chartId: string): boolean {
    return !this.hiddenChartIds().has(chartId);
  }

  toggleChartVisibility(chartId: string): void {
    const hidden = new Set(this.hiddenChartIds());
    if (hidden.has(chartId)) {
      hidden.delete(chartId);
    } else {
      hidden.add(chartId);
    }
    this.hiddenChartIds.set(hidden);
  }

  removeChartFromGrid(chartId: string): void {
    this.toggleChartVisibility(chartId);
  }

  addChartToGrid(chartId: string): void {
    this.toggleChartVisibility(chartId);
  }

  toggleChartPicker(event?: Event): void {
    event?.stopPropagation();
    this.showChartPicker.update(v => !v);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showChartPicker.set(false);
  }

  onPickerClick(event: Event): void {
    event.stopPropagation();
  }

  private getDefaultLayout(): GridsterItemConfig[] {
    return [
      { id: 'spend-trend', cols: 8, rows: 6, x: 0, y: 0 },
      { id: 'order-status', cols: 4, rows: 6, x: 8, y: 0 },
      { id: 'top-vendors', cols: 6, rows: 5, x: 0, y: 6 },
      { id: 'top-products', cols: 6, rows: 5, x: 6, y: 6 },
      { id: 'vendor-delivery-rate', cols: 7, rows: 5, x: 0, y: 11 },
      { id: 'lead-time', cols: 5, rows: 5, x: 7, y: 11 },
      { id: 'vendors-by-region', cols: 12, rows: 4, x: 0, y: 16 }
    ];
  }

  getItem(id: string): GridsterItemConfig | undefined {
    return this.gridsterItems().find(item => item['id'] === id);
  }

  isChartVisible(chartId: string): boolean {
    return !this.hiddenChartIds().has(chartId);
  }

  private saveLayoutToStorage(): void {
    const layout = this.gridsterItems().map(item => ({
      id: item['id'],
      cols: item.cols,
      rows: item.rows,
      x: item.x,
      y: item.y
    }));
    localStorage.setItem(this.gridsterStorageKey, JSON.stringify(layout));
  }

  private loadLayoutFromStorage(): GridsterItemConfig[] | null {
    const raw = localStorage.getItem(this.gridsterStorageKey);
    if (!raw) return null;
    try {
      const layout = JSON.parse(raw) as Array<{ id: string; cols: number; rows: number; x: number; y: number }>;
      const defaults = this.getDefaultLayout();
      return defaults.map(item => {
        const saved = layout.find(l => l.id === item['id']);
        return saved ? { ...item, ...saved } : item;
      });
    } catch {
      return null;
    }
  }

  private loadHiddenChartsFromStorage(): Set<string> {
    const raw = localStorage.getItem(this.hiddenChartsStorageKey);
    if (!raw) return new Set();
    try {
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch {
      return new Set();
    }
  }

  private saveHiddenChartsToStorage(): void {
    const arr = Array.from(this.hiddenChartIds());
    localStorage.setItem(this.hiddenChartsStorageKey, JSON.stringify(arr));
  }

  toggleEditMode(): void {
    const newMode = !this.isEditMode();
    this.isEditMode.set(newMode);
    const config = this.gridsterOptions();
    config.draggable!.enabled = newMode;
    config.resizable!.enabled = newMode;
    this.gridsterOptions.set({ ...config });
    if (!newMode) {
      this.saveHiddenChartsToStorage();
    }
  }

  resetLayout(): void {
    localStorage.removeItem(this.gridsterStorageKey);
    localStorage.removeItem(this.hiddenChartsStorageKey);
    this.gridsterItems.set(this.getDefaultLayout());
    this.hiddenChartIds.set(new Set());
  }

  customizeLayout(): void {
    this.toggleEditMode();
  }

  readonly filterForm = this.fb.group({
    startDate: ['2013-01-01'],
    endDate: ['2014-12-31'],
    vendorId: [null as number | null],
    status: [null as number | null],
    shipMethodId: [null as number | null],
    productId: [null as number | null],
    preferredVendorOnly: [null as boolean | null],
    activeVendorOnly: [true as boolean | null]
  });

  readonly kpiCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Tổng chi mua', value: overview.totalSpend, format: 'currency', accent: 'primary', icon: 'cilDollar' },
      { label: 'Đơn mua', value: overview.totalOrders, format: 'number', accent: 'success', icon: 'cilCart' },
      { label: 'SL đặt mua', value: overview.totalOrderedQty, format: 'number', accent: 'info', icon: 'cilBox' },
      { label: 'Giá trị TB/đơn', value: overview.averageOrderValue, format: 'currency', accent: 'warning', icon: 'cilChartLine' }
    ];
  });

  readonly spendTrendChartData = computed<ChartData<'line'>>(() => {
    const trend = this.dashboard()?.spendTrend ?? [];
    return {
      labels: trend.map((item: any) => item.period),
      datasets: [{
        label: 'Chi tiêu',
        data: trend.map((item: any) => item.totalSpend),
        borderColor: this.purchasingChartPalette.trendLine,
        backgroundColor: this.purchasingChartPalette.trendFill,
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  });

  readonly spendTrendOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' } }
    }
  };

  readonly statusChartData = computed<ChartData<'pie'>>(() => {
    const statuses = this.dashboard()?.orderStatuses ?? [];
    const statusLabelMap: Record<string, string> = {
      Pending: 'Chờ duyệt',
      Approved: 'Đã duyệt',
      Rejected: 'Từ chối',
      Complete: 'Hoàn tất'
    };
    return {
      labels: statuses.map((item: any) => statusLabelMap[item.statusLabel] ?? item.statusLabel),
      datasets: [{
        data: statuses.map((item: any) => item.orders),
        backgroundColor: statuses.map((_: any, index: number) => this.widgetPiePalette[index % this.widgetPiePalette.length]),
        borderWidth: 0,
        hoverOffset: 6
      }]
    };
  });

  readonly statusChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          color: '#374151',
          padding: 16,
          font: { size: 13, weight: 500 }
        }
      }
    }
  };

  readonly topVendorChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.topVendors ?? [];
    return {
      labels: items.slice(0, 8).map((item: any) => item.vendorName),
      datasets: [{
        data: items.slice(0, 8).map((item: any) => item.totalSpend),
        backgroundColor: this.purchasingChartPalette.topVendor,
        borderRadius: 6,
        barThickness: 14
      }]
    };
  });

  readonly topVendorOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, grid: { color: '#eeeeee' } }, y: { grid: { display: false } } }
  };

  readonly topProductChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.topProducts ?? [];
    return {
      labels: items.slice(0, 8).map((item: any) => item.productName),
      datasets: [{
        data: items.slice(0, 8).map((item: any) => item.lineTotal),
        backgroundColor: items
          .slice(0, 8)
          .map((_: any, index: number) => this.purchasingChartPalette.topProducts[index % this.purchasingChartPalette.topProducts.length]),
        borderRadius: 6
      }]
    };
  });

  readonly topProductOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eeeeee' } } }
  };

  readonly vendorRateChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.vendorDeliveryRates ?? [];
    return {
      labels: items.slice(0, 6).map((item: any) => item.vendorName),
      datasets: [
        { label: 'Tỷ lệ nhận hàng', data: items.slice(0, 6).map((item: any) => (item.receiveRate ?? 0) * 100), backgroundColor: this.purchasingChartPalette.receiveRate, borderRadius: 6 },
        { label: 'Tỷ lệ từ chối', data: items.slice(0, 6).map((item: any) => (item.rejectRate ?? 0) * 100), backgroundColor: this.purchasingChartPalette.rejectRate, borderRadius: 6 }
      ]
    };
  });

  readonly vendorRateOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { x: { stacked: false, grid: { display: false } }, y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } } }
  };

  readonly leadTimeChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.vendorLeadTimes ?? [];
    return {
      labels: items.slice(0, 8).map((item: any) => item.vendorName),
      datasets: [{
        label: 'Thời gian chờ (ngày)',
        data: items.slice(0, 8).map((item: any) => item.averageLeadTimeDays),
        backgroundColor: this.purchasingChartPalette.leadTime,
        borderRadius: 6
      }]
    };
  });

  readonly leadTimeOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eeeeee' } } }
  };

  readonly regionChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.vendorsByRegion ?? [];
    return {
      labels: items.slice(0, 8).map((item: any) => `${item.country} / ${item.stateProvince}`),
      datasets: [{
        label: 'Số lượng nhà cung cấp',
        data: items.slice(0, 8).map((item: any) => item.vendorCount),
        backgroundColor: this.purchasingChartPalette.region,
        borderRadius: 6
      }]
    };
  });

  readonly regionOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, grid: { color: '#eeeeee' } }, y: { grid: { display: false } } }
  };

  readonly healthCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Tỷ lệ nhận hàng', value: overview.receiveRate },
      { label: 'Tỷ lệ từ chối', value: overview.rejectRate },
      { label: 'NCC hoạt động', value: overview.activeVendors, type: 'number' },
      { label: 'NCC ưu tiên', value: overview.preferredVendors, type: 'number' }
    ];
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.purchasingDashboardService.getDashboard(this.filterForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.dashboard.set(response);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Không thể tải dữ liệu Purchasing Dashboard.');
          this.loading.set(false);
        }
      });
  }

  resetFilters(): void {
    this.filterForm.reset({
      startDate: '2013-01-01',
      endDate: '2014-12-31',
      vendorId: null,
      status: null,
      shipMethodId: null,
      productId: null,
      preferredVendorOnly: null,
      activeVendorOnly: true
    });
    this.loadDashboard();
  }

  exportPDF(): void { alert('Chức năng xuất PDF đang được phát triển'); }
  saveFilter(): void { alert('Chức năng lưu bộ lọc đang được phát triển'); }
}
