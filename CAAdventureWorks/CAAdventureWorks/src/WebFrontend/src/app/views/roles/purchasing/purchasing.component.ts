import { CommonModule, CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ChartData, ChartOptions } from 'chart.js';
import { getStyle } from '@coreui/utils';
import { ButtonDirective, CardBodyComponent, CardComponent, CardHeaderComponent, ColComponent, FormCheckComponent, FormCheckInputDirective, FormControlDirective, FormLabelDirective, FormSelectDirective, ProgressComponent, RowComponent, TemplateIdDirective, WidgetStatAComponent, WidgetStatBComponent } from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import { PurchasingDashboardResponseDto, PurchasingDashboardService } from './purchasing-dashboard.service';
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';
import { clearDashboardFilter, restoreDashboardFilter, saveDashboardFilter } from '../shared/filter-storage';
import { exportDashboardPdf } from '../shared/dashboard-pdf-export';

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

  private readonly savedFilterStorageKey = 'purchasing_saved_filter';
  readonly gridsterStorageKey = 'purchasing_grid_layout';
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
    this.restoreSavedFilter();
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
    clearDashboardFilter(this.savedFilterStorageKey);
    this.filterForm.reset({ startDate: '2013-01-01', endDate: '2014-12-31', vendorId: null, status: null, shipMethodId: null, productId: null, preferredVendorOnly: null, activeVendorOnly: true });
    this.loadDashboard();
  }

  async exportPDF(): Promise<void> {
    const currentDashboard = this.dashboard() as PurchasingDashboardResponseDto | null;
    if (!currentDashboard) {
      alert('Chưa có dữ liệu để tải báo cáo mua hàng.');
      return;
    }

    try {
      await exportDashboardPdf({
        title: this.title,
        subtitle: 'Báo cáo theo bộ lọc hiện tại',
        filePrefix: 'PurchasingDashboard',
        metrics: this.kpiCards(),
        secondaryMetrics: this.healthCards(),
        filters: this.describePurchasingFilters(currentDashboard),
        sections: [
          {
            title: '01. Xu hướng chi mua theo bộ lọc',
            subtitle: 'Tổng chi mua và số đơn theo từng kỳ trong phạm vi đang chọn.',
            headers: ['Kỳ', 'Năm', 'Tháng', 'Chi mua', 'Đơn mua'],
            rows: currentDashboard.spendTrend.slice(0, 12).map(item => [item.period, item.year, item.month, this.formatCurrency(item.totalSpend), item.orders]),
            widths: ['*', 45, 45, 85, 55]
          },
          {
            title: '02. Trạng thái đơn mua',
            subtitle: 'Phân bổ trạng thái đơn mua sau khi áp dụng bộ lọc.',
            headers: ['Mã trạng thái', 'Trạng thái', 'Số đơn', 'Tổng chi'],
            rows: currentDashboard.orderStatuses.map(item => [item.status, this.translatePurchaseStatus(item.statusLabel), item.orders, this.formatCurrency(item.totalSpend)]),
            widths: [65, '*', 55, 85]
          },
          {
            title: '03. Top nhà cung cấp',
            subtitle: 'Nhà cung cấp có tổng chi mua cao nhất trong dữ liệu đã lọc.',
            headers: ['Nhà cung cấp', 'Tổng chi', 'Đơn mua', 'TB/đơn'],
            rows: currentDashboard.topVendors.slice(0, 10).map(item => [item.vendorName, this.formatCurrency(item.totalSpend), item.orders, this.formatCurrency(item.averageOrderValue)]),
            widths: ['*', 85, 55, 85]
          },
          {
            title: '04. Top sản phẩm đặt mua',
            subtitle: 'Sản phẩm có chi mua cao theo bộ lọc hiện tại.',
            headers: ['Sản phẩm', 'SL đặt', 'Tổng tiền', 'Đơn giá TB'],
            rows: currentDashboard.topProducts.slice(0, 10).map(item => [item.productName, item.orderedQty, this.formatCurrency(item.lineTotal), this.formatCurrency(item.averageUnitPrice)]),
            widths: ['*', 60, 85, 85]
          },
          {
            title: '05. Tỷ lệ giao hàng nhà cung cấp',
            subtitle: 'Tỷ lệ nhận, reject và stocked rate theo nhà cung cấp.',
            headers: ['Nhà cung cấp', 'Nhận hàng', 'Từ chối', 'Stocked'],
            rows: currentDashboard.vendorDeliveryRates.slice(0, 10).map(item => [item.vendorName, this.formatPercent(item.receiveRate), this.formatPercent(item.rejectRate), this.formatPercent(item.stockedRate)]),
            widths: ['*', 65, 65, 65]
          },
          {
            title: '06. Lead time nhà cung cấp',
            subtitle: 'Thời gian chờ trung bình và số sản phẩm theo nhà cung cấp.',
            headers: ['Nhà cung cấp', 'Lead time TB', 'Số sản phẩm', 'Giá chuẩn TB'],
            rows: currentDashboard.vendorLeadTimes.slice(0, 10).map(item => [item.vendorName, `${item.averageLeadTimeDays} ngày`, item.productCount, this.formatCurrency(item.averageStandardPrice)]),
            widths: ['*', 75, 65, 85]
          },
          {
            title: '07. Nhà cung cấp theo vùng',
            subtitle: 'Phân bổ nhà cung cấp theo quốc gia và tỉnh/bang.',
            headers: ['Quốc gia', 'Tỉnh/Bang', 'Số NCC'],
            rows: currentDashboard.vendorsByRegion.slice(0, 12).map(item => [item.country, item.stateProvince, item.vendorCount]),
            widths: ['*', '*', 60]
          }
        ]
      });
    } catch (error) {
      console.error('Không thể tạo PDF dashboard mua hàng', error);
      alert('Không thể tạo file PDF. Vui lòng thử lại.');
    }
  }

  private describePurchasingFilters(dashboard: PurchasingDashboardResponseDto): string[] {
    const filters = dashboard.filters;
    const vendor = dashboard.filterOptions.vendors.find(item => item.id === filters.vendorId)?.name ?? 'Tất cả';
    const shipMethod = dashboard.filterOptions.shipMethods.find(item => item.id === filters.shipMethodId)?.name ?? 'Tất cả';
    const product = dashboard.filterOptions.products.find(item => item.id === filters.productId)?.name ?? 'Tất cả';

    return [
      `Thời gian: ${this.formatReportDate(filters.startDate)} - ${this.formatReportDate(filters.endDate)}`,
      `Nhà cung cấp: ${vendor}`,
      `Trạng thái: ${filters.status ?? 'Tất cả'}`,
      `Ship method: ${shipMethod}`,
      `Sản phẩm: ${product}`,
      `NCC ưu tiên: ${this.formatBooleanFilter(filters.preferredVendorOnly)}`,
      `NCC hoạt động: ${this.formatBooleanFilter(filters.activeVendorOnly)}`
    ];
  }

  private translatePurchaseStatus(status: string): string {
    const statusLabelMap: Record<string, string> = {
      Pending: 'Chờ duyệt',
      Approved: 'Đã duyệt',
      Rejected: 'Từ chối',
      Complete: 'Hoàn tất'
    };
    return statusLabelMap[status] ?? status;
  }

  private formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value ?? 0));
  }

  private formatPercent(value: number | null | undefined): string {
    const numericValue = Number(value ?? 0);
    return new Intl.NumberFormat('vi-VN', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(numericValue > 1 ? numericValue / 100 : numericValue);
  }

  private formatBooleanFilter(value: boolean | null | undefined): string {
    return value == null ? 'Tất cả' : value ? 'Có' : 'Không';
  }

  private formatReportDate(value: string | null | undefined): string {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  saveFilter(): void {
    saveDashboardFilter(this.savedFilterStorageKey, this.filterForm.getRawValue());
    this.loadDashboard();
  }
  private restoreSavedFilter(): void {
    this.filterForm.patchValue(restoreDashboardFilter(this.savedFilterStorageKey, { startDate: '2013-01-01', endDate: '2014-12-31', vendorId: null, status: null, shipMethodId: null, productId: null, preferredVendorOnly: null, activeVendorOnly: true }));
  }

}
