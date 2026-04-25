import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
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
  DropdownComponent,
  DropdownDividerDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownToggleDirective,
  FormControlDirective,
  FormLabelDirective,
  FormSelectDirective,
  RowComponent,
  TemplateIdDirective,
  WidgetStatAComponent
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import { SalesDashboardService } from './sales-dashboard.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    DropdownComponent,
    DropdownDividerDirective,
    DropdownItemDirective,
    DropdownMenuDirective,
    DropdownToggleDirective,
    FormLabelDirective,
    FormControlDirective,
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
    this.filterForm.reset({
      startDate: '2013-01-01',
      endDate: '2014-12-31',
      territoryId: null,
      salesPersonId: null,
      productCategoryId: null,
      onlineOrderFlag: null
    });

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

  exportPDF(): void {
    console.log('Exporting dashboard to PDF...');
    // TODO: Implement PDF export functionality
    alert('Chức năng xuất PDF đang được phát triển');
  }

  customizeLayout(): void {
    console.log('Customizing dashboard layout...');
    alert('Chức năng tùy chỉnh layout đang được phát triển');
  }

  saveFilter(): void {
    console.log('Saving current filter settings...');
    // TODO: Implement filter save functionality
    alert('Chức năng lưu bộ lọc đang được phát triển');
  }
}
