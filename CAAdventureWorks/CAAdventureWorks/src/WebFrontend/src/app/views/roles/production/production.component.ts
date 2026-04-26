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
    this.loadDashboard();
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
    this.filterForm.reset(this.defaultFilter);
    this.loadDashboard();
  }

  exportPDF(): void {
    console.log('Xuất PDF sản xuất');
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
    console.log('Lưu bộ lọc sản xuất');
  }

  bomLevelLabel(item: ProductionBomItemDto): string {
    return `Cấp BOM ${item.maxBomLevel}`;
  }
}
