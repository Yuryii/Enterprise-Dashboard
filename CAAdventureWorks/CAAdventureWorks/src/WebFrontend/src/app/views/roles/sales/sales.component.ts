import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
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
  FormControlDirective,
  FormLabelDirective,
  FormSelectDirective,
  RowComponent,
  TemplateIdDirective,
  WidgetStatAComponent
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import { SalesDashboardResponseDto, SalesDashboardService } from './sales-dashboard.service';
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';
import { clearDashboardFilter, restoreDashboardFilter, saveDashboardFilter } from '../shared/filter-storage';
import { exportDashboardPdf } from '../shared/dashboard-pdf-export';

export interface ChartDef {
  id: string;
  label: string;
}

@Component({
  selector: 'app-sales',
  standalone: true,
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
    FormControlDirective,
    FormLabelDirective,
    FormSelectDirective,
    ButtonDirective,
    ChartjsComponent,
    IconDirective,
    TemplateIdDirective,
    WidgetStatAComponent,
    CurrencyPipe,
    DecimalPipe
  ],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss'
})
export class SalesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly salesDashboardService = inject(SalesDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly widgetChartPalette = {
    primary: getStyle('--cui-primary'),
    info: getStyle('--cui-info'),
    warning: getStyle('--cui-warning')
  };

  private readonly widgetChartSeriesPalette = [
    this.widgetChartPalette.primary,
    this.widgetChartPalette.info,
    this.widgetChartPalette.warning
  ];

  private readonly widgetChartCustomerSegmentPalette = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56'
  ];

  private readonly barChartColor = '#f87979';
  private readonly growthLineColor = getStyle('--cui-info') ?? '#00D8FF';

  readonly title = 'Sales';
  readonly subtitle = 'Dashboard';

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<any>(null);

  private readonly savedFilterStorageKey = 'sales_saved_filter';
  readonly gridsterStorageKey = 'sales_grid_layout';
  private readonly hiddenChartsStorageKey = 'sales_hidden_charts';

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
    { id: 'customer-segment', label: 'Phân khúc khách hàng' },
    { id: 'category-mix', label: 'Phân loại sản phẩm' },
    { id: 'order-growth', label: 'Đơn hàng và tăng trưởng' },
    { id: 'revenue-trend', label: 'Xu hướng doanh thu' },
    { id: 'order-status', label: 'Trạng thái đơn hàng' },
    { id: 'top-products', label: 'Sản phẩm bán chạy' },
    { id: 'territory-sales', label: 'Doanh số theo vùng' },
    { id: 'top-customers', label: 'Top khách hàng theo doanh thu' }
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
      { id: 'customer-segment', cols: 4, rows: 5, x: 0, y: 0 },
      { id: 'category-mix', cols: 4, rows: 5, x: 4, y: 0 },
      { id: 'order-growth', cols: 4, rows: 5, x: 8, y: 0 },
      { id: 'revenue-trend', cols: 8, rows: 6, x: 0, y: 5 },
      { id: 'order-status', cols: 4, rows: 6, x: 8, y: 5 },
      { id: 'top-products', cols: 6, rows: 5, x: 0, y: 11 },
      { id: 'territory-sales', cols: 6, rows: 5, x: 6, y: 11 },
      { id: 'top-customers', cols: 12, rows: 4, x: 0, y: 16 }
    ];
  }

  readonly filterForm = this.fb.group({
    startDate: ['2013-01-01'],
    endDate: ['2014-12-31'],
    territoryId: [null as number | null],
    salesPersonId: [null as number | null],
    productCategoryId: [null as number | null],
    onlineOrderFlag: [null as boolean | null]
  });

  readonly kpiCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Tổng doanh thu', value: overview.totalRevenue, format: 'currency', accent: 'primary', icon: 'cilDollar' },
      { label: 'Tổng đơn hàng', value: overview.totalOrders, format: 'number', accent: 'success', icon: 'cilCart' },
      { label: 'Số lượng bán', value: overview.unitsSold, format: 'number', accent: 'info', icon: 'cilBox' },
      { label: 'Giá trị TB/đơn', value: overview.averageOrderValue, format: 'currency', accent: 'warning', icon: 'cilChartLine' }
    ];
  });

  readonly revenueTrendChartData = computed<ChartData<'line'>>(() => {
    const trend = this.dashboard()?.revenueTrend ?? [];

    return {
      labels: trend.map((item: any) => item.period),
      datasets: [
        {
          label: 'Doanh thu',
          data: trend.map((item: any) => item.revenue),
          borderColor: this.widgetChartPalette.primary,
          backgroundColor: 'transparent',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: this.widgetChartPalette.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    };
  });

  readonly revenueTrendOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#667eea',
        borderWidth: 1
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { callback: (value) => '$' + (Number(value) / 1000000).toFixed(1) + 'M' } }
    }
  };

  readonly customerSegmentChartData = computed<ChartData<'pie'>>(() => {
    const segments = this.dashboard()?.customerSegments ?? [];
    const segmentLabelMap: Record<string, string> = {
      'Reseller / B2B': 'Đại lý / B2B',
      'Individual / B2C': 'Cá nhân / B2C'
    };

    return {
      labels: segments.map((item: any) => segmentLabelMap[item.segment] ?? item.segment),
      datasets: [
        {
          data: segments.map((item: any) => item.revenue),
          backgroundColor: segments.map((_: any, index: number) => this.widgetChartCustomerSegmentPalette[index % this.widgetChartCustomerSegmentPalette.length]),
          borderWidth: 0,
          hoverOffset: 6
        }
      ]
    };
  });

  readonly customerSegmentOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
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

  readonly orderStatusChartData = computed<ChartData<'doughnut'>>(() => {
    const statuses = (this.dashboard()?.orderStatuses ?? []).filter((item: any) => (item.orders ?? 0) > 0);
    const statusColors: Record<string, string> = {
      'đã giao': getStyle('--cui-success') ?? '#4dbd74',
      'dang giao': getStyle('--cui-info') ?? '#00D8FF',
      'đang giao': getStyle('--cui-info') ?? '#00D8FF',
      'dang xu ly': getStyle('--cui-danger') ?? '#f86c6b',
      'đang xử lý': getStyle('--cui-danger') ?? '#f86c6b',
      'đang xử lí': getStyle('--cui-danger') ?? '#f86c6b',
      'cho xu ly': '#DD1B16',
      'chờ xử lý': '#DD1B16',
      'chờ xử lí': '#DD1B16'
    };

    return {
      labels: statuses.map((item: any) => item.statusLabel),
      datasets: [{
        data: statuses.map((item: any) => item.orders),
        backgroundColor: statuses.map((item: any, index: number) => {
          const normalizedStatus = String(item.statusLabel ?? '')
            .trim()
            .toLowerCase();

          return statusColors[normalizedStatus] ?? this.widgetChartCustomerSegmentPalette[index % this.widgetChartCustomerSegmentPalette.length];
        }),
        borderWidth: 0,
        cutout: '68%'
      }]
    };
  });

  readonly orderStatusOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        align: 'center',
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 11 },
          padding: 12,
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels && data.datasets.length) {
              return data.labels.map((label, i) => ({
                text: label as string,
                fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                hidden: false,
                index: i,
                fontColor: '#666',
                lineWidth: 0
              }));
            }
            return [];
          }
        }
      }
    }
  };

  readonly categoryMixChartData = computed<ChartData<'bar'>>(() => {
    const mix = this.dashboard()?.categoryMix ?? [];
    const groupedMix = Object.values(
      mix.reduce((acc: Record<string, { category: string; revenue: number }>, item: any) => {
        const key = item.category ?? 'Khác';

        if (!acc[key]) {
          acc[key] = {
            category: key,
            revenue: 0
          };
        }

        acc[key].revenue += item.revenue ?? 0;
        return acc;
      }, {})
    ) as Array<{ category: string; revenue: number }>;

    groupedMix.sort((a, b) => b.revenue - a.revenue);

    return {
      labels: groupedMix.slice(0, 4).map((item) => item.category),
      datasets: [{
        data: groupedMix.slice(0, 4).map((item) => item.revenue),
        backgroundColor: [
          this.widgetChartPalette.primary,
          this.widgetChartPalette.info,
          this.widgetChartPalette.warning
        ],
        borderRadius: 6
      }]
    };
  });

  readonly categoryMixOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 }, callback: (v) => '$' + (Number(v) / 1000000).toFixed(1) + 'M' } }
    }
  };

  readonly topProductsChartData = computed<ChartData<'bar'>>(() => {
    const products = this.dashboard()?.topProducts ?? [];
    return {
      labels: products.slice(0, 6).map((item: any) => item.productName),
      datasets: [{
        data: products.slice(0, 6).map((item: any) => item.revenue),
        backgroundColor: '#14b8a6',
        borderRadius: 6,
        barThickness: 12
      }]
    };
  });

  readonly topProductsOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 }, callback: (v) => '$' + (Number(v) / 1000).toFixed(0) + 'K' } },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  readonly territoryChartData = computed<ChartData<'bar'>>(() => {
    const territories = this.dashboard()?.salesByTerritory ?? [];
    return {
      labels: territories.slice(0, 5).map((item: any) => item.name),
      datasets: [{
        data: territories.slice(0, 5).map((item: any) => item.revenue),
        backgroundColor: [
          this.widgetChartPalette.primary,
          this.widgetChartPalette.info,
          this.widgetChartPalette.warning
        ],
        borderRadius: 6
      }]
    };
  });

  readonly territoryOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 }, callback: (v) => '$' + (Number(v) / 1000000).toFixed(1) + 'M' } }
    }
  };

  readonly orderGrowthChartData = computed<ChartData<'bar' | 'line'>>(() => {
    const trend = this.dashboard()?.revenueTrend ?? [];
    return {
      labels: trend.map((item: any) => item.period),
      datasets: [
        {
          type: 'bar' as const,
          label: 'Số đơn hàng',
          data: trend.map((item: any) => item.orders),
          backgroundColor: this.barChartColor,
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          type: 'line' as const,
          label: 'Tăng trưởng (%)',
          data: trend.map((item: any) => item.growthRate ?? 0),
          borderColor: this.growthLineColor,
          backgroundColor: 'transparent',
          borderWidth: 3,
          tension: 0.4,
          yAxisID: 'y1',
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: this.growthLineColor,
          pointHoverBorderColor: this.growthLineColor
        }
      ]
    };
  });

  readonly orderGrowthOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        grid: { color: '#eeeeee' },
        ticks: { font: { size: 10 } },
        title: { display: true, text: 'Số đơn hàng', font: { size: 11 } }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { font: { size: 10 }, callback: (v) => v + '%' },
        title: { display: true, text: 'Tăng trưởng (%)', font: { size: 11 } }
      }
    }
  };

  readonly topCustomersChartData = computed<ChartData<'bar'>>(() => {
    const customers = this.dashboard()?.topCustomers ?? [];
    return {
      labels: customers.slice(0, 10).map((item: any) => item.customerName || `KH ${item.customerId}`),
      datasets: [{
        data: customers.slice(0, 10).map((item: any) => item.revenue),
        backgroundColor: '#f59e0b',
        borderRadius: 6,
        barThickness: 14
      }]
    };
  });

  readonly topCustomersOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 }, callback: (v) => '$' + (Number(v) / 1000000).toFixed(1) + 'M' } },
      y: { grid: { display: false }, ticks: { font: { size: 9 } } }
    }
  };

  ngOnInit(): void {
    this.restoreSavedFilter();
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.salesDashboardService.getDashboard(this.filterForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.dashboard.set(response);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Không thể tải dữ liệu Sales Dashboard.');
          this.loading.set(false);
        }
      });
  }

  resetFilters(): void {
    clearDashboardFilter(this.savedFilterStorageKey);
    this.filterForm.reset({ startDate: '2013-01-01', endDate: '2014-12-31', territoryId: null, salesPersonId: null, productCategoryId: null, onlineOrderFlag: null });
    this.loadDashboard();
  }

  formatCompactNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }

  quotaProgress(): number {
    const rate = this.dashboard()?.quota.achievementRate ?? 0;
    return Math.min(Math.max(rate * 100, 0), 100);
  }

  async exportPDF(): Promise<void> {
    const currentDashboard = this.dashboard() as SalesDashboardResponseDto | null;
    if (!currentDashboard) {
      alert('Chưa có dữ liệu để tải báo cáo Sales.');
      return;
    }

    try {
      await exportDashboardPdf({
        title: this.title,
        subtitle: 'Báo cáo theo bộ lọc hiện tại',
        filePrefix: 'SalesDashboard',
        metrics: this.kpiCards(),
        secondaryMetrics: [
          { label: 'Tỷ lệ online', value: currentDashboard.overview.onlineOrderRate, type: 'percent', note: 'Theo bộ lọc hiện tại' },
          { label: 'Tỷ lệ hủy', value: currentDashboard.overview.cancellationRate, type: 'percent', note: 'Theo bộ lọc hiện tại' },
          { label: 'Giao đúng hạn', value: currentDashboard.overview.onTimeShippingRate, type: 'percent', note: 'Theo bộ lọc hiện tại' },
          { label: 'Freight/Revenue', value: currentDashboard.overview.freightRatio, type: 'percent', note: 'Theo bộ lọc hiện tại' }
        ],
        filters: this.describeSalesFilters(currentDashboard),
        sections: [
          {
            title: '01. Xu hướng doanh thu theo bộ lọc',
            subtitle: 'Doanh thu và số đơn theo từng kỳ trong phạm vi đang chọn.',
            headers: ['Kỳ', 'Năm', 'Tháng', 'Doanh thu', 'Đơn hàng'],
            rows: currentDashboard.revenueTrend.slice(0, 12).map(item => [item.period, item.year, item.month, this.formatCurrency(item.revenue), item.orders]),
            widths: ['*', 45, 45, 85, 55]
          },
          {
            title: '02. Doanh số theo nhân viên',
            subtitle: 'Hiệu suất sales person sau khi áp dụng bộ lọc hiện tại.',
            headers: ['Nhân viên', 'Nhóm', 'Doanh thu', 'Đơn hàng', 'Đạt chỉ tiêu'],
            rows: currentDashboard.salesByPerson.slice(0, 10).map(item => [item.name, item.group ?? 'N/A', this.formatCurrency(item.revenue), item.orders, this.formatPercent(item.achievementRate)]),
            widths: ['*', 55, 85, 50, 65]
          },
          {
            title: '03. Doanh số theo vùng',
            subtitle: 'Các vùng doanh thu chính theo bộ lọc hiện tại.',
            headers: ['Vùng', 'Nhóm', 'Doanh thu', 'Đơn hàng'],
            rows: currentDashboard.salesByTerritory.slice(0, 10).map(item => [item.name, item.group ?? 'N/A', this.formatCurrency(item.revenue), item.orders]),
            widths: ['*', 65, 90, 55]
          },
          {
            title: '04. Top sản phẩm bán chạy',
            subtitle: 'Sản phẩm có doanh thu cao trong dữ liệu đã lọc.',
            headers: ['Sản phẩm', 'Danh mục', 'Doanh thu', 'SL bán', 'Giảm giá'],
            rows: currentDashboard.topProducts.slice(0, 10).map(item => [item.productName, item.category, this.formatCurrency(item.revenue), item.unitsSold, this.formatCurrency(item.discountAmount)]),
            widths: ['*', 70, 80, 50, 70]
          },
          {
            title: '05. Phân khúc khách hàng',
            subtitle: 'Cơ cấu doanh thu theo phân khúc khách hàng.',
            headers: ['Phân khúc', 'Doanh thu', 'Đơn hàng', 'Khách hàng'],
            rows: currentDashboard.customerSegments.map(item => [item.segment, this.formatCurrency(item.revenue), item.orders, item.customers]),
            widths: ['*', 90, 55, 65]
          },
          {
            title: '06. Lý do bán hàng',
            subtitle: 'Sales reason đóng góp doanh thu trong bộ lọc hiện tại.',
            headers: ['Lý do', 'Loại', 'Doanh thu', 'Đơn hàng'],
            rows: currentDashboard.salesReasons.slice(0, 10).map(item => [item.name, item.reasonType, this.formatCurrency(item.revenue), item.orders]),
            widths: ['*', 65, 90, 55]
          }
        ]
      });
    } catch (error) {
      console.error('Không thể tạo PDF dashboard Sales', error);
      alert('Không thể tạo file PDF. Vui lòng thử lại.');
    }
  }

  private describeSalesFilters(dashboard: SalesDashboardResponseDto): string[] {
    const filters = dashboard.filters;
    const territory = dashboard.filterOptions.territories.find(item => item.id === filters.territoryId)?.name ?? 'Tất cả';
    const salesPerson = dashboard.filterOptions.salesPeople.find(item => item.id === filters.salesPersonId)?.name ?? 'Tất cả';
    const category = dashboard.filterOptions.categories.find(item => item.id === filters.productCategoryId)?.name ?? 'Tất cả';
    const onlineOrder = filters.onlineOrderFlag == null ? 'Tất cả' : filters.onlineOrderFlag ? 'Online' : 'Offline';

    return [
      `Thời gian: ${this.formatReportDate(filters.startDate)} - ${this.formatReportDate(filters.endDate)}`,
      `Vùng: ${territory}`,
      `Nhân viên bán hàng: ${salesPerson}`,
      `Danh mục sản phẩm: ${category}`,
      `Kênh đơn hàng: ${onlineOrder}`
    ];
  }

  private formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value ?? 0));
  }

  private formatPercent(value: number | null | undefined): string {
    const numericValue = Number(value ?? 0);
    return new Intl.NumberFormat('vi-VN', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(numericValue > 1 ? numericValue / 100 : numericValue);
  }

  private formatReportDate(value: string | null | undefined): string {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
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

  saveFilter(): void {
    saveDashboardFilter(this.savedFilterStorageKey, this.filterForm.getRawValue());
    this.loadDashboard();
  }
  private restoreSavedFilter(): void {
    this.filterForm.patchValue(restoreDashboardFilter(this.savedFilterStorageKey, { startDate: '2013-01-01', endDate: '2014-12-31', territoryId: null, salesPersonId: null, productCategoryId: null, onlineOrderFlag: null }));
  }

}
