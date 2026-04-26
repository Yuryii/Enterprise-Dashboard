import { CommonModule, CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ChartData, ChartOptions } from 'chart.js';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  FormCheckComponent,
  FormCheckInputDirective,
  FormControlDirective,
  FormLabelDirective,
  FormSelectDirective,
  ProgressComponent,
  RowComponent,
  TemplateIdDirective,
  WidgetStatAComponent
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import {
  ExecutiveDashboardResponseDto,
  ExecutiveDashboardService,
  ExecutiveOrderStatusItemDto
} from './executive-dashboard.service';
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';

export interface ChartDef {
  id: string;
  label: string;
}

@Component({
  selector: 'app-executive',
  standalone: true,
  templateUrl: './executive.component.html',
  styleUrls: ['./executive.component.scss'],
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
export class ExecutiveComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly executiveDashboardService = inject(ExecutiveDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly widgetPiePalette = ['#2563EB', '#14B8A6', '#F97316', '#8B5CF6', '#EC4899', '#F59E0B'];

  private readonly executiveChartPalette = {
    revenue: '#2563EB',
    spend: '#F97316',
    gap: '#14B8A6',
    territory: '#0F766E',
    salesPeople: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#1D4ED8', '#14B8A6', '#0EA5E9', '#8B5CF6'],
    department: '#8B5CF6',
    vendors: '#F59E0B',
    vendorRate: '#0EA5E9',
    completion: '#14B8A6',
    scrap: '#EF4444',
    statusSales: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#1D4ED8', '#14B8A6'],
    statusPurchase: ['#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#EA580C', '#C2410C']
  };

  readonly title = 'Executive';
  readonly subtitle = 'Tổng hợp doanh thu, chi phí, nhân sự và sản xuất cho ban điều hành';

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<ExecutiveDashboardResponseDto | null>(null);

  readonly gridsterStorageKey = 'executive_grid_layout';
  readonly hiddenChartsStorageKey = 'executive_hidden_charts';

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
    itemChangeCallback: () => this.saveLayoutToStorage()
  });

  readonly gridsterItems = signal<GridsterItemConfig[]>(
    this.loadLayoutFromStorage() ?? this.getDefaultLayout()
  );

  readonly availableCharts: ChartDef[] = [
    { id: 'revenue-vs-spend', label: 'Doanh thu vs Chi mua' },
    { id: 'territory-sales', label: 'Doanh số theo vùng' },
    { id: 'sales-people', label: 'Top nhân viên kinh doanh' },
    { id: 'department-headcount', label: 'Nhân sự theo phòng ban' },
    { id: 'group-distribution', label: 'Cơ cấu nhân sự theo nhóm' },
    { id: 'vendor-spend', label: 'Top nhà cung cấp' },
    { id: 'vendor-receiving-rate', label: 'Tỷ lệ nhận hàng NCC' },
    { id: 'production-completion', label: 'Hiệu suất sản xuất' },
    { id: 'sales-status', label: 'Trạng thái đơn bán' },
    { id: 'purchase-status', label: 'Trạng thái đơn mua' }
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
      { id: 'revenue-vs-spend', cols: 8, rows: 6, x: 0, y: 0 },
      { id: 'department-headcount', cols: 4, rows: 6, x: 8, y: 0 },
      { id: 'territory-sales', cols: 6, rows: 5, x: 0, y: 6 },
      { id: 'sales-people', cols: 6, rows: 5, x: 6, y: 6 },
      { id: 'group-distribution', cols: 6, rows: 5, x: 0, y: 11 },
      { id: 'vendor-spend', cols: 6, rows: 5, x: 6, y: 11 },
      { id: 'vendor-receiving-rate', cols: 6, rows: 5, x: 0, y: 16 },
      { id: 'production-completion', cols: 6, rows: 5, x: 6, y: 16 },
      { id: 'sales-status', cols: 6, rows: 5, x: 0, y: 21 },
      { id: 'purchase-status', cols: 6, rows: 5, x: 6, y: 21 }
    ];
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

  readonly filterForm = this.fb.group({
    startDate: ['2013-01-01'],
    endDate: ['2014-12-31'],
    territoryId: [null as number | null],
    salesPersonId: [null as number | null],
    vendorId: [null as number | null],
    departmentId: [null as number | null],
    productCategoryId: [null as number | null],
    currentEmployeesOnly: [true as boolean | null]
  });

  readonly kpiCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Tổng doanh thu', value: overview.totalRevenue, format: 'currency', note: 'Từ đơn bán hàng' },
      { label: 'Tổng chi mua', value: overview.totalSpend, format: 'currency', note: 'Từ đơn mua hàng' },
      { label: 'Biên vận hành', value: overview.operatingGap, format: 'currency', note: 'Doanh thu - Chi mua' },
      { label: 'Nhân sự hoạt động', value: overview.activeEmployees, format: 'number', note: 'Theo bộ lọc hiện tại' }
    ];
  });

  readonly healthCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Đơn bán', value: overview.salesOrders, type: 'number' },
      { label: 'Đơn mua', value: overview.purchaseOrders, type: 'number' },
      { label: 'Tỷ lệ hoàn thành SX', value: Number(overview.productionCompletionRate ?? 0), type: 'percent' },
      { label: 'Tỷ lệ phế phẩm', value: Number(overview.productionScrapRate ?? 0), type: 'percent' }
    ];
  });

  readonly revenueVsSpendChartData = computed<ChartData<'bar' | 'line'>>(() => {
    const trend = this.dashboard()?.revenueVsSpendTrend ?? [];
    return {
      labels: trend.map((item) => item.period),
      datasets: [
        {
          type: 'bar',
          label: 'Doanh thu',
          data: trend.map((item) => item.revenue),
          backgroundColor: 'rgba(37, 99, 235, 0.72)',
          borderRadius: 6,
          maxBarThickness: 28,
          order: 2
        },
        {
          type: 'bar',
          label: 'Chi mua',
          data: trend.map((item) => item.spend),
          backgroundColor: 'rgba(249, 115, 22, 0.68)',
          borderRadius: 6,
          maxBarThickness: 28,
          order: 2
        },
        {
          type: 'line',
          label: 'Biên vận hành',
          data: trend.map((item) => item.operatingGap),
          borderColor: this.executiveChartPalette.gap,
          backgroundColor: 'rgba(20, 184, 166, 0.12)',
          borderWidth: 3,
          fill: false,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y1',
          order: 1
        }
      ]
    };
  });

  readonly revenueVsSpendOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' } },
      y1: {
        beginAtZero: true,
        position: 'right',
        grid: { drawOnChartArea: false }
      }
    }
  };

  readonly territoryChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.revenueByTerritory ?? [];
    return {
      labels: items.slice(0, 8).map((item) => item.territoryName),
      datasets: [{
        label: 'Doanh thu',
        data: items.slice(0, 8).map((item) => item.revenue),
        backgroundColor: this.executiveChartPalette.territory,
        borderRadius: 6,
        barThickness: 16
      }]
    };
  });

  readonly territoryOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, grid: { color: '#eeeeee' } }, y: { grid: { display: false } } }
  };

  readonly salesPeopleChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.topSalesPeople ?? [];
    return {
      labels: items.slice(0, 8).map((item) => item.salesPersonName),
      datasets: [{
        label: 'Doanh thu',
        data: items.slice(0, 8).map((item) => item.revenue),
        backgroundColor: items
          .slice(0, 8)
          .map((_, index) => this.executiveChartPalette.salesPeople[index % this.executiveChartPalette.salesPeople.length]),
        borderRadius: 6
      }]
    };
  });

  readonly salesPeopleOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eeeeee' } } }
  };

  readonly departmentChartData = computed<ChartData<'pie'>>(() => {
    const items = this.dashboard()?.headcountByDepartment ?? [];
    return {
      labels: items.slice(0, 6).map((item) => this.translateDepartmentName(item.departmentName)),
      datasets: [{
        data: items.slice(0, 6).map((item) => item.headcount),
        backgroundColor: items
          .slice(0, 6)
          .map((_, index) => this.widgetPiePalette[index % this.widgetPiePalette.length]),
        borderWidth: 0,
        hoverOffset: 6
      }]
    };
  });

  readonly groupChartData = computed<ChartData<'doughnut'>>(() => {
    const items = this.dashboard()?.headcountByGroup ?? [];
    return {
      labels: items.slice(0, 6).map((item) => this.translateGroupName(item.groupName)),
      datasets: [{
        data: items.slice(0, 6).map((item) => item.headcount),
        backgroundColor: items
          .slice(0, 6)
          .map((_, index) => this.widgetPiePalette[index % this.widgetPiePalette.length]),
        borderWidth: 0,
        hoverOffset: 6
      }]
    };
  });

  readonly departmentChartOptions: ChartOptions<'pie'> = {
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

  readonly vendorChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.topVendors ?? [];
    return {
      labels: items.slice(0, 8).map((item) => item.vendorName),
      datasets: [{
        label: 'Chi mua',
        data: items.slice(0, 8).map((item) => item.totalSpend),
        backgroundColor: this.executiveChartPalette.vendors,
        borderRadius: 6,
        barThickness: 14
      }]
    };
  });

  readonly vendorOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, grid: { color: '#eeeeee' } }, y: { grid: { display: false } } }
  };

  readonly vendorReceivingRateChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.vendorReceivingRates ?? [];
    return {
      labels: items.slice(0, 8).map((item) => item.vendorName),
      datasets: [{
        label: 'Tỷ lệ nhận hàng',
        data: items.slice(0, 8).map((item) => Number(item.receivingRate ?? 0) * 100),
        backgroundColor: this.executiveChartPalette.vendorRate,
        borderRadius: 6,
        barThickness: 14
      }]
    };
  });

  readonly vendorReceivingRateOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, max: 100, ticks: { callback: (value) => `${value}%` }, grid: { color: '#eeeeee' } },
      y: { grid: { display: false } }
    }
  };

  readonly productionChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.productionByCategory ?? [];
    return {
      labels: items.slice(0, 8).map((item) => item.productCategoryName),
      datasets: [
        {
          label: 'Hoàn thành %',
          data: items.slice(0, 8).map((item) => Number(item.completionRate ?? 0) * 100),
          backgroundColor: this.executiveChartPalette.completion,
          borderRadius: 6
        },
        {
          label: 'Phế phẩm %',
          data: items.slice(0, 8).map((item) => Number(item.scrapRate ?? 0) * 100),
          backgroundColor: this.executiveChartPalette.scrap,
          borderRadius: 6
        }
      ]
    };
  });

  readonly productionOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, max: 100, ticks: { callback: (value) => `${value}%` }, grid: { color: '#eeeeee' } }
    }
  };

  readonly salesStatusChartData = computed<ChartData<'doughnut'>>(() => this.buildStatusChartData(
    this.dashboard()?.salesOrderStatuses ?? [],
    this.executiveChartPalette.statusSales
  ));

  readonly purchaseStatusChartData = computed<ChartData<'doughnut'>>(() => this.buildStatusChartData(
    this.dashboard()?.purchaseOrderStatuses ?? [],
    this.executiveChartPalette.statusPurchase
  ));

  readonly orderStatusOptions: ChartOptions<'doughnut'> = {
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
          font: { size: 12, weight: 500 }
        }
      }
    }
  };

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.executiveDashboardService.getDashboard(this.filterForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.dashboard.set(response);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Không thể tải dữ liệu Executive Dashboard.');
          this.loading.set(false);
        }
      });
  }

  resetFilters(): void {
    this.filterForm.reset({
      startDate: '2013-01-01',
      endDate: '2014-12-31',
      territoryId: null,
      salesPersonId: null,
      vendorId: null,
      departmentId: null,
      productCategoryId: null,
      currentEmployeesOnly: true
    });

    this.loadDashboard();
  }

  progressWidth(item: { type: string; value: number }): number {
    if (item.type === 'percent') {
      return Math.max(0, Math.min(100, Number(item.value ?? 0) * 100));
    }

    return Math.max(8, Math.min(100, Number(item.value ?? 0)));
  }

  private buildStatusChartData(items: ExecutiveOrderStatusItemDto[], palette: string[]): ChartData<'doughnut'> {
    return {
      labels: items.map((item) => this.translateStatusLabel(item.statusLabel)),
      datasets: [{
        data: items.map((item) => item.orders),
        backgroundColor: items.map((_, index) => palette[index % palette.length]),
        borderWidth: 0,
        hoverOffset: 6
      }]
    };
  }

  private translateStatusLabel(label: string): string {
    const translations: Record<string, string> = {
      'In process': 'Đang xử lý',
      Approved: 'Đã duyệt',
      Backordered: 'Chờ cung ứng',
      Rejected: 'Bị từ chối',
      Shipped: 'Đã giao',
      Cancelled: 'Đã hủy',
      Pending: 'Chờ duyệt',
      Complete: 'Hoàn tất'
    };

    return translations[label] ?? label;
  }

  private translateDepartmentName(name: string): string {
    const translations: Record<string, string> = {
      Engineering: 'Kỹ thuật',
      'Tool Design': 'Thiết kế công cụ',
      Sales: 'Kinh doanh',
      Marketing: 'Tiếp thị',
      Purchasing: 'Mua hàng',
      'Research and Development': 'Nghiên cứu và phát triển',
      Production: 'Sản xuất',
      'Production Control': 'Điều phối sản xuất',
      'Human Resources': 'Nhân sự',
      Finance: 'Tài chính',
      'Information Services': 'Dịch vụ công nghệ thông tin',
      'Document Control': 'Kiểm soát tài liệu',
      'Quality Assurance': 'Đảm bảo chất lượng',
      'Facilities and Maintenance': 'Cơ sở vật chất và bảo trì',
      'Shipping and Receiving': 'Vận chuyển và tiếp nhận',
      Executive: 'Điều hành'
    };

    return translations[name] ?? name;
  }

  private translateGroupName(name: string): string {
    const translations: Record<string, string> = {
      'Inventory Management': 'Quản lý tồn kho',
      Manufacturing: 'Sản xuất',
      'Quality Assurance': 'Đảm bảo chất lượng',
      'Research and Development': 'Nghiên cứu và phát triển',
      'Sales and Marketing': 'Kinh doanh và tiếp thị',
      'Executive General and Administration': 'Điều hành, hành chính và quản trị'
    };

    return translations[name] ?? name;
  }

  exportPDF(): void { alert('Chức năng xuất PDF đang được phát triển'); }
  customizeLayout(): void { this.toggleEditMode(); }
  saveFilter(): void { alert('Chức năng lưu bộ lọc đang được phát triển'); }

  getItem(id: string): GridsterItemConfig | undefined {
    return this.gridsterItems().find(item => item['id'] === id);
  }

  isChartVisible(chartId: string): boolean {
    return !this.hiddenChartIds().has(chartId);
  }
}
