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
import { HRDashboardService } from './hr-dashboard.service';
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';

export interface ChartDef {
  id: string;
  label: string;
}

@Component({
  selector: 'app-human-resources',
  standalone: true,
  templateUrl: './human-resources.component.html',
  styleUrls: ['./human-resources.component.scss'],
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
    DecimalPipe
  ]
})
export class HumanResourcesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly hrDashboardService = inject(HRDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly widgetChartPalette = {
    primary: getStyle('--cui-primary') ?? '#5856d6',
    info: getStyle('--cui-info') ?? '#39f',
    warning: getStyle('--cui-warning') ?? '#f9b115',
    success: getStyle('--cui-success') ?? '#2eb85c'
  };

  private readonly donutPalette = ['#667eea', '#36A2EB', '#FFCE56', '#ff8a65', '#14b8a6'];
  private readonly barChartColor = '#f87979';
  private readonly growthLineColor = getStyle('--cui-info') ?? '#00D8FF';

  readonly title = 'Human Resources';
  readonly subtitle = 'Dashboard';

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<any>(null);

  readonly gridsterStorageKey = 'hr_grid_layout';
  readonly hiddenChartsStorageKey = 'hr_hidden_charts';

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
    { id: 'employee-trend', label: 'Xu hướng tuyển dụng' },
    { id: 'gender-distribution', label: 'Phân bố giới tính' },
    { id: 'department-distribution', label: 'Nhân viên theo phòng ban' },
    { id: 'job-title-distribution', label: 'Top chức danh' },
    { id: 'pay-rate-comparison', label: 'Mức lương theo phòng ban' },
    { id: 'shift-distribution', label: 'Phân bố ca làm việc' },
    { id: 'tenure-distribution', label: 'Thâm niên nhân viên' }
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
      { id: 'employee-trend', cols: 8, rows: 6, x: 0, y: 0 },
      { id: 'gender-distribution', cols: 4, rows: 6, x: 8, y: 0 },
      { id: 'tenure-distribution', cols: 4, rows: 5, x: 0, y: 6 },
      { id: 'pay-rate-comparison', cols: 4, rows: 5, x: 4, y: 6 },
      { id: 'shift-distribution', cols: 4, rows: 5, x: 8, y: 6 },
      { id: 'department-distribution', cols: 6, rows: 5, x: 0, y: 11 },
      { id: 'job-title-distribution', cols: 6, rows: 5, x: 6, y: 11 }
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
    startDate: ['2009-01-01'],
    endDate: ['2014-12-31'],
    departmentId: [null as number | null],
    gender: [null as string | null],
    salariedOnly: [null as boolean | null],
    activeOnly: [true as boolean | null]
  });

  readonly kpiCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Tổng nhân viên', value: overview.totalEmployees, format: 'number' },
      { label: 'NV hoạt động', value: overview.activeEmployees, format: 'number' },
      { label: 'Số phòng ban', value: overview.totalDepartments, format: 'number' },
      { label: 'Lương TB/giờ', value: overview.averagePayRate, format: 'currency' }
    ];
  });

  readonly employeeTrendChartData = computed<ChartData<'line'>>(() => {
    const trend = this.dashboard()?.employeeTrend ?? [];

    return {
      labels: trend.map((item: any) => item.period),
      datasets: [
        {
          label: 'Tuyển mới',
          data: trend.map((item: any) => item.newHires),
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

  readonly employeeTrendOptions: ChartOptions<'line'> = {
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
      y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { font: { size: 10 } } }
    }
  };

  readonly genderChartData = computed<ChartData<'doughnut'>>(() => {
    const items = this.dashboard()?.genderDistribution ?? [];

    return {
      labels: items.map((item: any) => item.genderLabel),
      datasets: [{
        data: items.map((item: any) => item.employeeCount),
        backgroundColor: items.map((_: any, index: number) => this.donutPalette[index % this.donutPalette.length]),
        borderWidth: 0
      }]
    };
  });

  readonly genderChartOptions: ChartOptions<'doughnut'> = {
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

  readonly departmentChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.employeesByDepartment ?? [];

    return {
      labels: items.slice(0, 8).map((item: any) => item.departmentName),
      datasets: [{
        data: items.slice(0, 8).map((item: any) => item.employeeCount),
        backgroundColor: [
          this.widgetChartPalette.primary,
          this.widgetChartPalette.info,
          this.widgetChartPalette.warning,
          this.widgetChartPalette.success
        ],
        borderRadius: 6
      }]
    };
  });

  readonly departmentChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  readonly jobTitleChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.topJobTitles ?? [];

    return {
      labels: items.slice(0, 6).map((item: any) => item.jobTitle),
      datasets: [{
        data: items.slice(0, 6).map((item: any) => item.employeeCount),
        backgroundColor: '#14b8a6',
        borderRadius: 6,
        barThickness: 12
      }]
    };
  });

  readonly jobTitleChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  readonly payRateChartData = computed<ChartData<'bar' | 'line'>>(() => {
    const items = this.dashboard()?.payRateByDepartment ?? [];

    return {
      labels: items.slice(0, 6).map((item: any) => item.departmentName),
      datasets: [
        {
          label: 'Min',
          data: items.slice(0, 6).map((item: any) => item.minPayRate),
          backgroundColor: this.barChartColor,
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          type: 'line' as const,
          label: 'Avg',
          data: items.slice(0, 6).map((item: any) => item.averagePayRate),
          borderColor: this.growthLineColor,
          backgroundColor: 'transparent',
          borderWidth: 3,
          tension: 0.4,
          yAxisID: 'y',
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: this.growthLineColor,
          pointHoverBorderColor: this.growthLineColor
        },
        {
          label: 'Max',
          data: items.slice(0, 6).map((item: any) => item.maxPayRate),
          backgroundColor: this.widgetChartPalette.warning,
          borderRadius: 4,
          yAxisID: 'y'
        }
      ]
    };
  });

  readonly payRateChartOptions: ChartOptions<'bar' | 'line'> = {
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
        ticks: {
          font: { size: 10 },
          callback: (value) => '$' + Number(value).toFixed(0)
        },
        title: { display: true, text: 'Pay rate', font: { size: 11 } }
      }
    }
  };

  readonly shiftChartData = computed<ChartData<'doughnut'>>(() => {
    const items = this.dashboard()?.shiftDistribution ?? [];

    return {
      labels: items.map((item: any) => item.shiftName),
      datasets: [{
        data: items.map((item: any) => item.employeeCount),
        backgroundColor: items.map((_: any, index: number) => this.donutPalette[index % this.donutPalette.length]),
        borderWidth: 0
      }]
    };
  });

  readonly shiftChartOptions: ChartOptions<'doughnut'> = {
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

  readonly tenureChartData = computed<ChartData<'bar'>>(() => {
    const items = this.dashboard()?.employeeTenure ?? [];

    return {
      labels: items.map((item: any) => item.tenureRange),
      datasets: [{
        data: items.map((item: any) => item.employeeCount),
        backgroundColor: [
          this.widgetChartPalette.primary,
          this.widgetChartPalette.info,
          this.widgetChartPalette.warning,
          this.widgetChartPalette.success
        ],
        borderRadius: 6
      }]
    };
  });

  readonly tenureChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } }
    }
  };

  readonly healthCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Nghỉ phép TB', value: overview.averageVacationHours, suffix: ' giờ' },
      { label: 'Nghỉ ốm TB', value: overview.averageSickLeaveHours, suffix: ' giờ' },
      { label: 'Thâm niên TB', value: overview.averageTenureYears, suffix: ' năm' },
      { label: 'NV lương tháng', value: overview.salariedEmployees, suffix: '' }
    ];
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.hrDashboardService.getDashboard(this.filterForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.dashboard.set(response);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Không thể tải dữ liệu HR Dashboard.');
          this.loading.set(false);
        }
      });
  }

  resetFilters(): void {
    this.filterForm.reset({
      startDate: '2009-01-01',
      endDate: '2014-12-31',
      departmentId: null,
      gender: null,
      salariedOnly: null,
      activeOnly: true
    });

    this.loadDashboard();
  }

  exportPDF(): void {
    console.log('Exporting HR dashboard to PDF...');
    alert('Chức năng xuất PDF đang được phát triển');
  }

  customizeLayout(): void { this.toggleEditMode(); }

  saveFilter(): void {
    console.log('Saving HR dashboard filters...');
    alert('Chức năng lưu bộ lọc đang được phát triển');
  }
}
