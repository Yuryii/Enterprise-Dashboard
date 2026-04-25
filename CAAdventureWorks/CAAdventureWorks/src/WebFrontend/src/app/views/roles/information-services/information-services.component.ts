import { CommonModule, DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
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
  TableDirective,
  TemplateIdDirective,
  WidgetStatAComponent
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import { ISDashboardService } from './is-dashboard.service';

@Component({
  selector: 'app-information-services',
  standalone: true,
  templateUrl: './information-services.component.html',
  styleUrls: ['./information-services.component.scss'],
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
    TableDirective,
    TemplateIdDirective,
    WidgetStatAComponent,
    DatePipe,
    DecimalPipe,
    PercentPipe
  ]
})
export class InformationServicesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly isDashboardService = inject(ISDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly widgetChartPalette = {
    primary: getStyle('--cui-primary'),
    danger: getStyle('--cui-danger'),
    warning: getStyle('--cui-warning'),
    info: getStyle('--cui-info')
  };

  readonly title = 'Information Services';
  readonly subtitle = 'Dashboard';

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<any>(null);

  readonly filterForm = this.fb.group({
    startDate: [this.getDefaultStartDate()],
    endDate: [this.getDefaultEndDate()],
    departmentId: [null as number | null],
    errorNumber: [null as number | null]
  });

  readonly kpiCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Lỗi hệ thống', value: overview.totalSystemErrors, format: 'number', accent: 'danger', icon: 'cilWarning' },
      { label: 'Thay đổi DB', value: overview.totalDatabaseChanges, format: 'number', accent: 'warning', icon: 'cilStorage' },
      { label: 'Tài khoản', value: overview.totalUserAccounts, format: 'number', accent: 'info', icon: 'cilUser' },
      { label: 'TK hoạt động', value: overview.activeUserAccounts, format: 'number', accent: 'success', icon: 'cilCheckCircle' }
    ];
  });

  readonly systemInfoCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Phòng ban', value: overview.totalDepartments, type: 'number' },
      { label: 'Đổi MK gần đây', value: overview.recentPasswordChanges, type: 'number' },
      { label: 'Phiên bản DB', value: overview.currentDatabaseVersion, type: 'text' },
      { label: 'Cập nhật lần cuối', value: overview.lastDatabaseUpdate, type: 'date' }
    ];
  });

  readonly errorTrendChartData = computed<ChartData<'line'>>(() => {
    const trend = this.dashboard()?.errorTrend ?? [];
    return {
      labels: trend.map((item: any) => item.period),
      datasets: [{
        label: 'Số lỗi',
        data: trend.map((item: any) => item.errorCount),
        borderColor: '#dc3545',
        backgroundColor: 'rgba(220, 53, 69, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  });

  readonly errorTrendOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#dc3545',
        borderWidth: 1
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, beginAtZero: true }
    }
  };

  readonly topErrorsChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.topErrors ?? [];
    return {
      labels: items.slice(0, 8).map((item: any) => `Error ${item.errorNumber}`),
      datasets: [{
        data: items.slice(0, 8).map((item: any) => item.errorCount),
        backgroundColor: '#dc3545',
        borderRadius: 6,
        barThickness: 18
      }]
    };
  });

  readonly topErrorsChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  readonly eventTypeChartData = computed<ChartData<'doughnut'>>(() => {
    const items = this.dashboard()?.eventTypeDistribution ?? [];
    return {
      labels: items.map((item: any) => item.eventType),
      datasets: [{
        data: items.map((item: any) => item.eventCount),
        backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'],
        borderWidth: 0
      }]
    };
  });

  readonly eventTypeChartOptions: ChartOptions<'doughnut'> = {
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
          padding: 12
        }
      }
    }
  };

  readonly userAccountsChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.userAccountsByDepartment ?? [];
    return {
      labels: items.map((item: any) => item.departmentName),
      datasets: [
        { 
          label: 'Tổng TK', 
          data: items.map((item: any) => item.userCount), 
          backgroundColor: '#667eea', 
          borderRadius: 6 
        },
        { 
          label: 'TK hoạt động', 
          data: items.map((item: any) => item.activeUserCount), 
          backgroundColor: '#11998e', 
          borderRadius: 6 
        }
      ]
    };
  });

  readonly userAccountsChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } }
    }
  };

  readonly passwordAgeChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.passwordAgeDistribution ?? [];
    return {
      labels: items.map((item: any) => item.ageRange),
      datasets: [{
        label: 'Số tài khoản',
        data: items.map((item: any) => item.userCount),
        backgroundColor: '#ffc107',
        borderRadius: 6
      }]
    };
  });

  readonly passwordAgeChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } }
    }
  };

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.isDashboardService.getDashboard(this.filterForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.dashboard.set(response);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Không thể tải dữ liệu IS Dashboard.');
          this.loading.set(false);
        }
      });
  }

  resetFilters(): void {
    this.filterForm.reset({
      startDate: this.getDefaultStartDate(),
      endDate: this.getDefaultEndDate(),
      departmentId: null,
      errorNumber: null
    });
    this.loadDashboard();
  }

  private getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  private getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
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
