import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
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
  TableDirective,
  TemplateIdDirective,
  WidgetStatAComponent
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import { ISDashboardResponseDto, ISDashboardService } from './is-dashboard.service';
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';
import { clearDashboardFilter, restoreDashboardFilter, saveDashboardFilter } from '../shared/filter-storage';
import { exportDashboardPdf } from '../shared/dashboard-pdf-export';

export interface ChartDef {
  id: string;
  label: string;
}

@Component({
  selector: 'app-information-services',
  standalone: true,
  templateUrl: './information-services.component.html',
  styleUrls: ['./information-services.component.scss'],
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
    FormSelectDirective,
    ButtonDirective,
    ChartjsComponent,
    IconDirective,
    TableDirective,
    TemplateIdDirective,
    WidgetStatAComponent,
    DatePipe,
    DecimalPipe
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

  readonly savedFilterStorageKey = 'information_services_saved_filter';
  readonly gridsterStorageKey = 'is_grid_layout';
  readonly hiddenChartsStorageKey = 'is_hidden_charts';

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
    { id: 'error-trend', label: 'Xu hướng lỗi hệ thống' },
    { id: 'top-errors', label: 'Top lỗi phổ biến' },
    { id: 'event-type-distribution', label: 'Phân loại sự kiện DB' },
    { id: 'user-accounts', label: 'Tài khoản theo phòng ban' },
    { id: 'password-age-distribution', label: 'Phân bố tuổi mật khẩu' }
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
      { id: 'error-trend', cols: 8, rows: 6, x: 0, y: 0 },
      { id: 'event-type-distribution', cols: 4, rows: 6, x: 8, y: 0 },
      { id: 'top-errors', cols: 6, rows: 5, x: 0, y: 6 },
      { id: 'user-accounts', cols: 6, rows: 5, x: 6, y: 6 },
      { id: 'password-age-distribution', cols: 12, rows: 5, x: 0, y: 11 }
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
    const fallbackTrend = [
      { period: 'Tuần 1', errorCount: 0 },
      { period: 'Tuần 2', errorCount: 0 },
      { period: 'Tuần 3', errorCount: 0 },
      { period: 'Tuần 4', errorCount: 0 }
    ];
    const chartItems = trend.length > 0 ? trend : fallbackTrend;

    return {
      labels: chartItems.map((item: any) => item.period),
      datasets: [{
        label: 'Số lỗi',
        data: chartItems.map((item: any) => item.errorCount),
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
    const fallbackErrors = [
      { errorNumber: 0, errorCount: 0, errorMessage: 'Không có lỗi' }
    ];
    const chartItems = (items.length > 0 ? items : fallbackErrors).slice(0, 8);

    return {
      labels: chartItems.map((item: any) => item.errorNumber ? `Error ${item.errorNumber}` : item.errorMessage),
      datasets: [{
        data: chartItems.map((item: any) => item.errorCount),
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
    const fallbackEvents = [
      { eventType: 'Không có dữ liệu', eventCount: 1 }
    ];
    const chartItems = items.length > 0 ? items : fallbackEvents;

    return {
      labels: chartItems.map((item: any) => item.eventType),
      datasets: [{
        data: chartItems.map((item: any) => item.eventCount),
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
    this.restoreSavedFilter();
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
    clearDashboardFilter(this.savedFilterStorageKey);
    this.filterForm.reset({ startDate: this.getDefaultStartDate(), endDate: this.getDefaultEndDate(), departmentId: null, errorNumber: null });
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

  async exportPDF(): Promise<void> {
    const currentDashboard = this.dashboard() as ISDashboardResponseDto | null;
    if (!currentDashboard) {
      alert('Chưa có dữ liệu để tải báo cáo Information Services.');
      return;
    }

    try {
      await exportDashboardPdf({
        title: 'Information Services',
        subtitle: 'Báo cáo theo bộ lọc hiện tại',
        filePrefix: 'InformationServicesDashboard',
        metrics: this.kpiCards(),
        secondaryMetrics: this.systemInfoCards().map(item => ({
          ...item,
          value: item.type === 'date' ? this.formatReportDate(String(item.value ?? '')) : item.value
        })),
        filters: this.describeIsFilters(currentDashboard),
        sections: [
          {
            title: '01. Xu hướng lỗi hệ thống theo bộ lọc',
            subtitle: 'Số lỗi hệ thống theo từng kỳ trong phạm vi ngày, phòng ban và mã lỗi đang chọn.',
            headers: ['Kỳ', 'Năm', 'Tháng', 'Ngày', 'Số lỗi'],
            rows: currentDashboard.errorTrend.slice(0, 14).map(item => [item.period, item.year, item.month, item.day, item.errorCount]),
            widths: ['*', 45, 45, 45, 60]
          },
          {
            title: '02. Top lỗi phổ biến',
            subtitle: 'Các mã lỗi xuất hiện nhiều nhất sau khi áp dụng bộ lọc hiện tại.',
            headers: ['Mã lỗi', 'Thông điệp lỗi', 'Số lần', 'Lần cuối'],
            rows: currentDashboard.topErrors.slice(0, 10).map(item => [item.errorNumber, item.errorMessage, item.errorCount, this.formatReportDateTime(item.lastOccurrence)]),
            widths: [55, '*', 55, 85]
          },
          {
            title: '03. Người dùng phát sinh lỗi nhiều nhất',
            subtitle: 'Tài khoản có nhiều lỗi hệ thống trong phạm vi dữ liệu đã lọc.',
            headers: ['Người dùng', 'Số lỗi', 'Lỗi gần nhất'],
            rows: currentDashboard.usersWithMostErrors.slice(0, 10).map(item => [item.userName, item.errorCount, this.formatReportDateTime(item.lastError)]),
            widths: ['*', 55, 95]
          },
          {
            title: '04. Hoạt động cơ sở dữ liệu',
            subtitle: 'Các thao tác DB theo người dùng và loại sự kiện trong bộ lọc hiện tại.',
            headers: ['DB user', 'Sự kiện', 'Số lần', 'Lần cuối'],
            rows: currentDashboard.databaseActivity.slice(0, 10).map(item => [item.databaseUser, item.event, item.activityCount, this.formatReportDateTime(item.lastActivity)]),
            widths: ['*', '*', 55, 95]
          },
          {
            title: '05. Phân loại sự kiện DB',
            subtitle: 'Tỷ trọng từng loại sự kiện trong dữ liệu đã lọc.',
            headers: ['Loại sự kiện', 'Số lượng', 'Tỷ lệ'],
            rows: currentDashboard.eventTypeDistribution.map(item => [item.eventType, item.eventCount, this.formatPercent(item.percentage)]),
            widths: ['*', 70, 60]
          },
          {
            title: '06. Tài khoản theo phòng ban',
            subtitle: 'Tổng tài khoản và tài khoản hoạt động theo phòng ban đang áp dụng.',
            headers: ['Phòng ban', 'Tổng TK', 'TK hoạt động'],
            rows: currentDashboard.userAccountsByDepartment.slice(0, 12).map(item => [item.departmentName, item.userCount, item.activeUserCount]),
            widths: ['*', 65, 75]
          },
          {
            title: '07. Phân bố tuổi mật khẩu',
            subtitle: 'Nhóm tuổi mật khẩu của tài khoản theo bộ lọc hiện tại.',
            headers: ['Nhóm tuổi mật khẩu', 'Số tài khoản', 'Tỷ lệ'],
            rows: currentDashboard.passwordAgeDistribution.map(item => [item.ageRange, item.userCount, this.formatPercent(item.percentage)]),
            widths: ['*', 80, 60]
          }
        ]
      });
    } catch (error) {
      console.error('Không thể tạo PDF dashboard Information Services', error);
      alert('Không thể tạo file PDF. Vui lòng thử lại.');
    }
  }

  private describeIsFilters(dashboard: ISDashboardResponseDto): string[] {
    const filters = dashboard.filters;
    const department = dashboard.filterOptions.departments.find(item => item.id === filters.departmentId)?.name ?? 'Tất cả';
    const errorNumber = dashboard.filterOptions.errorNumbers.find(item => item.id === filters.errorNumber)?.name ?? filters.errorNumber ?? 'Tất cả';

    return [
      `Thời gian: ${this.formatReportDate(filters.startDate)} - ${this.formatReportDate(filters.endDate)}`,
      `Phòng ban: ${department}`,
      `Mã lỗi: ${errorNumber}`
    ];
  }

  private formatPercent(value: number | null | undefined): string {
    const numericValue = Number(value ?? 0);
    const normalizedValue = numericValue > 1 ? numericValue / 100 : numericValue;
    return new Intl.NumberFormat('vi-VN', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(normalizedValue);
  }

  private formatReportDate(value: string | null | undefined): string {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  private formatReportDateTime(value: string | null | undefined): string {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  }

  customizeLayout(): void { this.toggleEditMode(); }

  saveFilter(): void {
    saveDashboardFilter(this.savedFilterStorageKey, this.filterForm.getRawValue());
    this.loadDashboard();
  }
  private restoreSavedFilter(): void {
    this.filterForm.patchValue(restoreDashboardFilter(this.savedFilterStorageKey, { startDate: this.getDefaultStartDate(), endDate: this.getDefaultEndDate(), departmentId: null, errorNumber: null }));
  }

}
