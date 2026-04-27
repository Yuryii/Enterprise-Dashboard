import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ChartData, ChartOptions } from 'chart.js';
import { ButtonDirective, CardBodyComponent, CardComponent, CardHeaderComponent, ColComponent, FormCheckComponent, FormCheckInputDirective, FormControlDirective, FormLabelDirective, FormSelectDirective, RowComponent, TemplateIdDirective, WidgetStatAComponent } from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import {
  QualityAssuranceDashboardResponseDto,
  QualityAssuranceDashboardService,
  QualityCategoryItemDto,
  QualityDepartmentItemDto,
  QualityLocationItemDto,
  QualityProductItemDto,
  QualityScrapReasonItemDto,
  QualityVendorItemDto
} from './quality-assurance-dashboard.service';
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';
import { clearDashboardFilter, restoreDashboardFilter, saveDashboardFilter } from '../shared/filter-storage';
import { exportDashboardPdf } from '../shared/dashboard-pdf-export';

export interface ChartDef {
  id: string;
  label: string;
}

@Component({
  selector: 'app-quality-assurance',
  standalone: true,
  templateUrl: './quality-assurance.component.html',
  styleUrls: ['./quality-assurance.component.scss'],
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
    DecimalPipe,
    PercentPipe
  ]
})
export class QualityAssuranceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly qualityAssuranceDashboardService = inject(QualityAssuranceDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly widgetPiePalette = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#14B8A6',
    '#8B5CF6',
    '#F97316'
  ];

  private readonly qualityPalette = {
    trendWorkOrders: '#2563EB',
    trendScrap: '#EF4444',
    topReasons: '#0F766E',
    topProducts: ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#6D28D9', '#9333EA', '#7E22CE', '#A855F7'],
    category: '#F97316',
    locationPlanned: '#2563EB',
    locationActual: '#DC2626',
    vendorReject: '#F59E0B',
    vendorReceived: '#14B8A6',
    inspector: '#6366F1'
  };

  readonly title = 'Đảm bảo chất lượng';
  readonly subtitle = 'Giám sát phế phẩm, nguyên nhân lỗi, vendor reject và nguồn lực kiểm soát chất lượng';

  readonly loading = signal(false);
  readonly includeAiAssessment = signal(false);
  readonly aiAssessmentLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<any>(null);

  readonly savedFilterStorageKey = 'quality_assurance_saved_filter';
  readonly gridsterStorageKey = 'qa_grid_layout';
  readonly hiddenChartsStorageKey = 'qa_hidden_charts';

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
    { id: 'defect-trend', label: 'Xu hướng defect' },
    { id: 'scrap-reasons', label: 'Lý do scrap' },
    { id: 'top-defect-products', label: 'Top sản phẩm lỗi' },
    { id: 'category-analysis', label: 'Phân tích theo ngành hàng' },
    { id: 'location-cost', label: 'Chi phí theo khu vực' },
    { id: 'vendor-reject', label: 'Tỷ lệ reject NCC' },
    { id: 'inspector-headcount', label: 'Nhân sự QC' }
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
      { id: 'defect-trend', cols: 8, rows: 6, x: 0, y: 0 },
      { id: 'inspector-headcount', cols: 4, rows: 6, x: 8, y: 0 },
      { id: 'scrap-reasons', cols: 6, rows: 5, x: 0, y: 6 },
      { id: 'top-defect-products', cols: 6, rows: 5, x: 6, y: 6 },
      { id: 'category-analysis', cols: 7, rows: 5, x: 0, y: 11 },
      { id: 'vendor-reject', cols: 5, rows: 5, x: 7, y: 11 },
      { id: 'location-cost', cols: 12, rows: 4, x: 0, y: 16 }
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

  readonly filterForm = this.fb.group({
    startDate: ['2013-01-01'],
    endDate: ['2014-12-31'],
    scrapReasonId: [null as number | null],
    productCategoryId: [null as number | null],
    locationId: [null as number | null],
    vendorId: [null as number | null],
    currentInspectorsOnly: [true as boolean | null]
  });

  readonly kpiCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Lệnh sản xuất', value: overview.totalWorkOrders, format: 'number' },
      { label: 'SL sản xuất', value: overview.totalOrderQty, format: 'number' },
      { label: 'SL phế phẩm', value: overview.totalScrappedQty, format: 'number' },
      { label: 'Đơn có lỗi', value: overview.ordersWithDefects, format: 'number' }
    ];
  });

  readonly healthCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    const metrics = [
      { label: 'Tỷ lệ phế phẩm', value: overview.scrapRate, type: 'percent' as const },
      { label: 'Tỷ lệ hoàn thành', value: overview.completionRate, type: 'percent' as const },
      { label: 'Tỷ lệ reject NCC', value: overview.vendorRejectRate, type: 'percent' as const },
      { label: 'Nhân sự QA', value: overview.activeInspectors, type: 'number' as const }
    ];

    const maxNumberValue = Math.max(
      ...metrics.filter((item) => item.type === 'number').map((item) => item.value),
      1
    );

    return metrics.map((item) => ({
      ...item,
      progress:
        item.type === 'number'
          ? Math.max(20, Math.min(100, (item.value / maxNumberValue) * 100))
          : Math.max(6, Math.min(100, item.value * 100))
    }));
  });

  readonly defectTrendChartData = computed<ChartData<'bar' | 'line'>>(() => {
    const trend = this.dashboard()?.defectTrend ?? [];
    return {
      labels: trend.map((item: any) => item.period),
      datasets: [
        {
          type: 'bar',
          label: 'SL phế phẩm',
          data: trend.map((item: any) => item.scrappedQty),
          backgroundColor: 'rgba(239, 68, 68, 0.72)',
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Tỷ lệ phế phẩm',
          data: trend.map((item: any) => (item.scrapRate ?? 0) * 100),
          borderColor: this.qualityPalette.trendWorkOrders,
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y1'
        }
      ]
    };
  });

  readonly defectTrendOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' } },
      y1: {
        beginAtZero: true,
        position: 'right',
        max: 100,
        grid: { drawOnChartArea: false },
        ticks: { callback: (value) => `${value}%` }
      }
    }
  };

  readonly scrapReasonChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.topScrapReasons ?? [];
    return {
      labels: items.slice(0, 8).map((item: QualityScrapReasonItemDto) => item.scrapReasonName),
      datasets: [{
        label: 'SL phế phẩm',
        data: items.slice(0, 8).map((item: QualityScrapReasonItemDto) => item.scrappedQty),
        backgroundColor: this.qualityPalette.topReasons,
        borderRadius: 6,
        barThickness: 14
      }]
    };
  });

  readonly scrapReasonOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, grid: { color: '#eeeeee' } }, y: { grid: { display: false } } }
  };

  readonly topDefectProductsChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.topDefectProducts ?? [];
    return {
      labels: items.slice(0, 8).map((item: QualityProductItemDto) => item.productName),
      datasets: [{
        label: 'SL phế phẩm',
        data: items.slice(0, 8).map((item: QualityProductItemDto) => item.scrappedQty),
        backgroundColor: items
          .slice(0, 8)
          .map((_: QualityProductItemDto, index: number) => this.qualityPalette.topProducts[index % this.qualityPalette.topProducts.length]),
        borderRadius: 6
      }]
    };
  });

  readonly topDefectProductsOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eeeeee' } } }
  };

  readonly categoryChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.defectsByCategory ?? [];
    return {
      labels: items.map((item: QualityCategoryItemDto) => item.productCategoryName),
      datasets: [{
        label: 'Tỷ lệ phế phẩm (%)',
        data: items.map((item: QualityCategoryItemDto) => Number(((item.scrapRate ?? 0) * 100).toFixed(2))),
        backgroundColor: this.qualityPalette.category,
        borderRadius: 6,
        minBarLength: 10
      }]
    };
  });

  readonly categoryOptions = computed<ChartOptions<'bar'>>(() => {
    const items = this.dashboard()?.defectsByCategory ?? [];
    const values = items.map((item: QualityCategoryItemDto) => (item.scrapRate ?? 0) * 100);
    const maxValue = values.length > 0 ? Math.max(...values) : 0;
    const suggestedMax = maxValue <= 0
      ? 1
      : maxValue < 1
        ? 1
        : Math.ceil(maxValue * 1.25);

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          suggestedMax,
          grid: { color: '#eeeeee' },
          ticks: { callback: (value) => `${value}%` }
        }
      }
    };
  });

  readonly locationChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.defectsByLocation ?? [];
    return {
      labels: items.slice(0, 8).map((item: QualityLocationItemDto) => item.locationName),
      datasets: [
        {
          label: 'Chi phí kế hoạch',
          data: items.slice(0, 8).map((item: QualityLocationItemDto) => item.plannedCost),
          backgroundColor: this.qualityPalette.locationPlanned,
          borderRadius: 6
        },
        {
          label: 'Chi phí thực tế',
          data: items.slice(0, 8).map((item: QualityLocationItemDto) => item.actualCost),
          backgroundColor: this.qualityPalette.locationActual,
          borderRadius: 6
        }
      ]
    };
  });

  readonly locationOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eeeeee' } } }
  };

  readonly vendorRejectChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.vendorRejectRates ?? [];
    return {
      labels: items.slice(0, 6).map((item: QualityVendorItemDto) => item.vendorName),
      datasets: [
        {
          label: 'Tỷ lệ reject (%)',
          data: items.slice(0, 6).map((item: QualityVendorItemDto) => (item.rejectRate ?? 0) * 100),
          backgroundColor: this.qualityPalette.vendorReject,
          borderRadius: 6
        },
        {
          label: 'SL nhận hàng',
          data: items.slice(0, 6).map((item: QualityVendorItemDto) => item.receivedQty),
          backgroundColor: this.qualityPalette.vendorReceived,
          borderRadius: 6
        }
      ]
    };
  });

  readonly vendorRejectOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eeeeee' } } }
  };

  readonly inspectorHeadcountChartData = computed<ChartData<'pie'>>(() => {
    const items = this.dashboard()?.inspectorHeadcount ?? [];
    return {
      labels: items.map((item: QualityDepartmentItemDto) => this.translateDepartmentName(item.departmentName)),
      datasets: [{
        data: items.map((item: QualityDepartmentItemDto) => item.headcount),
        backgroundColor: items.map((_: QualityDepartmentItemDto, index: number) => this.widgetPiePalette[index % this.widgetPiePalette.length]),
        borderWidth: 0,
        hoverOffset: 6
      }]
    };
  });

  readonly inspectorHeadcountOptions: ChartOptions<'pie'> = {
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

  ngOnInit(): void {
    this.restoreSavedFilter();
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.qualityAssuranceDashboardService.getDashboard(this.filterForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.dashboard.set(response);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Không thể tải dữ liệu Quality Assurance Dashboard.');
          this.loading.set(false);
        }
      });
  }

  resetFilters(): void {
    clearDashboardFilter(this.savedFilterStorageKey);
    this.filterForm.reset({ startDate: '2013-01-01', endDate: '2014-12-31', scrapReasonId: null, productCategoryId: null, locationId: null, vendorId: null, currentInspectorsOnly: true });
    this.loadDashboard();
  }

  toggleAiAssessment(enabled: boolean): void {
    this.includeAiAssessment.set(enabled);
  }

  async exportPDF(): Promise<void> {
    const currentDashboard = this.dashboard() as QualityAssuranceDashboardResponseDto | null;
    if (!currentDashboard) {
      alert('Chưa có dữ liệu để tải báo cáo đảm bảo chất lượng.');
      return;
    }

    try {
      await exportDashboardPdf({
        aiAssessment: { enabled: this.includeAiAssessment(), departmentId: 'quality-assurance', dashboard: currentDashboard ?? null, filters: this.filterForm.getRawValue(), setLoading: value => this.aiAssessmentLoading.set(value) },
        title: this.title,
        subtitle: 'Báo cáo theo bộ lọc hiện tại',
        filePrefix: 'QualityAssuranceDashboard',
        metrics: this.kpiCards(),
        secondaryMetrics: this.healthCards(),
        filters: this.describeQualityFilters(currentDashboard),
        sections: [
          {
            title: '01. Xu hướng phế phẩm theo bộ lọc',
            subtitle: 'Work order, số lượng phế phẩm và tỷ lệ phế phẩm theo từng kỳ.',
            headers: ['Kỳ', 'Năm', 'Tháng', 'WO', 'SL phế phẩm', 'Tỷ lệ'],
            rows: currentDashboard.defectTrend.slice(0, 12).map(item => [item.period, item.year, item.month, item.workOrders, item.scrappedQty, this.formatPercent(item.scrapRate)]),
            widths: ['*', 40, 40, 45, 70, 55]
          },
          {
            title: '02. Top lý do scrap',
            subtitle: 'Nguyên nhân scrap phát sinh nhiều nhất theo bộ lọc hiện tại.',
            headers: ['Lý do scrap', 'Work orders', 'SL phế phẩm'],
            rows: currentDashboard.topScrapReasons.slice(0, 10).map(item => [item.scrapReasonName, item.workOrders, item.scrappedQty]),
            widths: ['*', 70, 75]
          },
          {
            title: '03. Top sản phẩm lỗi',
            subtitle: 'Sản phẩm có lượng phế phẩm cao trong phạm vi đã lọc.',
            headers: ['Sản phẩm', 'Danh mục', 'WO', 'Phế phẩm', 'Tỷ lệ'],
            rows: currentDashboard.topDefectProducts.slice(0, 10).map(item => [item.productName, item.productCategoryName, item.workOrders, item.scrappedQty, this.formatPercent(item.scrapRate)]),
            widths: ['*', 70, 45, 60, 55]
          },
          {
            title: '04. Phân tích theo danh mục',
            subtitle: 'Tỷ lệ và số lượng phế phẩm theo product category.',
            headers: ['Danh mục', 'WO', 'Phế phẩm', 'Tỷ lệ'],
            rows: currentDashboard.defectsByCategory.slice(0, 10).map(item => [item.productCategoryName, item.workOrders, item.scrappedQty, this.formatPercent(item.scrapRate)]),
            widths: ['*', 55, 65, 55]
          },
          {
            title: '05. Chi phí lỗi theo khu vực',
            subtitle: 'Chi phí kế hoạch, thực tế và giờ tài nguyên theo location.',
            headers: ['Khu vực', 'Chi phí KH', 'Chi phí TT', 'Giờ', 'WO'],
            rows: currentDashboard.defectsByLocation.slice(0, 10).map(item => [item.locationName, this.formatCurrency(item.plannedCost), this.formatCurrency(item.actualCost), item.actualResourceHours, item.workOrders]),
            widths: ['*', 75, 75, 45, 45]
          },
          {
            title: '06. Reject nhà cung cấp',
            subtitle: 'Số lượng nhận, từ chối và tỷ lệ reject theo vendor.',
            headers: ['Nhà cung cấp', 'SL nhận', 'SL từ chối', 'Tỷ lệ reject'],
            rows: currentDashboard.vendorRejectRates.slice(0, 10).map(item => [item.vendorName, item.receivedQty, item.rejectedQty, this.formatPercent(item.rejectRate)]),
            widths: ['*', 65, 70, 70]
          },
          {
            title: '07. Nhân sự kiểm soát chất lượng',
            subtitle: 'Headcount QA theo phòng ban/nhóm.',
            headers: ['Phòng ban', 'Nhóm', 'Headcount'],
            rows: currentDashboard.inspectorHeadcount.map(item => [this.translateDepartmentName(item.departmentName), item.groupName, item.headcount]),
            widths: ['*', '*', 65]
          }
        ]
      });
    } catch (error) {
      console.error('Không thể tạo PDF dashboard đảm bảo chất lượng', error);
      alert('Không thể tạo file PDF. Vui lòng thử lại.');
    }
  }

  private describeQualityFilters(dashboard: QualityAssuranceDashboardResponseDto): string[] {
    const filters = dashboard.filters;
    const scrapReason = dashboard.filterOptions.scrapReasons.find(item => item.id === filters.scrapReasonId)?.name ?? 'Tất cả';
    const category = dashboard.filterOptions.productCategories.find(item => item.id === filters.productCategoryId)?.name ?? 'Tất cả';
    const location = dashboard.filterOptions.locations.find(item => item.id === filters.locationId)?.name ?? 'Tất cả';
    const vendor = dashboard.filterOptions.vendors.find(item => item.id === filters.vendorId)?.name ?? 'Tất cả';

    return [
      `Thời gian: ${this.formatReportDate(filters.startDate)} - ${this.formatReportDate(filters.endDate)}`,
      `Lý do scrap: ${scrapReason}`,
      `Danh mục: ${category}`,
      `Khu vực: ${location}`,
      `Nhà cung cấp: ${vendor}`,
      `Chỉ inspector hiện hành: ${this.formatBooleanFilter(filters.currentInspectorsOnly)}`
    ];
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

  customizeLayout(): void {
    this.toggleEditMode();
  }

  saveFilter(): void {
    saveDashboardFilter(this.savedFilterStorageKey, this.filterForm.getRawValue());
    this.loadDashboard();
  }

  private translateDepartmentName(name: string): string {
    switch (name.trim().toLowerCase()) {
      case 'quality assurance':
        return 'Đảm bảo chất lượng';
      case 'production control':
        return 'Kiểm soát sản xuất';
      case 'manufacturing':
        return 'Sản xuất';
      default:
        return name;
    }
  }
  private restoreSavedFilter(): void {
    this.filterForm.patchValue(restoreDashboardFilter(this.savedFilterStorageKey, { startDate: '2013-01-01', endDate: '2014-12-31', scrapReasonId: null, productCategoryId: null, locationId: null, vendorId: null, currentInspectorsOnly: true }));
  }

}
