import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ChartData, ChartOptions } from 'chart.js';
import { getStyle } from '@coreui/utils';
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
  RowComponent,
  TemplateIdDirective,
  WidgetStatAComponent
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';
import {
  ProductionControlExceptionsResponseDto,
  ProductionControlSafetyStockExceptionItemDto,
  ProductionControlWorkOrderExceptionItemDto,
  ProductionDashboardService
} from '../production/production-dashboard.service';

export interface ChartDef {
  id: string;
  label: string;
}

@Component({
  selector: 'app-production-control',
  standalone: true,
  templateUrl: './production-control.component.html',
  styleUrls: ['./production-control.component.scss'],
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
    DecimalPipe
  ]
})
export class ProductionControlComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productionDashboardService = inject(ProductionDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly chartPalette = {
    primary: getStyle('--cui-primary') ?? '#5856d6',
    info: getStyle('--cui-info') ?? '#39f',
    warning: getStyle('--cui-warning') ?? '#f9b115',
    danger: getStyle('--cui-danger') ?? '#e55353',
    success: getStyle('--cui-success') ?? '#2eb85c'
  };

  readonly title = 'Kiểm soát sản xuất';
  readonly subtitle = 'Dashboard ngoại lệ sản xuất tập trung vào cảnh báo chính, xu hướng chậm tiến độ và rủi ro vận hành.';

  private readonly defaultFilter = {
    startDate: '2013-01-01',
    endDate: '2014-12-31',
    productId: null as number | null,
    productCategoryId: null as number | null,
    locationId: null as number | null,
    scrapReasonId: null as number | null,
    makeOnly: null as boolean | null,
    finishedGoodsOnly: true as boolean | null,
    openOnly: null as boolean | null,
    delayedOnly: null as boolean | null,
    safetyStockOnly: null as boolean | null
  };

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly controlDashboard = signal<ProductionControlExceptionsResponseDto | null>(
    this.productionDashboardService.getCachedProductionControlExceptions(this.defaultFilter)
  );

  private readonly gridsterStorageKey = 'prod_control_grid_layout';
  private readonly hiddenChartsStorageKey = 'prod_control_hidden_charts';

  readonly isEditMode = signal(false);

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

  readonly showChartPicker = signal(false);

  readonly availableCharts: ChartDef[] = [
    { id: 'exception-summary', label: 'Xu hướng lệnh trễ hạn' },
    { id: 'exception-mix', label: 'Cơ cấu ngoại lệ' },
    { id: 'top-scrap', label: 'Top sản phẩm scrap cao' },
    { id: 'location-load', label: 'Phân bổ lệnh mở theo khu vực' },
    { id: 'shortage-by-category', label: 'Thiếu hụt safety stock theo ngành hàng' }
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
      { id: 'exception-summary', cols: 8, rows: 6, x: 0, y: 0 },
      { id: 'exception-mix', cols: 4, rows: 6, x: 8, y: 0 },
      { id: 'top-scrap', cols: 6, rows: 5, x: 0, y: 6 },
      { id: 'location-load', cols: 6, rows: 5, x: 6, y: 6 },
      { id: 'shortage-by-category', cols: 12, rows: 4, x: 0, y: 11 }
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

  getItem(id: string): GridsterItemConfig | undefined {
    return this.gridsterItems().find(item => item['id'] === id);
  }

  isChartVisible(chartId: string): boolean {
    return !this.hiddenChartIds().has(chartId);
  }

  readonly filterForm = this.fb.group({
    startDate: [this.defaultFilter.startDate],
    endDate: [this.defaultFilter.endDate],
    productId: [this.defaultFilter.productId],
    productCategoryId: [this.defaultFilter.productCategoryId],
    locationId: [this.defaultFilter.locationId],
    scrapReasonId: [this.defaultFilter.scrapReasonId],
    makeOnly: [this.defaultFilter.makeOnly],
    finishedGoodsOnly: [this.defaultFilter.finishedGoodsOnly],
    openOnly: [this.defaultFilter.openOnly],
    delayedOnly: [this.defaultFilter.delayedOnly],
    safetyStockOnly: [this.defaultFilter.safetyStockOnly]
  });

  readonly openWorkOrders = computed(() => this.controlDashboard()?.openWorkOrders ?? []);
  readonly delayedWorkOrders = computed(() => this.controlDashboard()?.delayedWorkOrders ?? []);
  readonly highScrapWorkOrders = computed(() => this.controlDashboard()?.highScrapWorkOrders ?? []);
  readonly safetyStockAlerts = computed(() => this.controlDashboard()?.safetyStockAlerts ?? []);

  readonly summaryCards = computed(() => {
    const summary = this.controlDashboard()?.summary;
    const openItems = this.openWorkOrders();
    const delayedItems = this.delayedWorkOrders();
    const scrapItems = this.highScrapWorkOrders();
    const stockItems = this.safetyStockAlerts();

    if (!summary) {
      return [];
    }

    const avgCompletionRate = openItems.length > 0
      ? openItems.reduce((sum, item) => sum + item.completionRate, 0) / openItems.length
      : 0;
    const avgDelayDays = delayedItems.length > 0
      ? delayedItems.reduce((sum, item) => sum + item.delayDays, 0) / delayedItems.length
      : 0;
    const avgScrapRate = scrapItems.length > 0
      ? scrapItems.reduce((sum, item) => sum + item.scrapRate, 0) / scrapItems.length
      : 0;
    const totalShortageQty = stockItems.reduce((sum, item) => sum + item.shortageQty, 0);

    return [
      {
        key: 'open',
        label: 'Lệnh mở',
        value: summary.openWorkOrders,
        note: 'Theo dõi khối lượng đang chạy',
        color: 'primary' as const,
        chartType: 'line' as const,
        chartData: this.buildWidgetChartData(
          [summary.openWorkOrders, Math.round(avgCompletionRate * 100), delayedItems.length, stockItems.length],
          this.chartPalette.primary,
          'line'
        ),
        chartOptions: this.buildWidgetChartOptions('line')
      },
      {
        key: 'delayed',
        label: 'Lệnh trễ hạn',
        value: summary.delayedWorkOrders,
        note: 'Cần can thiệp sớm',
        color: 'danger' as const,
        chartType: 'line' as const,
        chartData: this.buildWidgetChartData(
          [summary.delayedWorkOrders, Math.round(avgDelayDays), Math.max(summary.delayedWorkOrders - 1, 0), summary.delayedWorkOrders + 1],
          this.chartPalette.danger,
          'line'
        ),
        chartOptions: this.buildWidgetChartOptions('line')
      },
      {
        key: 'scrap',
        label: 'Lệnh scrap cao',
        value: summary.highScrapWorkOrders,
        note: 'Tập trung lỗi chất lượng',
        color: 'warning' as const,
        chartType: 'line' as const,
        chartData: this.buildWidgetChartData(
          [summary.highScrapWorkOrders, Math.round(avgScrapRate * 100), Math.max(scrapItems.length - 1, 0), scrapItems.length + 1],
          this.chartPalette.warning,
          'line'
        ),
        chartOptions: this.buildWidgetChartOptions('line')
      },
      {
        key: 'stock',
        label: 'Safety stock alert',
        value: summary.safetyStockAlerts,
        note: 'Thiếu hụt tồn kho cần bổ sung',
        color: 'info' as const,
        chartType: 'bar' as const,
        chartData: this.buildWidgetChartData(
          [summary.safetyStockAlerts, totalShortageQty, Math.max(stockItems.length * 2, 1), Math.round(totalShortageQty / Math.max(stockItems.length, 1))],
          this.chartPalette.info,
          'bar'
        ),
        chartOptions: this.buildWidgetChartOptions('bar')
      }
    ];
  });

  readonly delayedTrendChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.delayedWorkOrders();
    const grouped = new Map<string, number>();

    for (const item of rows) {
      const key = this.toMonthKey(item.dueDate ?? item.startDate);
      if (!key) {
        continue;
      }

      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }

    const entries = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));

    return {
      labels: entries.map(([key]) => this.formatMonthKey(key)),
      datasets: [
        {
          label: 'Lệnh trễ hạn',
          data: entries.map(([, value]) => value),
          backgroundColor: this.chartPalette.danger,
          borderRadius: 10,
          maxBarThickness: 34
        }
      ]
    };
  });

  readonly delayedTrendOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
        ticks: { precision: 0 }
      }
    }
  };

  readonly exceptionMixChartData = computed<ChartData<'doughnut'>>(() => {
    const summary = this.controlDashboard()?.summary;

    return {
      labels: ['Lệnh mở', 'Trễ hạn', 'Scrap cao', 'Safety stock'],
      datasets: [
        {
          data: summary
            ? [
              summary.openWorkOrders,
              summary.delayedWorkOrders,
              summary.highScrapWorkOrders,
              summary.safetyStockAlerts
            ]
            : [],
          backgroundColor: [
            this.chartPalette.primary,
            this.chartPalette.danger,
            this.chartPalette.warning,
            this.chartPalette.info
          ],
          borderWidth: 0,
          cutout: '66%'
        }
      ]
    };
  });

  readonly exceptionMixOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 10,
          boxHeight: 10,
          padding: 16,
          color: '#475569'
        }
      }
    }
  };

  readonly topScrapChartData = computed<ChartData<'bar'>>(() => {
    const items = [...this.highScrapWorkOrders()]
      .sort((left, right) => right.scrapRate - left.scrapRate)
      .slice(0, 6);

    return {
      labels: items.map((item) => this.truncateLabel(item.productName, 16)),
      datasets: [
        {
          label: 'Scrap rate %',
          data: items.map((item) => Number((item.scrapRate * 100).toFixed(1))),
          backgroundColor: this.chartPalette.warning,
          borderRadius: 10,
          maxBarThickness: 34
        }
      ]
    };
  });

  readonly topScrapOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
        ticks: { callback: (value) => `${value}%` }
      }
    }
  };

  readonly locationLoadChartData = computed<ChartData<'bar'>>(() => {
    const grouped = new Map<string, number>();

    for (const item of this.openWorkOrders()) {
      const locationKey = item.locationNames?.trim() || 'Chưa phân bổ';
      grouped.set(locationKey, (grouped.get(locationKey) ?? 0) + 1);
    }

    if (grouped.size === 0) {
      for (const item of this.delayedWorkOrders()) {
        const locationKey = item.locationNames?.trim() || 'Chưa phân bổ';
        grouped.set(locationKey, (grouped.get(locationKey) ?? 0) + 1);
      }
    }

    if (grouped.size === 0) {
      for (const item of this.highScrapWorkOrders()) {
        const locationKey = item.locationNames?.trim() || 'Chưa phân bổ';
        grouped.set(locationKey, (grouped.get(locationKey) ?? 0) + 1);
      }
    }

    const items = [...grouped.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);

    return {
      labels: items.map(([label]) => this.truncateLabel(label, 18)),
      datasets: [
        {
          label: 'Open work orders',
          data: items.map(([, value]) => value),
          backgroundColor: this.chartPalette.primary,
          borderRadius: 10,
          maxBarThickness: 34
        }
      ]
    };
  });

  readonly locationLoadOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
        ticks: { precision: 0 }
      }
    }
  };

  readonly shortageByCategoryChartData = computed<ChartData<'bar'>>(() => {
    const grouped = new Map<string, number>();

    for (const item of this.safetyStockAlerts()) {
      const categoryKey = item.productCategoryName?.trim() || 'Khác';
      grouped.set(categoryKey, (grouped.get(categoryKey) ?? 0) + item.shortageQty);
    }

    const items = [...grouped.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);

    return {
      labels: items.map(([label]) => this.truncateLabel(label, 18)),
      datasets: [
        {
          label: 'Thiếu hụt',
          data: items.map(([, value]) => value),
          backgroundColor: this.chartPalette.info,
          borderRadius: 10,
          maxBarThickness: 34
        }
      ]
    };
  });

  readonly shortageByCategoryOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
        ticks: { precision: 0 }
      }
    }
  };

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(forceRefresh = false): void {
    const filter = this.filterForm.getRawValue();
    const cachedControl = this.productionDashboardService.getCachedProductionControlExceptions(filter);

    this.errorMessage.set(null);

    if (cachedControl && !forceRefresh) {
      this.controlDashboard.set(cachedControl);
      this.loading.set(false);
      return;
    }

    this.loading.set(!this.controlDashboard());

    this.productionDashboardService.getProductionControlExceptions(filter, forceRefresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (control) => {
          this.controlDashboard.set(control);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Không thể tải dữ liệu Production Control.');
          this.loading.set(false);
        }
      });
  }

  resetFilters(): void {
    this.filterForm.reset(this.defaultFilter);
    this.loadDashboard(true);
  }

  exportPDF(): void {
    alert('Chức năng xuất PDF đang được phát triển');
  }

  customizeLayout(): void {
    this.toggleEditMode();
  }

  saveFilter(): void {
    alert('Chức năng lưu bộ lọc đang được phát triển');
  }

  private buildWidgetChartData(values: number[], color: string, type: 'line' | 'bar'): ChartData<'line' | 'bar'> {
    const safeValues = values.map((value) => Number.isFinite(value) ? value : 0);

    return {
      labels: safeValues.map(() => ''),
      datasets: [
        {
          label: '',
          data: safeValues,
          backgroundColor: type === 'bar' ? 'rgba(255,255,255,.24)' : 'transparent',
          borderColor: 'rgba(255,255,255,.7)',
          pointBackgroundColor: color,
          pointHoverBorderColor: color,
          fill: type === 'line',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: type === 'line' ? 3 : 0,
          pointHoverRadius: type === 'line' ? 4 : 0,
          barPercentage: 0.7,
          maxBarThickness: 18
        }
      ]
    };
  }

  private buildWidgetChartOptions(type: 'line' | 'bar'): ChartOptions<'line' | 'bar'> {
    return {
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      maintainAspectRatio: false,
      scales: {
        x: {
          border: { display: false },
          grid: { display: false, drawTicks: false },
          ticks: { display: false }
        },
        y: {
          display: false,
          grid: { display: false },
          ticks: { display: false },
          beginAtZero: true
        }
      },
      elements: type === 'line'
        ? {
          line: { borderWidth: 2, tension: 0.4 },
          point: { radius: 3, hitRadius: 10, hoverRadius: 4 }
        }
        : {}
    };
  }

  private toMonthKey(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private formatMonthKey(key: string): string {
    const [year, month] = key.split('-');
    return `${month}/${year.slice(-2)}`;
  }

  private truncateLabel(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
  }

  trackByWorkOrder(_: number, item: ProductionControlWorkOrderExceptionItemDto): number {
    return item.workOrderId;
  }

  trackByProduct(_: number, item: ProductionControlSafetyStockExceptionItemDto): number {
    return item.productId;
  }
}
