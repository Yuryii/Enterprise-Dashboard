import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
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
  RowComponent,
  TemplateIdDirective,
  WidgetStatAComponent
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';
import {
  ProductionBomItemDto,
  ProductionCategoryItemDto,
  ProductionCostHistoryItemDto,
  ProductionDashboardResponseDto,
  ProductionDashboardService,
  ProductionDelayedItemDto,
  ProductionInventoryItemDto,
  ProductionLocationCostItemDto,
  ProductionLocationHoursItemDto,
  ProductionOperationVarianceItemDto,
  ProductionOutputTrendPointDto,
  ProductionProductItemDto,
  ProductionSafetyStockItemDto,
  ProductionTransactionTrendPointDto,
  ProductionTrendPointDto
} from './production-dashboard.service';

export interface ChartDef {
  id: string;
  label: string;
}

@Component({
  selector: 'app-production',
  standalone: true,
  templateUrl: './production.component.html',
  styleUrls: ['./production.component.scss'],
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
export class ProductionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productionDashboardService = inject(ProductionDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly widgetPiePalette = ['#3B82F6', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  private readonly productionPalette = {
    workOrders: '#2563EB',
    delayed: '#DC2626',
    orderQty: '#2563EB',
    stockedQty: '#10B981',
    scrappedQty: '#F97316',
    completionRate: '#7C3AED',
    topProducts: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#1D4ED8', '#0284C7', '#0EA5E9', '#38BDF8'],
    topScrap: '#EF4444',
    categoryOrderQty: '#2563EB',
    categoryScrapRate: '#F97316',
    locationPlanned: '#2563EB',
    locationActual: '#DC2626',
    variance: '#8B5CF6',
    hours: '#14B8A6',
    inventory: '#0891B2',
    shortage: '#DC2626',
    costHistory: '#4F46E5',
    transactions: '#0F766E',
    transactionCost: '#F59E0B'
  };

  readonly title = 'Sản xuất';
  readonly subtitle = 'Theo dõi lệnh sản xuất, công suất vận hành, tồn kho và biến động chi phí toàn xưởng';

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
  readonly dashboard = signal<ProductionDashboardResponseDto | null>(
    this.productionDashboardService.getCachedDashboard(this.defaultFilter)
  );

  private readonly savedFilterStorageKey = 'production_saved_filter';
  private readonly gridsterStorageKey = 'production_grid_layout';
  private readonly hiddenChartsStorageKey = 'production_hidden_charts';

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
    itemChangeCallback: (_item, _itemComponent) => this.saveLayoutToStorage()
  });

  readonly gridsterItems = signal<GridsterItemConfig[]>(
    this.loadLayoutFromStorage() ?? this.getDefaultLayout()
  );

  readonly showChartPicker = signal(false);

  readonly availableCharts: ChartDef[] = [
    { id: 'work-order-trend', label: 'Xu hướng lệnh sản xuất' },
    { id: 'output-trend', label: 'Sản lượng kế hoạch và nhập kho' },
    { id: 'top-products', label: 'Top sản phẩm sản xuất' },
    { id: 'top-scrap-products', label: 'Top sản phẩm phế phẩm' },
    { id: 'category-analysis', label: 'Hiệu suất theo ngành hàng' },
    { id: 'location-cost', label: 'Chi phí theo khu vực' },
    { id: 'operation-variance', label: 'Biến động chi phí' },
    { id: 'location-hours', label: 'Giờ nguồn lực theo khu vực' },
    { id: 'delayed-orders', label: 'Cơ cấu lệnh trễ hạn' },
    { id: 'inventory-by-location', label: 'Tồn kho theo khu vực' },
    { id: 'safety-stock', label: 'Cảnh báo safety stock' },
    { id: 'cost-history', label: 'Lịch sử standard cost' },
    { id: 'transaction-trend', label: 'Xu hướng transaction sản xuất' }
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
      { id: 'work-order-trend', cols: 8, rows: 5, x: 0, y: 0 },
      { id: 'delayed-orders', cols: 4, rows: 5, x: 8, y: 0 },
      { id: 'output-trend', cols: 6, rows: 5, x: 0, y: 5 },
      { id: 'top-products', cols: 6, rows: 5, x: 6, y: 5 },
      { id: 'category-analysis', cols: 7, rows: 5, x: 0, y: 10 },
      { id: 'top-scrap-products', cols: 5, rows: 5, x: 7, y: 10 },
      { id: 'location-cost', cols: 7, rows: 5, x: 0, y: 15 },
      { id: 'operation-variance', cols: 5, rows: 5, x: 7, y: 15 },
      { id: 'location-hours', cols: 6, rows: 5, x: 0, y: 20 },
      { id: 'inventory-by-location', cols: 6, rows: 5, x: 6, y: 20 },
      { id: 'safety-stock', cols: 6, rows: 5, x: 0, y: 25 },
      { id: 'cost-history', cols: 6, rows: 5, x: 6, y: 25 },
      { id: 'transaction-trend', cols: 12, rows: 4, x: 0, y: 30 }
    ];
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

  readonly kpiCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Lệnh sản xuất', value: overview.totalWorkOrders, format: 'number' },
      { label: 'SL kế hoạch', value: overview.totalOrderQty, format: 'number' },
      { label: 'SL nhập kho', value: overview.totalStockedQty, format: 'number' },
      { label: 'SL phế phẩm', value: overview.totalScrappedQty, format: 'number' }
    ];
  });

  readonly healthCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    const metrics = [
      { label: 'Tỷ lệ hoàn thành', value: overview.completionRate, type: 'percent' as const },
      { label: 'Tỷ lệ phế phẩm', value: overview.scrapRate, type: 'percent' as const },
      { label: 'Đơn trễ hạn', value: overview.delayedWorkOrders, type: 'number' as const },
      { label: 'Cảnh báo safety stock', value: overview.safetyStockAlerts, type: 'number' as const }
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

  readonly workOrderTrendChartData = computed<ChartData<'bar' | 'line'>>(() => {
    const trend = this.dashboard()?.workOrderTrend ?? [];
    return {
      labels: trend.map((item: ProductionTrendPointDto) => item.period),
      datasets: [
        {
          type: 'bar',
          label: 'Lệnh sản xuất',
          data: trend.map((item: ProductionTrendPointDto) => item.workOrders),
          backgroundColor: 'rgba(37, 99, 235, 0.72)',
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Đơn trễ hạn',
          data: trend.map((item: ProductionTrendPointDto) => item.delayedWorkOrders),
          borderColor: this.productionPalette.delayed,
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y1'
        }
      ]
    };
  });

  readonly workOrderTrendOptions: ChartOptions<'bar' | 'line'> = {
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

  readonly outputTrendChartData = computed<ChartData<'bar' | 'line'>>(() => {
    const items = this.dashboard()?.outputTrend ?? [];
    return {
      labels: items.map((item: ProductionOutputTrendPointDto) => item.period),
      datasets: [
        {
          type: 'bar',
          label: 'SL kế hoạch',
          data: items.map((item: ProductionOutputTrendPointDto) => item.orderQty),
          backgroundColor: this.productionPalette.orderQty,
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'SL nhập kho',
          data: items.map((item: ProductionOutputTrendPointDto) => item.stockedQty),
          backgroundColor: this.productionPalette.stockedQty,
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Tỷ lệ hoàn thành (%)',
          data: items.map((item: ProductionOutputTrendPointDto) => (item.completionRate ?? 0) * 100),
          borderColor: this.productionPalette.completionRate,
          backgroundColor: 'rgba(124, 58, 237, 0.12)',
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    };
  });

  readonly outputTrendOptions: ChartOptions<'bar' | 'line'> = {
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
        grace: '4%',
        grid: { drawOnChartArea: false },
        ticks: { stepSize: 10, callback: (value) => `${value}%` }
      }
    }
  };

  readonly topProductsChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.topProducts ?? [];
    return {
      labels: items.slice(0, 8).map((item: ProductionProductItemDto) => item.productName),
      datasets: [{
        label: 'SL sản xuất',
        data: items.slice(0, 8).map((item: ProductionProductItemDto) => item.orderQty),
        backgroundColor: items
          .slice(0, 8)
          .map((_: ProductionProductItemDto, index: number) => this.productionPalette.topProducts[index % this.productionPalette.topProducts.length]),
        borderRadius: 6
      }]
    };
  });

  readonly topProductsOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eeeeee' } } }
  };

  readonly topScrapProductsChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.topScrapProducts ?? [];
    return {
      labels: items.slice(0, 8).map((item: ProductionProductItemDto) => item.productName),
      datasets: [{
        label: 'SL phế phẩm',
        data: items.slice(0, 8).map((item: ProductionProductItemDto) => item.scrappedQty),
        backgroundColor: this.productionPalette.topScrap,
        borderRadius: 6,
        barThickness: 14
      }]
    };
  });

  readonly topScrapProductsOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, grid: { color: '#eeeeee' } }, y: { grid: { display: false } } }
  };

  readonly categoryChartData = computed<ChartData<'bar' | 'line'>>(() => {
    const items = this.dashboard()?.categories ?? [];
    return {
      labels: items.map((item: ProductionCategoryItemDto) => item.productCategoryName),
      datasets: [
        {
          type: 'bar',
          label: 'SL kế hoạch',
          data: items.map((item: ProductionCategoryItemDto) => item.orderQty),
          backgroundColor: this.productionPalette.categoryOrderQty,
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Tỷ lệ phế phẩm (%)',
          data: items.map((item: ProductionCategoryItemDto) => Number(((item.scrapRate ?? 0) * 100).toFixed(2))),
          borderColor: this.productionPalette.categoryScrapRate,
          backgroundColor: 'rgba(249, 115, 22, 0.12)',
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    };
  });

  readonly categoryOptions: ChartOptions<'bar' | 'line'> = {
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

  readonly locationCostChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.locationCosts ?? [];
    return {
      labels: items.slice(0, 8).map((item: ProductionLocationCostItemDto) => item.locationName),
      datasets: [
        {
          label: 'Chi phí kế hoạch',
          data: items.slice(0, 8).map((item: ProductionLocationCostItemDto) => item.plannedCost),
          backgroundColor: this.productionPalette.locationPlanned,
          borderRadius: 6
        },
        {
          label: 'Chi phí thực tế',
          data: items.slice(0, 8).map((item: ProductionLocationCostItemDto) => item.actualCost),
          backgroundColor: this.productionPalette.locationActual,
          borderRadius: 6
        }
      ]
    };
  });

  readonly locationCostOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eeeeee' } } }
  };

  readonly operationVarianceChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.operationVariances ?? [];
    return {
      labels: items.slice(0, 8).map((item: ProductionOperationVarianceItemDto) => `Công đoạn ${item.operationSequence}`),
      datasets: [{
        label: 'Biến động chi phí',
        data: items.slice(0, 8).map((item: ProductionOperationVarianceItemDto) => item.costVariance),
        backgroundColor: items
          .slice(0, 8)
          .map((item: ProductionOperationVarianceItemDto) => item.costVariance >= 0 ? '#F59E0B' : '#10B981'),
        borderRadius: 6
      }]
    };
  });

  readonly operationVarianceOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: '#eeeeee' } } }
  };

  readonly locationHoursChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.locationHours ?? [];
    return {
      labels: items.slice(0, 8).map((item: ProductionLocationHoursItemDto) => item.locationName),
      datasets: [{
        label: 'Giờ nguồn lực thực tế',
        data: items.slice(0, 8).map((item: ProductionLocationHoursItemDto) => item.actualResourceHours),
        backgroundColor: this.productionPalette.hours,
        borderRadius: 6
      }]
    };
  });

  readonly locationHoursOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, grid: { color: '#eeeeee' } }, y: { grid: { display: false } } }
  };

  readonly delayedWorkOrdersChartData = computed<ChartData<'pie'>>(() => {
    const items = this.dashboard()?.delayedWorkOrders ?? [];
    return {
      labels: items.slice(0, 6).map((item: ProductionDelayedItemDto) => `${item.productName} · ${item.locationName}`),
      datasets: [{
        data: items.slice(0, 6).map((item: ProductionDelayedItemDto) => item.workOrders),
        backgroundColor: items
          .slice(0, 6)
          .map((_: ProductionDelayedItemDto, index: number) => this.widgetPiePalette[index % this.widgetPiePalette.length]),
        borderWidth: 0,
        hoverOffset: 6
      }]
    };
  });

  readonly delayedWorkOrdersOptions: ChartOptions<'pie'> = {
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

  readonly inventoryChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.inventoryByLocation ?? [];
    return {
      labels: items.slice(0, 8).map((item: ProductionInventoryItemDto) => item.locationName),
      datasets: [{
        label: 'Tồn kho',
        data: items.slice(0, 8).map((item: ProductionInventoryItemDto) => item.inventoryQty),
        backgroundColor: this.productionPalette.inventory,
        borderRadius: 6
      }]
    };
  });

  readonly inventoryOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eeeeee' } } }
  };

  readonly safetyStockChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.safetyStockAlerts ?? [];
    return {
      labels: items.slice(0, 8).map((item: ProductionSafetyStockItemDto) => item.productName),
      datasets: [{
        label: 'Thiếu hụt',
        data: items.slice(0, 8).map((item: ProductionSafetyStockItemDto) => item.shortageQty),
        backgroundColor: this.productionPalette.shortage,
        borderRadius: 6
      }]
    };
  });

  readonly safetyStockOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, grid: { color: '#eeeeee' } }, y: { grid: { display: false } } }
  };

  readonly costHistoryChartData = computed<ChartData<'line'>>(() => {
    const items = this.dashboard()?.costHistory ?? [];
    return {
      labels: items.slice(0, 10).map((item: ProductionCostHistoryItemDto) => item.startDate.slice(0, 10)),
      datasets: [{
        label: 'Chi phí tiêu chuẩn',
        data: items.slice(0, 10).map((item: ProductionCostHistoryItemDto) => item.standardCost),
        borderColor: this.productionPalette.costHistory,
        backgroundColor: 'rgba(79, 70, 229, 0.12)',
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 4,
        fill: true
      }]
    };
  });

  readonly costHistoryOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eeeeee' } } }
  };

  readonly transactionTrendChartData = computed<ChartData<'bar' | 'line'>>(() => {
    const items = this.dashboard()?.transactionTrend ?? [];
    return {
      labels: items.map((item: ProductionTransactionTrendPointDto) => item.period),
      datasets: [
        {
          type: 'bar',
          label: 'Số giao dịch',
          data: items.map((item: ProductionTransactionTrendPointDto) => item.transactions),
          backgroundColor: this.productionPalette.transactions,
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Chi phí thực tế',
          data: items.map((item: ProductionTransactionTrendPointDto) => item.actualCost),
          borderColor: this.productionPalette.transactionCost,
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    };
  });

  readonly transactionTrendOptions: ChartOptions<'bar' | 'line'> = {
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

  readonly bomSummaryRows = computed(() => (this.dashboard()?.bomSummaries ?? []).slice(0, 6));

  ngOnInit(): void {
    this.restoreSavedFilter();
    this.loadDashboard(true);
  }

  loadDashboard(forceRefresh = false): void {
    const filter = this.filterForm.getRawValue();
    const cached = this.productionDashboardService.getCachedDashboard(filter);

    this.errorMessage.set(null);

    if (cached && !forceRefresh) {
      this.dashboard.set(cached);
      this.loading.set(false);
      return;
    }

    this.loading.set(!this.dashboard());

    this.productionDashboardService.getDashboard(filter, forceRefresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.dashboard.set(response);
          this.errorMessage.set(null);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Không thể tải dữ liệu bảng điều khiển sản xuất.');
          this.loading.set(false);
        }
      });
  }

  resetFilters(): void {
    localStorage.removeItem(this.savedFilterStorageKey);
    this.filterForm.reset(this.defaultFilter);
    this.loadDashboard(true);
  }

  async exportPDF(): Promise<void> {
    const currentDashboard = this.dashboard();
    if (!currentDashboard) {
      alert('Chưa có dữ liệu để tải báo cáo sản xuất.');
      return;
    }

    const generatedAt = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date());

    try {
      const [pdfMakeModule, pdfFontsModule] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts')
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
        .createPdf(this.buildProductionPdfDefinition(currentDashboard, this.filterForm.getRawValue(), generatedAt))
        .download(`ProductionDashboard_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf`);
    } catch (error) {
      console.error('Không thể tạo PDF sản xuất', error);
      alert('Không thể tạo file PDF. Vui lòng thử lại.');
    }
  }

  private buildProductionPdfDefinition(
    dashboard: ProductionDashboardResponseDto,
    filter: ReturnType<typeof this.filterForm.getRawValue>,
    generatedAt: string
  ): any {
    const overview = dashboard.overview;
    const periodText = `${this.formatReportDate(filter.startDate)} - ${this.formatReportDate(filter.endDate)}`;
    const activeFilters = this.describeProductionFilters(filter, dashboard);
    const varianceStatus = overview.costVariance > 0 ? 'Vượt kế hoạch' : overview.costVariance < 0 ? 'Tiết kiệm' : 'Đúng kế hoạch';
    const scrapStatus = overview.scrapRate > 0.05 ? 'Cần kiểm soát' : overview.scrapRate > 0.02 ? 'Theo dõi' : 'Ổn định';

    return {
      pageSize: 'A4',
      pageMargins: [30, 34, 30, 42],
      info: {
        title: 'Báo cáo Sản xuất',
        author: 'Enterprise Operations Hub',
        subject: 'Production Dashboard'
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
                  { text: 'BÁO CÁO SẢN XUẤT', style: 'reportTitle' },
                  { text: 'Production Performance & Operational Control Report', style: 'reportSubtitle' },
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
                fillColor: '#1d4ed8',
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
                    this.buildExecutiveMetric('Tình trạng chi phí', varianceStatus, this.formatCurrency(overview.costVariance), overview.costVariance > 0 ? '#dc2626' : '#059669'),
                    this.buildExecutiveMetric('Chất lượng sản xuất', scrapStatus, this.formatPercent(overview.scrapRate), overview.scrapRate > 0.05 ? '#dc2626' : '#0f766e'),
                    this.buildExecutiveMetric('Tiến độ', `${this.formatNumber(overview.delayedWorkOrders)} lệnh trễ`, `${this.formatPercent(overview.completionRate)} hoàn thành`, overview.delayedWorkOrders > 0 ? '#f59e0b' : '#059669')
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
        this.buildFilterSummary(activeFilters),
        {
          columns: [
            this.buildKpiPdfCard('Lệnh sản xuất', this.formatNumber(overview.totalWorkOrders), `Đang mở: ${this.formatNumber(overview.openWorkOrders)}`, '#2563eb'),
            this.buildKpiPdfCard('Sản lượng đặt', this.formatNumber(overview.totalOrderQty), `Nhập kho: ${this.formatNumber(overview.totalStockedQty)}`, '#059669'),
            this.buildKpiPdfCard('Tỷ lệ phế phẩm', this.formatPercent(overview.scrapRate), `SL phế phẩm: ${this.formatNumber(overview.totalScrappedQty)}`, '#dc2626'),
            this.buildKpiPdfCard('Biến động chi phí', this.formatCurrency(overview.costVariance), `Kế hoạch: ${this.formatCurrency(overview.plannedCost)}`, overview.costVariance > 0 ? '#dc2626' : '#059669')
          ],
          columnGap: 8,
          margin: [0, 0, 0, 8]
        },
        {
          columns: [
            this.buildKpiPdfCard('Tỷ lệ hoàn thành', this.formatPercent(overview.completionRate), 'Nhập kho / sản lượng đặt', '#7c3aed'),
            this.buildKpiPdfCard('Lệnh trễ hạn', this.formatNumber(overview.delayedWorkOrders), 'Ưu tiên xử lý', '#f59e0b'),
            this.buildKpiPdfCard('Giờ nguồn lực', this.formatNumber(overview.actualResourceHours), 'Actual resource hours', '#0f766e'),
            this.buildKpiPdfCard('Cảnh báo tồn kho', this.formatNumber(overview.safetyStockAlerts), `Tồn kho: ${this.formatNumber(overview.totalInventoryQty)}`, '#0891b2')
          ],
          columnGap: 8,
          margin: [0, 0, 0, 14]
        },
        this.buildPdfSection(
          '01. Xu hướng lệnh sản xuất',
          'Theo dõi số lượng lệnh mở và lệnh trễ theo từng kỳ để nhận diện áp lực vận hành.',
          ['Kỳ', 'Lệnh SX', 'Lệnh mở', 'Lệnh trễ'],
          dashboard.workOrderTrend.slice(0, 12).map(item => [item.period, this.formatNumber(item.workOrders), this.formatNumber(item.openWorkOrders), this.formatNumber(item.delayedWorkOrders)]),
          ['*', 60, 60, 60]
        ),
        this.buildPdfSection(
          '02. Sản phẩm sản xuất nhiều nhất',
          'Các sản phẩm có khối lượng sản xuất lớn nhất trong bộ lọc hiện tại.',
          ['Sản phẩm', 'Ngành hàng', 'Lệnh', 'SL đặt', 'Nhập kho', 'Scrap'],
          dashboard.topProducts.slice(0, 10).map(item => [item.productName, item.productCategoryName, this.formatNumber(item.workOrders), this.formatNumber(item.orderQty), this.formatNumber(item.stockedQty), this.formatPercent(item.scrapRate)]),
          ['*', 88, 42, 55, 55, 45]
        ),
        this.buildPdfSection(
          '03. Sản phẩm có phế phẩm cao',
          'Danh sách sản phẩm cần kiểm soát chất lượng do phát sinh scrap cao.',
          ['Sản phẩm', 'Ngành hàng', 'SL phế phẩm', 'Tỷ lệ scrap', 'SL đặt'],
          dashboard.topScrapProducts.slice(0, 10).map(item => [item.productName, item.productCategoryName, this.formatNumber(item.scrappedQty), this.formatPercent(item.scrapRate), this.formatNumber(item.orderQty)]),
          ['*', 100, 70, 60, 55]
        ),
        { text: '', pageBreak: 'before' },
        this.buildPdfSection(
          '04. Biến động chi phí theo khu vực',
          'So sánh chi phí kế hoạch và chi phí thực tế theo khu vực sản xuất.',
          ['Khu vực', 'Lệnh', 'Kế hoạch', 'Thực tế', 'Biến động'],
          dashboard.locationCosts.slice(0, 10).map(item => [item.locationName, this.formatNumber(item.workOrders), this.formatCurrency(item.plannedCost), this.formatCurrency(item.actualCost), this.formatCurrency(item.costVariance)]),
          ['*', 45, 78, 78, 78]
        ),
        this.buildPdfSection(
          '05. Biến động chi phí theo công đoạn',
          'Các công đoạn có mức chênh lệch chi phí cần phân tích nguyên nhân.',
          ['Công đoạn', 'Kế hoạch', 'Thực tế', 'Biến động', 'Giờ nguồn lực'],
          dashboard.operationVariances.slice(0, 10).map(item => [`Công đoạn ${item.operationSequence}`, this.formatCurrency(item.plannedCost), this.formatCurrency(item.actualCost), this.formatCurrency(item.costVariance), this.formatNumber(item.actualResourceHours)]),
          ['*', 75, 75, 75, 70]
        ),
        this.buildPdfSection(
          '06. Cảnh báo tồn kho an toàn',
          'Các sản phẩm có tồn kho thấp hơn ngưỡng safety stock hoặc reorder point.',
          ['Sản phẩm', 'Tồn kho', 'Safety stock', 'Reorder point', 'Thiếu hụt'],
          dashboard.safetyStockAlerts.slice(0, 10).map(item => [item.productName, this.formatNumber(item.inventoryQty), this.formatNumber(item.safetyStockLevel), this.formatNumber(item.reorderPoint), this.formatNumber(item.shortageQty)]),
          ['*', 65, 70, 75, 65]
        ),
        {
          text: 'Ghi chú: Báo cáo được tạo tự động từ dữ liệu dashboard theo bộ lọc đang áp dụng tại thời điểm xuất. Các chỉ số chi phí sử dụng đơn vị tiền tệ USD theo dữ liệu AdventureWorks.',
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

  private buildProductionReportHtml(
    dashboard: ProductionDashboardResponseDto,
    filter: ReturnType<typeof this.filterForm.getRawValue>,
    generatedAt: string
  ): string {
    const overview = dashboard.overview;
    const periodText = `${this.formatReportDate(filter.startDate)} - ${this.formatReportDate(filter.endDate)}`;
    const activeFilters = this.describeProductionFilters(filter, dashboard);

    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Báo cáo sản xuất</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; background: #ffffff; }
    .report-page { min-height: 100vh; padding: 0; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 18px; }
    .title { font-size: 28px; font-weight: 800; margin: 0 0 6px; color: #0f172a; }
    .subtitle { font-size: 12px; color: #475569; margin: 0; line-height: 1.55; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0 8px; }
    .meta-card { border: 1px solid #dbe4f0; border-radius: 10px; padding: 10px 12px; background: #f8fafc; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; margin-bottom: 4px; }
    .meta-value { font-size: 12px; font-weight: 700; color: #0f172a; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
    .kpi { border: 1px solid #dbe4f0; border-left: 4px solid #2563eb; border-radius: 10px; padding: 12px; min-height: 80px; }
    .kpi.warning { border-left-color: #f59e0b; }
    .kpi.danger { border-left-color: #dc2626; }
    .kpi.success { border-left-color: #10b981; }
    .kpi-label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 7px; }
    .kpi-value { font-size: 21px; font-weight: 800; color: #0f172a; }
    .kpi-note { margin-top: 5px; font-size: 11px; color: #475569; }
    .section { margin-top: 18px; page-break-inside: avoid; }
    .section-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 8px; padding-left: 8px; border-left: 4px solid #2563eb; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; background: #eff6ff; color: #1e3a8a; padding: 8px; border: 1px solid #dbeafe; }
    td { padding: 7px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .number { text-align: right; font-variant-numeric: tabular-nums; }
    .filters { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .filter-pill { background: #eef2ff; color: #3730a3; border: 1px solid #c7d2fe; border-radius: 999px; padding: 5px 9px; font-size: 10px; font-weight: 700; }
    .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 10px; display: flex; justify-content: space-between; }
    .page-break { page-break-before: always; }
    @media print { .report-page { padding: 0; } }
  </style>
</head>
<body>
  <main class="report-page">
    <header class="header">
      <h1 class="title">Báo cáo Sản xuất</h1>
      <p class="subtitle">EOH - Enterprise Operations Hub | Kỳ báo cáo: ${periodText}<br>Thời điểm xuất: ${this.escapeHtml(generatedAt)}</p>
      <div class="filters">${activeFilters.map(item => `<span class="filter-pill">${item}</span>`).join('')}</div>
    </header>

    <section class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Lệnh sản xuất</div><div class="kpi-value">${this.formatNumber(overview.totalWorkOrders)}</div><div class="kpi-note">Đang mở: ${this.formatNumber(overview.openWorkOrders)}</div></div>
      <div class="kpi success"><div class="kpi-label">Sản lượng đặt</div><div class="kpi-value">${this.formatNumber(overview.totalOrderQty)}</div><div class="kpi-note">Nhập kho: ${this.formatNumber(overview.totalStockedQty)}</div></div>
      <div class="kpi danger"><div class="kpi-label">Tỷ lệ phế phẩm</div><div class="kpi-value">${this.formatPercent(overview.scrapRate)}</div><div class="kpi-note">SL phế phẩm: ${this.formatNumber(overview.totalScrappedQty)}</div></div>
      <div class="kpi warning"><div class="kpi-label">Biến động chi phí</div><div class="kpi-value">${this.formatCurrency(overview.costVariance)}</div><div class="kpi-note">Actual: ${this.formatCurrency(overview.actualCost)}</div></div>
      <div class="kpi"><div class="kpi-label">Tỷ lệ hoàn thành</div><div class="kpi-value">${this.formatPercent(overview.completionRate)}</div><div class="kpi-note">Theo stocked/order qty</div></div>
      <div class="kpi danger"><div class="kpi-label">Lệnh trễ hạn</div><div class="kpi-value">${this.formatNumber(overview.delayedWorkOrders)}</div><div class="kpi-note">Cần ưu tiên kiểm soát</div></div>
      <div class="kpi"><div class="kpi-label">Giờ nguồn lực</div><div class="kpi-value">${this.formatNumber(overview.actualResourceHours)}</div><div class="kpi-note">Actual resource hours</div></div>
      <div class="kpi warning"><div class="kpi-label">Cảnh báo tồn kho</div><div class="kpi-value">${this.formatNumber(overview.safetyStockAlerts)}</div><div class="kpi-note">Tồn kho: ${this.formatNumber(overview.totalInventoryQty)}</div></div>
    </section>

    <section class="section">
      <h2 class="section-title">Tổng quan xu hướng lệnh sản xuất</h2>
      ${this.renderReportTable(['Kỳ', 'Lệnh SX', 'Lệnh mở', 'Lệnh trễ'], dashboard.workOrderTrend.slice(0, 12).map(item => [item.period, this.formatNumber(item.workOrders), this.formatNumber(item.openWorkOrders), this.formatNumber(item.delayedWorkOrders)]), [1, 2, 3])}
    </section>

    <section class="section">
      <h2 class="section-title">Sản phẩm sản xuất nhiều nhất</h2>
      ${this.renderReportTable(['Sản phẩm', 'Ngành hàng', 'Lệnh', 'SL đặt', 'Nhập kho', 'Tỷ lệ scrap'], dashboard.topProducts.slice(0, 10).map(item => [item.productName, item.productCategoryName, this.formatNumber(item.workOrders), this.formatNumber(item.orderQty), this.formatNumber(item.stockedQty), this.formatPercent(item.scrapRate)]), [2, 3, 4, 5])}
    </section>

    <section class="section">
      <h2 class="section-title">Top sản phẩm phế phẩm cao</h2>
      ${this.renderReportTable(['Sản phẩm', 'Ngành hàng', 'SL phế phẩm', 'Tỷ lệ scrap', 'SL đặt'], dashboard.topScrapProducts.slice(0, 10).map(item => [item.productName, item.productCategoryName, this.formatNumber(item.scrappedQty), this.formatPercent(item.scrapRate), this.formatNumber(item.orderQty)]), [2, 3, 4])}
    </section>

    <section class="section page-break">
      <h2 class="section-title">Biến động chi phí theo khu vực</h2>
      ${this.renderReportTable(['Khu vực', 'Lệnh', 'Chi phí kế hoạch', 'Chi phí thực tế', 'Biến động'], dashboard.locationCosts.slice(0, 10).map(item => [item.locationName, this.formatNumber(item.workOrders), this.formatCurrency(item.plannedCost), this.formatCurrency(item.actualCost), this.formatCurrency(item.costVariance)]), [1, 2, 3, 4])}
    </section>

    <section class="section">
      <h2 class="section-title">Biến động chi phí theo công đoạn</h2>
      ${this.renderReportTable(['Công đoạn', 'Chi phí kế hoạch', 'Chi phí thực tế', 'Biến động', 'Giờ nguồn lực'], dashboard.operationVariances.slice(0, 10).map(item => [`Công đoạn ${item.operationSequence}`, this.formatCurrency(item.plannedCost), this.formatCurrency(item.actualCost), this.formatCurrency(item.costVariance), this.formatNumber(item.actualResourceHours)]), [1, 2, 3, 4])}
    </section>

    <section class="section">
      <h2 class="section-title">Cảnh báo tồn kho an toàn</h2>
      ${this.renderReportTable(['Sản phẩm', 'Tồn kho', 'Safety stock', 'Reorder point', 'Thiếu hụt'], dashboard.safetyStockAlerts.slice(0, 10).map(item => [item.productName, this.formatNumber(item.inventoryQty), this.formatNumber(item.safetyStockLevel), this.formatNumber(item.reorderPoint), this.formatNumber(item.shortageQty)]), [1, 2, 3, 4])}
    </section>

    <footer class="footer">
      <span>Dashboard-X | Enterprise Operations Hub | Bảo mật nội bộ</span>
      <span>Báo cáo theo bộ lọc hiện tại</span>
    </footer>
  </main>
</body>
</html>`;
  }

  private describeProductionFilters(
    filter: ReturnType<typeof this.filterForm.getRawValue>,
    dashboard: ProductionDashboardResponseDto
  ): string[] {
    const options = dashboard.filterOptions;
    const filters = [
      `Từ ngày: ${this.formatReportDate(filter.startDate)}`,
      `Đến ngày: ${this.formatReportDate(filter.endDate)}`,
      `Sản phẩm: ${this.lookupFilterName(options.products, filter.productId)}`,
      `Ngành hàng: ${this.lookupFilterName(options.productCategories, filter.productCategoryId)}`,
      `Khu vực: ${this.lookupFilterName(options.locations, filter.locationId)}`,
      `Lý do scrap: ${this.lookupFilterName(options.scrapReasons, filter.scrapReasonId)}`,
      `Make only: ${this.formatBooleanFilter(filter.makeOnly)}`,
      `Finished goods: ${this.formatBooleanFilter(filter.finishedGoodsOnly)}`,
      `Chỉ lệnh mở: ${this.formatBooleanFilter(filter.openOnly)}`,
      `Chỉ lệnh trễ: ${this.formatBooleanFilter(filter.delayedOnly)}`,
      `Thiếu safety stock: ${this.formatBooleanFilter(filter.safetyStockOnly)}`
    ];

    return filters.map(item => this.escapeHtml(item));
  }

  private lookupFilterName(items: Array<{ id: number; name: string }>, id: number | null | undefined): string {
    if (id == null) return 'Tất cả';
    return items.find(item => item.id === id)?.name ?? `ID ${id}`;
  }

  private formatBooleanFilter(value: boolean | null | undefined): string {
    if (value == null) return 'Tất cả';
    return value ? 'Có' : 'Không';
  }

  private renderReportTable(headers: string[], rows: string[][], numericColumns: number[] = []): string {
    if (!rows.length) {
      return '<p style="color:#64748b;font-size:12px;margin:8px 0 0;">Không có dữ liệu trong bộ lọc hiện tại.</p>';
    }

    return `<table><thead><tr>${headers.map(header => `<th>${this.escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((cell, index) => `<td class="${numericColumns.includes(index) ? 'number' : ''}">${this.escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  private formatReportDate(value: string | null | undefined): string {
    if (!value) return 'Không giới hạn';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN').format(date);
  }

  private formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value ?? 0);
  }

  private formatPercent(value: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'percent',
      maximumFractionDigits: 1
    }).format(value ?? 0);
  }

  private formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 2
    }).format(value ?? 0);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  customizeLayout(): void {
    this.toggleEditMode();
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

  saveFilter(): void {
    const filter = this.filterForm.getRawValue();
    localStorage.setItem(this.savedFilterStorageKey, JSON.stringify(filter));
    this.loadDashboard(true);
  }

  private restoreSavedFilter(): void {
    const raw = localStorage.getItem(this.savedFilterStorageKey);
    if (!raw) return;

    try {
      const savedFilter = JSON.parse(raw) as Partial<typeof this.defaultFilter>;
      this.filterForm.patchValue({ ...this.defaultFilter, ...savedFilter });
    } catch {
      localStorage.removeItem(this.savedFilterStorageKey);
    }
  }

  bomLevelLabel(item: ProductionBomItemDto): string {
    return `Cấp BOM ${item.maxBomLevel}`;
  }
}
