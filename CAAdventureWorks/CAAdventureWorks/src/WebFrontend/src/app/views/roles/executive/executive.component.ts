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
import { clearDashboardFilter, restoreDashboardFilter, saveDashboardFilter } from '../shared/filter-storage';

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

  readonly savedFilterStorageKey = 'executive_saved_filter';
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

  getItem(id: string): GridsterItemConfig | undefined {
    return this.gridsterItems().find(item => item['id'] === id);
  }

  isChartVisible(chartId: string): boolean {
    return !this.hiddenChartIds().has(chartId);
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
    this.restoreSavedFilter();
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
    clearDashboardFilter(this.savedFilterStorageKey);
    this.filterForm.reset({ startDate: '2013-01-01', endDate: '2014-12-31', territoryId: null, salesPersonId: null, vendorId: null, departmentId: null, productCategoryId: null, currentEmployeesOnly: true });
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

  async exportPDF(): Promise<void> {
    const currentDashboard = this.dashboard();
    if (!currentDashboard) {
      alert('Chưa có dữ liệu để tải báo cáo ban điều hành.');
      return;
    }

    const generatedAt = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date());

    try {
      const [pdfMakeModule, pdfFontsModule] = await Promise.all([
        import('pdfmake/build/pdfmake' as string),
        import('pdfmake/build/vfs_fonts' as string)
      ]);
      const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule;
      const pdfFonts = (pdfFontsModule as any).default ?? pdfFontsModule;
      const vfs = pdfFonts.vfs ?? pdfFonts.pdfMake?.vfs ?? pdfFonts;

      if (typeof pdfMake.addVirtualFileSystem === 'function') {
        pdfMake.addVirtualFileSystem(vfs);
      } else {
        pdfMake.vfs = vfs;
      }

      pdfMake
        .createPdf(this.buildExecutivePdfDefinition(currentDashboard, this.filterForm.getRawValue(), generatedAt))
        .download(`ExecutiveDashboard_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf`);
    } catch (error) {
      console.error('Không thể tạo PDF ban điều hành', error);
      alert('Không thể tạo file PDF. Vui lòng thử lại.');
    }
  }

  private buildExecutivePdfDefinition(
    dashboard: ExecutiveDashboardResponseDto,
    filter: ReturnType<typeof this.filterForm.getRawValue>,
    generatedAt: string
  ): any {
    const overview = dashboard.overview;
    const periodText = `${this.formatReportDate(filter.startDate)} - ${this.formatReportDate(filter.endDate)}`;
    const operatingStatus = overview.operatingGap >= 0 ? 'Biên dương' : 'Cần kiểm soát';
    const productionStatus = overview.productionCompletionRate >= 0.9 ? 'Ổn định' : 'Theo dõi tiến độ';
    const scrapStatus = overview.productionScrapRate > 0.05 ? 'Cần kiểm soát' : 'Trong ngưỡng';

    return {
      pageSize: 'A4',
      pageMargins: [30, 34, 30, 42],
      info: {
        title: 'Báo cáo Ban điều hành',
        author: 'Enterprise Operations Hub',
        subject: 'Executive Dashboard'
      },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: 'Dashboard-X | Enterprise Operations Hub | Confidential', alignment: 'left' },
          { text: `Trang ${currentPage} / ${pageCount}`, alignment: 'right' }
        ],
        margin: [30, 0],
        fontSize: 8,
        color: '#64748b'
      }),
      content: [
        {
          table: {
            widths: ['*', 150],
            body: [[
              {
                stack: [
                  { text: 'BÁO CÁO BAN ĐIỀU HÀNH', style: 'reportTitle' },
                  { text: 'Executive Revenue, Spend, Workforce & Operations Report', style: 'reportSubtitle' },
                  { text: 'Enterprise Operations Hub', style: 'orgText', margin: [0, 8, 0, 0] }
                ],
                border: [false, false, false, false],
                fillColor: '#0f172a',
                margin: [14, 14, 14, 14]
              },
              {
                stack: [
                  { text: 'KỲ BÁO CÁO', style: 'coverLabel' },
                  { text: periodText, style: 'coverValue' },
                  { text: 'NGÀY XUẤT', style: 'coverLabel', margin: [0, 10, 0, 0] },
                  { text: generatedAt, style: 'coverValue' }
                ],
                border: [false, false, false, false],
                fillColor: '#2563eb',
                margin: [12, 14, 12, 14]
              }
            ]]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 14]
        },
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: 'Tóm tắt điều hành', style: 'sectionTitle', margin: [0, 0, 0, 6] },
                {
                  columns: [
                    this.buildExecutiveMetric('Biên vận hành', operatingStatus, this.formatCurrency(overview.operatingGap), overview.operatingGap >= 0 ? '#059669' : '#dc2626'),
                    this.buildExecutiveMetric('Sản xuất', productionStatus, this.formatPercent(overview.productionCompletionRate), overview.productionCompletionRate >= 0.9 ? '#0f766e' : '#f59e0b'),
                    this.buildExecutiveMetric('Chất lượng', scrapStatus, this.formatPercent(overview.productionScrapRate), overview.productionScrapRate > 0.05 ? '#dc2626' : '#059669')
                  ],
                  columnGap: 8
                }
              ],
              margin: [10, 10, 10, 10]
            }]]
          },
          layout: this.cardLayout('#dbe4f0'),
          margin: [0, 0, 0, 12]
        },
        this.buildFilterSummary(this.describeExecutiveFilters(filter, dashboard)),
        {
          columns: [
            this.buildKpiPdfCard('Tổng doanh thu', this.formatCurrency(overview.totalRevenue), `${this.formatNumber(overview.salesOrders)} đơn bán`, '#2563eb'),
            this.buildKpiPdfCard('Tổng chi mua', this.formatCurrency(overview.totalSpend), `${this.formatNumber(overview.purchaseOrders)} đơn mua`, '#f97316'),
            this.buildKpiPdfCard('Biên vận hành', this.formatCurrency(overview.operatingGap), 'Doanh thu - chi mua', overview.operatingGap >= 0 ? '#059669' : '#dc2626'),
            this.buildKpiPdfCard('Nhân sự hoạt động', this.formatNumber(overview.activeEmployees), 'Theo bộ lọc hiện tại', '#8b5cf6')
          ],
          columnGap: 8,
          margin: [0, 0, 0, 8]
        },
        {
          columns: [
            this.buildKpiPdfCard('Lệnh sản xuất', this.formatNumber(overview.workOrders), 'Work orders', '#0ea5e9'),
            this.buildKpiPdfCard('Hoàn thành SX', this.formatPercent(overview.productionCompletionRate), 'Completion rate', '#14b8a6'),
            this.buildKpiPdfCard('Tỷ lệ phế phẩm', this.formatPercent(overview.productionScrapRate), 'Scrap rate', '#ef4444'),
            this.buildKpiPdfCard('Đơn tổng hợp', this.formatNumber(overview.salesOrders + overview.purchaseOrders), 'Sales + Purchase orders', '#64748b')
          ],
          columnGap: 8,
          margin: [0, 0, 0, 14]
        },
        this.buildPdfSection(
          '01. Xu hướng doanh thu, chi mua và biên vận hành',
          'Theo dõi hiệu quả tài chính cấp điều hành theo từng kỳ.',
          ['Kỳ', 'Doanh thu', 'Chi mua', 'Biên vận hành'],
          dashboard.revenueVsSpendTrend.slice(0, 12).map(item => [item.period, this.formatCurrency(item.revenue), this.formatCurrency(item.spend), this.formatCurrency(item.operatingGap)]),
          ['*', 85, 85, 85]
        ),
        this.buildPdfSection(
          '02. Doanh thu theo vùng',
          'Các vùng đóng góp doanh thu cao trong bộ lọc hiện tại.',
          ['Vùng', 'Nhóm vùng', 'Doanh thu', 'Đơn hàng'],
          dashboard.revenueByTerritory.slice(0, 10).map(item => [item.territoryName, item.territoryGroup, this.formatCurrency(item.revenue), this.formatNumber(item.orders)]),
          ['*', 90, 90, 55]
        ),
        this.buildPdfSection(
          '03. Top nhân viên kinh doanh',
          'Hiệu suất doanh thu theo nhân viên kinh doanh.',
          ['Nhân viên', 'Vùng', 'Doanh thu', 'Đơn hàng', 'Đạt quota'],
          dashboard.topSalesPeople.slice(0, 10).map(item => [item.salesPersonName, item.territoryName, this.formatCurrency(item.revenue), this.formatNumber(item.orders), item.achievementRate == null ? 'N/A' : this.formatPercent(item.achievementRate)]),
          ['*', 80, 80, 45, 60]
        ),
        { text: '', pageBreak: 'before' },
        this.buildPdfSection(
          '04. Nhân sự theo phòng ban',
          'Cơ cấu headcount phục vụ điều hành nguồn lực.',
          ['Phòng ban', 'Nhóm', 'Headcount'],
          dashboard.headcountByDepartment.slice(0, 12).map(item => [this.translateDepartmentName(item.departmentName), this.translateGroupName(item.groupName), this.formatNumber(item.headcount)]),
          ['*', 150, 65]
        ),
        this.buildPdfSection(
          '05. Top nhà cung cấp theo chi mua',
          'Nhà cung cấp có mức spend cao cần theo dõi.',
          ['Nhà cung cấp', 'Chi mua', 'Đơn mua', 'Giá trị TB'],
          dashboard.topVendors.slice(0, 10).map(item => [item.vendorName, this.formatCurrency(item.totalSpend), this.formatNumber(item.orders), this.formatCurrency(item.averageOrderValue)]),
          ['*', 85, 55, 85]
        ),
        this.buildPdfSection(
          '06. Tỷ lệ nhận hàng nhà cung cấp',
          'So sánh số lượng nhận so với số lượng đặt.',
          ['Nhà cung cấp', 'Tỷ lệ nhận', 'Đã nhận', 'Đã đặt'],
          dashboard.vendorReceivingRates.slice(0, 10).map(item => [item.vendorName, this.formatPercent(item.receivingRate), this.formatNumber(item.receivedQty), this.formatNumber(item.orderedQty)]),
          ['*', 70, 70, 70]
        ),
        this.buildPdfSection(
          '07. Hiệu suất sản xuất theo ngành hàng',
          'Tổng hợp work orders, stocked quantity và scrap theo ngành hàng.',
          ['Ngành hàng', 'Lệnh SX', 'SL đặt', 'Nhập kho', 'Scrap %'],
          dashboard.productionByCategory.slice(0, 10).map(item => [item.productCategoryName, this.formatNumber(item.workOrders), this.formatNumber(item.orderQty), this.formatNumber(item.stockedQty), this.formatPercent(item.scrapRate)]),
          ['*', 55, 65, 65, 55]
        ),
        {
          text: 'Ghi chú: Báo cáo được tạo tự động từ Executive Dashboard theo bộ lọc đang áp dụng tại thời điểm xuất. Các chỉ số tiền tệ sử dụng USD theo dữ liệu AdventureWorks.',
          style: 'note',
          margin: [0, 12, 0, 0]
        }
      ],
      styles: {
        reportTitle: { fontSize: 22, bold: true, color: '#ffffff', characterSpacing: 0.5 },
        reportSubtitle: { fontSize: 9, color: '#bfdbfe', margin: [0, 4, 0, 0] },
        orgText: { fontSize: 9, color: '#e0f2fe', bold: true },
        coverLabel: { fontSize: 7, color: '#bfdbfe', bold: true, characterSpacing: 0.5 },
        coverValue: { fontSize: 10, color: '#ffffff', bold: true, margin: [0, 3, 0, 0] },
        sectionTitle: { fontSize: 12, bold: true, color: '#0f172a' },
        sectionSubtitle: { fontSize: 8, color: '#64748b', margin: [0, 2, 0, 6] },
        tableHeader: { bold: true, color: '#1e3a8a', fillColor: '#dbeafe', fontSize: 8 },
        tableCell: { fontSize: 8, color: '#111827' },
        kpiLabel: { fontSize: 7, color: '#64748b', bold: true, characterSpacing: 0.3 },
        kpiValue: { fontSize: 13, color: '#0f172a', bold: true },
        kpiNote: { fontSize: 7, color: '#475569' },
        metricLabel: { fontSize: 7, color: '#64748b', bold: true },
        metricValue: { fontSize: 11, bold: true, color: '#0f172a' },
        note: { fontSize: 8, italics: true, color: '#64748b' }
      },
      defaultStyle: {
        fontSize: 9,
        color: '#111827'
      }
    };
  }

  private describeExecutiveFilters(filter: ReturnType<typeof this.filterForm.getRawValue>, dashboard: ExecutiveDashboardResponseDto): string[] {
    const options = dashboard.filterOptions;
    const findName = (items: Array<{ id: number; name: string }>, id: number | null | undefined) => items.find(item => item.id === id)?.name ?? 'Tất cả';

    return [
      `Thời gian: ${this.formatReportDate(filter.startDate)} - ${this.formatReportDate(filter.endDate)}`,
      `Vùng: ${findName(options.territories, filter.territoryId)}`,
      `Nhân viên kinh doanh: ${findName(options.salesPeople, filter.salesPersonId)}`,
      `Nhà cung cấp: ${findName(options.vendors, filter.vendorId)}`,
      `Phòng ban: ${findName(options.departments, filter.departmentId)}`,
      `Ngành hàng: ${findName(options.productCategories, filter.productCategoryId)}`,
      `Nhân sự: ${filter.currentEmployeesOnly ? 'Chỉ nhân sự hiện hành' : 'Tất cả lịch sử'}`
    ];
  }

  private buildFilterSummary(filters: string[]): any {
    const pairs = filters.map(item => {
      const separatorIndex = item.indexOf(':');
      return separatorIndex >= 0
        ? [item.slice(0, separatorIndex), item.slice(separatorIndex + 1).trim()]
        : ['Bộ lọc', item];
    });

    return {
      table: {
        widths: ['*', '*', '*'],
        body: [
          [{ text: 'BỘ LỌC ĐANG ÁP DỤNG', colSpan: 3, style: 'tableHeader', fillColor: '#eef2ff' }, {}, {}],
          ...Array.from({ length: Math.ceil(pairs.length / 3) }, (_, rowIndex) => {
            const row = pairs.slice(rowIndex * 3, rowIndex * 3 + 3).map(([label, value]) => ({
              stack: [
                { text: label.toUpperCase(), fontSize: 6, bold: true, color: '#64748b' },
                { text: value || 'Tất cả', fontSize: 8, color: '#0f172a', margin: [0, 2, 0, 0] }
              ],
              margin: [6, 4, 6, 4]
            }) as any);

            while (row.length < 3) {
              row.push({ text: '' } as any);
            }

            return row;
          })
        ]
      },
      layout: this.cardLayout('#c7d2fe'),
      margin: [0, 0, 0, 12]
    };
  }

  private buildExecutiveMetric(label: string, value: string, note: string, color: string): any {
    return {
      table: {
        widths: [4, '*'],
        body: [[
          { text: '', fillColor: color, border: [false, false, false, false] },
          {
            stack: [
              { text: label, style: 'metricLabel' },
              { text: value, style: 'metricValue', margin: [0, 2, 0, 1] },
              { text: note, fontSize: 7, color }
            ],
            margin: [6, 5, 6, 5]
          }
        ]]
      },
      layout: this.cardLayout('#e5e7eb')
    };
  }

  private buildKpiPdfCard(label: string, value: string, note: string, color: string): any {
    return {
      table: {
        widths: [4, '*'],
        body: [[
          { text: '', fillColor: color, border: [false, false, false, false] },
          {
            stack: [
              { text: label.toUpperCase(), style: 'kpiLabel' },
              { text: value, style: 'kpiValue', margin: [0, 3, 0, 2] },
              { text: note, style: 'kpiNote' }
            ],
            margin: [6, 6, 6, 6]
          }
        ]]
      },
      layout: this.cardLayout('#dbe4f0')
    };
  }

  private buildPdfSection(title: string, subtitle: string, headers: string[], rows: string[][], widths: any[]): any {
    if (!rows.length) {
      return [
        { text: title, style: 'sectionTitle' },
        { text: subtitle, style: 'sectionSubtitle' },
        { text: 'Không có dữ liệu trong bộ lọc hiện tại.', color: '#64748b', fontSize: 9, margin: [0, 0, 0, 8] }
      ];
    }

    return [
      { text: title, style: 'sectionTitle' },
      { text: subtitle, style: 'sectionSubtitle' },
      {
        table: {
          headerRows: 1,
          widths,
          body: [
            headers.map(header => ({ text: header, style: 'tableHeader', margin: [3, 4, 3, 4] })),
            ...rows.map(row => row.map((cell, index) => ({
              text: cell,
              style: 'tableCell',
              alignment: index === 0 || index === 1 ? 'left' : 'right',
              margin: [3, 4, 3, 4]
            })))
          ]
        },
        layout: {
          hLineWidth: (i: number) => i === 0 || i === 1 ? 0.8 : 0.4,
          vLineWidth: () => 0.3,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#e2e8f0',
          fillColor: (rowIndex: number) => rowIndex === 0 ? '#dbeafe' : rowIndex % 2 === 0 ? '#f8fafc' : null
        },
        margin: [0, 0, 0, 10]
      }
    ];
  }

  private cardLayout(lineColor: string): any {
    return {
      hLineColor: () => lineColor,
      vLineColor: () => lineColor,
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0
    };
  }

  private formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value ?? 0));
  }

  private formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(value ?? 0));
  }

  private formatPercent(value: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value ?? 0));
  }

  private formatReportDate(value: string | null | undefined): string {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }
  customizeLayout(): void { this.toggleEditMode(); }
  saveFilter(): void {
    saveDashboardFilter(this.savedFilterStorageKey, this.filterForm.getRawValue());
    this.loadDashboard();
  }

  private restoreSavedFilter(): void {
    this.filterForm.patchValue(restoreDashboardFilter(this.savedFilterStorageKey, { startDate: '2013-01-01', endDate: '2014-12-31', territoryId: null, salesPersonId: null, vendorId: null, departmentId: null, productCategoryId: null, currentEmployeesOnly: true }));
  }

}
