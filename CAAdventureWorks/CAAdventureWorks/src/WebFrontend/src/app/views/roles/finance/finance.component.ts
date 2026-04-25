import { CommonModule, CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
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
  FormControlDirective,
  FormLabelDirective,
  FormSelectDirective,
  RowComponent,
  TemplateIdDirective,
  WidgetStatAComponent
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import { FinanceDashboardService } from './finance-dashboard.service';

@Component({
  selector: 'app-finance',
  standalone: true,
  templateUrl: './finance.component.html',
  styleUrls: ['./finance.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FormLabelDirective,
    FormControlDirective,
    FormSelectDirective,
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
export class FinanceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly financeDashboardService = inject(FinanceDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly widgetChartPalette = {
    primary: getStyle('--cui-primary'),
    success: getStyle('--cui-success'),
    danger: getStyle('--cui-danger'),
    warning: getStyle('--cui-warning'),
    info: getStyle('--cui-info')
  };

  readonly title = 'Finance';
  readonly subtitle = 'Dashboard';

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<any>(null);

  readonly filterForm = this.fb.group({
    startDate: ['2011-01-01'],
    endDate: ['2014-12-31'],
    territoryId: [null as number | null]
  });

  readonly kpiCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { 
        label: 'Tổng doanh thu', 
        value: overview.totalRevenue, 
        format: 'currency', 
        color: 'success',
        bgColor: 'rgba(46, 184, 92, 0.1)',
        icon: 'cilArrowTop'
      },
      { 
        label: 'Tổng chi phí', 
        value: overview.totalExpense, 
        format: 'currency', 
        color: 'danger',
        bgColor: 'rgba(229, 83, 83, 0.1)',
        icon: 'cilArrowBottom'
      },
      { 
        label: 'Lợi nhuận', 
        value: overview.grossProfit, 
        format: 'currency', 
        color: 'primary',
        bgColor: 'rgba(102, 126, 234, 0.1)',
        icon: 'cilDollar'
      },
      { 
        label: 'Biên lợi nhuận', 
        value: overview.profitMargin, 
        format: 'percent', 
        color: 'info',
        bgColor: 'rgba(57, 170, 255, 0.1)',
        icon: 'cilChartLine'
      }
    ];
  });

  readonly revenueTrendChartData = computed<ChartData<'line'>>(() => {
    const trend = this.dashboard()?.revenueTrend ?? [];
    return {
      labels: trend.map((item: any) => item.period),
      datasets: [{
        label: 'Doanh thu',
        data: trend.map((item: any) => item.amount),
        borderColor: '#2eb85c',
        backgroundColor: 'rgba(46, 184, 92, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    };
  });

  readonly expenseTrendChartData = computed<ChartData<'line'>>(() => {
    const trend = this.dashboard()?.expenseTrend ?? [];
    return {
      labels: trend.map((item: any) => item.period),
      datasets: [{
        label: 'Chi phí',
        data: trend.map((item: any) => item.amount),
        borderColor: '#e55353',
        backgroundColor: 'rgba(229, 83, 83, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    };
  });

  readonly profitTrendChartData = computed<ChartData<'line'>>(() => {
    const trend = this.dashboard()?.profitTrend ?? [];
    return {
      labels: trend.map((item: any) => item.period),
      datasets: [{
        label: 'Lợi nhuận',
        data: trend.map((item: any) => item.amount),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    };
  });

  readonly cashFlowChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.cashFlow ?? [];
    return {
      labels: items.map((item: any) => item.period),
      datasets: [
        {
          label: 'Thu',
          data: items.map((item: any) => item.cashIn),
          backgroundColor: '#2eb85c',
          borderRadius: 4
        },
        {
          label: 'Chi',
          data: items.map((item: any) => item.cashOut),
          backgroundColor: '#e55353',
          borderRadius: 4
        }
      ]
    };
  });

  readonly taxChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.taxByRegion ?? [];
    const top10 = items.slice(0, 10);
    return {
      labels: top10.map((item: any) => item.stateProvinceName),
      datasets: [{
        label: 'Thuế',
        data: top10.map((item: any) => item.totalTax),
        backgroundColor: '#f9b115',
        borderRadius: 4
      }]
    };
  });

  readonly currencyChartData = computed<ChartData<'doughnut'>>(() => {
    const items = this.dashboard()?.revenueByCurrency ?? [];
    return {
      labels: items.map((item: any) => item.currencyCode),
      datasets: [{
        data: items.map((item: any) => item.totalRevenue),
        backgroundColor: ['#667eea', '#2eb85c', '#f9b115', '#e55353', '#39f', '#764ba2'],
        borderWidth: 0
      }]
    };
  });

  readonly paymentChartData = computed<ChartData<'pie'>>(() => {
    const items = this.dashboard()?.paymentMethods ?? [];
    return {
      labels: items.map((item: any) => item.paymentMethod),
      datasets: [{
        data: items.map((item: any) => item.totalAmount),
        backgroundColor: ['#2eb85c', '#667eea', '#f9b115', '#e55353', '#39f'],
        borderWidth: 0
      }]
    };
  });

  readonly lineChartOptions: ChartOptions<'line'> = {
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
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 }, callback: (v) => '$' + (Number(v) / 1000000).toFixed(1) + 'M' }
      }
    }
  };

  readonly barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 }, callback: (v) => '$' + (Number(v) / 1000000).toFixed(1) + 'M' }
      }
    }
  };

  readonly pieChartOptions: ChartOptions<'pie' | 'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        align: 'center',
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 11 },
          padding: 12
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

    const filter = this.filterForm.value;

    this.financeDashboardService.getDashboard(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.dashboard.set(data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading finance dashboard:', error);
          this.errorMessage.set('Không thể tải dữ liệu dashboard. Vui lòng thử lại.');
          this.loading.set(false);
        }
      });
  }

  applyFilters(): void {
    this.loadDashboard();
  }

  resetFilters(): void {
    this.filterForm.patchValue({
      startDate: '2011-01-01',
      endDate: '2014-12-31',
      territoryId: null
    });
    this.loadDashboard();
  }

  formatCompactNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }

  exportPDF(): void {
    console.log('Exporting dashboard to PDF...');
    alert('Chức năng xuất PDF đang được phát triển');
  }

  customizeLayout(): void {
    console.log('Customizing dashboard layout...');
    alert('Chức năng tùy chỉnh layout đang được phát triển');
  }

  saveFilter(): void {
    console.log('Saving current filter settings...');
    alert('Chức năng lưu bộ lọc đang được phát triển');
  }
}
