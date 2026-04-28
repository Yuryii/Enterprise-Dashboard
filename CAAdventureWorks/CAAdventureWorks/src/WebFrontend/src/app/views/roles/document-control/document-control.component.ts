import { CommonModule, DecimalPipe } from '@angular/common';
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
  FormLabelDirective,
  FormSelectDirective,
  RowComponent,
  TableDirective,
  TemplateIdDirective,
  WidgetStatAComponent
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import { DocumentControlDashboardResponseDto, DocumentControlDashboardService } from './document-control-dashboard.service';
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';
import { clearDashboardFilter, restoreDashboardFilter, saveDashboardFilter } from '../shared/filter-storage';
import { exportDashboardPdf } from '../shared/dashboard-pdf-export';

export interface ChartDef {
  id: string;
  label: string;
}

@Component({
  selector: 'app-document-control',
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
    FormLabelDirective,
    FormSelectDirective,
    ButtonDirective,
    ChartjsComponent,
    IconDirective,
    TemplateIdDirective,
    WidgetStatAComponent,
    DecimalPipe,
    TableDirective
  ],
  templateUrl: './document-control.component.html',
  styleUrl: './document-control.component.scss'
})
export class DocumentControlComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly documentControlDashboardService = inject(DocumentControlDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly widgetChartPalette = {
    primary: getStyle('--cui-primary') ?? '#5856d6',
    info: getStyle('--cui-info') ?? '#39f',
    warning: getStyle('--cui-warning') ?? '#f9b115',
    success: getStyle('--cui-success') ?? '#2eb85c',
    danger: getStyle('--cui-danger') ?? '#e55353'
  };

  private readonly statusColors = ['#4dbd74', '#ffc107', '#20a8d8', '#f86c6b'];
  private readonly fileTypeColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

  readonly title = 'Document Control';
  readonly subtitle = 'Dashboard';

  readonly loading = signal(false);
  readonly includeAiAssessment = signal(false);
  readonly aiAssessmentLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<any>(null);

  private readonly savedFilterStorageKey = 'document_control_saved_filter';
  readonly gridsterStorageKey = 'doc_control_grid_layout';
  private readonly hiddenChartsStorageKey = 'doc_control_hidden_charts';

  readonly isEditMode = signal(false);

  readonly gridsterOptions = signal<GridsterConfig>({
    draggable: { enabled: false },
    resizable: { enabled: false },
    pushItems: true,
    minCols: 12,
    maxCols: 12,
    minRows: 26,
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
    { id: 'document-status', label: 'Trạng thái tài liệu' },
    { id: 'file-type-distribution', label: 'Phân bổ theo loại file' },
    { id: 'top-products', label: 'Top sản phẩm' },
    { id: 'top-owners', label: 'Top chủ sở hữu' },
    { id: 'coverage-trend', label: 'Xu hướng coverage' },
    { id: 'recent-revisions', label: 'Sửa đổi gần đây' },
    { id: 'pending-approvals', label: 'Chờ phê duyệt' },
    { id: 'missing-documents', label: 'Sản phẩm thiếu tài liệu' }
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
      { id: 'document-status', cols: 4, rows: 5, x: 0, y: 0 },
      { id: 'file-type-distribution', cols: 4, rows: 5, x: 4, y: 0 },
      { id: 'coverage-trend', cols: 4, rows: 5, x: 8, y: 0 },
      { id: 'top-products', cols: 6, rows: 5, x: 0, y: 5 },
      { id: 'top-owners', cols: 6, rows: 5, x: 6, y: 5 },
      { id: 'recent-revisions', cols: 6, rows: 5, x: 0, y: 10 },
      { id: 'pending-approvals', cols: 6, rows: 5, x: 6, y: 10 },
      { id: 'missing-documents', cols: 12, rows: 5, x: 0, y: 15 }
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
    status: [null as number | null],
    fileExtension: [null as string | null]
  });

  readonly kpiCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Tổng tài liệu', value: overview.totalDocuments, format: 'number' },
      { label: 'Đã phê duyệt', value: overview.approvedDocuments, format: 'number' },
      { label: 'Chờ duyệt', value: overview.pendingDocuments, format: 'number' },
      { label: 'Tỷ lệ phủ', value: overview.documentCoverageRate * 100, format: 'percent' }
    ];
  });

  readonly summaryCards = computed(() => {
    const overview = this.dashboard()?.overview;
    if (!overview) return [];

    return [
      { label: 'Tổng thư mục', value: overview.totalFolders, suffix: '' },
      { label: 'Tổng tệp', value: overview.totalFiles, suffix: '' },
      { label: 'SP có tài liệu', value: overview.productsWithDocuments, suffix: '' },
      { label: 'SP thiếu tài liệu', value: overview.productsWithoutDocuments, suffix: '' }
    ];
  });

  readonly documentStatusChartData = computed<ChartData<'doughnut'>>(() => {
    const statuses = this.dashboard()?.documentsByStatus ?? [];

    return {
      labels: statuses.map((item: any) => item.statusLabel),
      datasets: [{
        data: statuses.map((item: any) => item.documentCount),
        backgroundColor: statuses.map((_: any, index: number) => this.statusColors[index % this.statusColors.length]),
        borderWidth: 0
      }]
    };
  });

  readonly documentStatusOptions: ChartOptions<'doughnut'> = {
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

  readonly fileTypeChartData = computed<ChartData<'pie'>>(() => {
    const fileTypes = this.dashboard()?.documentsByFileType ?? [];

    return {
      labels: fileTypes.map((item: any) => item.fileExtension || 'Unknown'),
      datasets: [{
        data: fileTypes.map((item: any) => item.documentCount),
        backgroundColor: fileTypes.map((_: any, index: number) => this.fileTypeColors[index % this.fileTypeColors.length]),
        borderWidth: 0,
        hoverOffset: 6
      }]
    };
  });

  readonly fileTypeOptions: ChartOptions<'pie'> = {
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

  readonly topProductsChartData = computed<ChartData<'bar'>>(() => {
    const products = this.dashboard()?.topProductsWithDocuments ?? [];

    return {
      labels: products.slice(0, 6).map((item: any) => item.productName),
      datasets: [{
        data: products.slice(0, 6).map((item: any) => item.documentCount),
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
      x: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  readonly documentOwnersChartData = computed<ChartData<'bar'>>(() => {
    const owners = this.dashboard()?.topDocumentOwners ?? [];

    return {
      labels: owners.slice(0, 10).map((item: any) => item.ownerName),
      datasets: [{
        data: owners.slice(0, 10).map((item: any) => item.documentCount),
        backgroundColor: '#f59e0b',
        borderRadius: 6,
        barThickness: 14
      }]
    };
  });

  readonly documentOwnersOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 9 } } }
    }
  };

  readonly coverageTrendChartData = computed<ChartData<'bar' | 'line'>>(() => {
    const overview = this.dashboard()?.overview;
    const statusItems = this.dashboard()?.documentsByStatus ?? [];
    const approved = overview?.approvedDocuments ?? 0;
    const pending = overview?.pendingDocuments ?? 0;
    const obsolete = overview?.obsoleteDocuments ?? 0;
    const total = overview?.totalDocuments ?? 0;

    return {
      labels: ['Approved', 'Pending', 'Obsolete'],
      datasets: [
        {
          type: 'bar' as const,
          label: 'Số tài liệu',
          data: [approved, pending, obsolete],
          backgroundColor: this.statusColors,
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          type: 'line' as const,
          label: 'Tỷ trọng (%)',
          data: [approved, pending, obsolete].map((value) => total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0),
          borderColor: this.widgetChartPalette.info,
          backgroundColor: 'transparent',
          borderWidth: 3,
          tension: 0.4,
          yAxisID: 'y1',
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: this.widgetChartPalette.info,
          pointHoverBorderColor: this.widgetChartPalette.info
        }
      ]
    };
  });

  readonly coverageTrendOptions: ChartOptions<'bar' | 'line'> = {
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
        title: { display: true, text: 'Số tài liệu', font: { size: 11 } }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { font: { size: 10 }, callback: (v) => v + '%' },
        title: { display: true, text: 'Tỷ trọng (%)', font: { size: 11 } }
      }
    }
  };

  ngOnInit(): void {
    this.restoreSavedFilter();
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(false);
    this.errorMessage.set(null);

    this.documentControlDashboardService.getDashboard(this.filterForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.dashboard.set(response);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Không thể tải dữ liệu Document Control Dashboard.');
          this.loading.set(false);
        }
      });
  }

  resetFilters(): void {
    clearDashboardFilter(this.savedFilterStorageKey);
    this.filterForm.reset({ startDate: '2013-01-01', endDate: '2014-12-31', status: null, fileExtension: null });
    this.loadDashboard();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }

  toggleAiAssessment(enabled: boolean): void {
    this.includeAiAssessment.set(enabled);
  }

  async exportPDF(): Promise<void> {
    const currentDashboard = this.dashboard() as DocumentControlDashboardResponseDto | null;
    if (!currentDashboard) {
      alert('Chưa có dữ liệu để tải báo cáo kiểm soát tài liệu.');
      return;
    }

    try {
      await exportDashboardPdf({
        aiAssessment: { enabled: this.includeAiAssessment(), departmentId: 'document-control', dashboard: currentDashboard ?? null, filters: this.filterForm.getRawValue(), setLoading: value => this.aiAssessmentLoading.set(value) },
        title: this.title,
        subtitle: 'Báo cáo theo bộ lọc hiện tại',
        filePrefix: 'DocumentControlDashboard',
        metrics: this.kpiCards(),
        secondaryMetrics: this.summaryCards(),
        filters: this.describeDocumentFilters(currentDashboard),
        sections: [
          {
            title: '01. Trạng thái tài liệu theo bộ lọc',
            subtitle: 'Số lượng và tỷ trọng tài liệu theo trạng thái hiện tại.',
            headers: ['Mã', 'Trạng thái', 'Số tài liệu', 'Tỷ lệ'],
            rows: currentDashboard.documentsByStatus.map(item => [item.status, item.statusLabel, item.documentCount, this.formatPercent(item.percentage)]),
            widths: [45, '*', 75, 60]
          },
          {
            title: '02. Phân bổ loại file',
            subtitle: 'Cơ cấu tài liệu theo phần mở rộng file sau khi lọc.',
            headers: ['Loại file', 'Số tài liệu', 'Tỷ lệ'],
            rows: currentDashboard.documentsByFileType.map(item => [item.fileExtension || 'Unknown', item.documentCount, this.formatPercent(item.percentage)]),
            widths: ['*', 75, 60]
          },
          {
            title: '03. Top sản phẩm có tài liệu',
            subtitle: 'Sản phẩm có nhiều tài liệu liên quan nhất trong phạm vi lọc.',
            headers: ['Sản phẩm', 'Mã SP', 'Số tài liệu'],
            rows: currentDashboard.topProductsWithDocuments.slice(0, 10).map(item => [item.productName, item.productNumber, item.documentCount]),
            widths: ['*', 75, 70]
          },
          {
            title: '04. Chủ sở hữu tài liệu',
            subtitle: 'Người sở hữu nhiều tài liệu nhất theo bộ lọc hiện tại.',
            headers: ['Chủ sở hữu', 'Chức danh', 'Số tài liệu'],
            rows: currentDashboard.topDocumentOwners.slice(0, 10).map(item => [item.ownerName, item.jobTitle, item.documentCount]),
            widths: ['*', '*', 70]
          },
          {
            title: '05. Sửa đổi gần đây',
            subtitle: 'Các tài liệu có thay đổi gần nhất trong phạm vi đã lọc.',
            headers: ['Tiêu đề', 'Revision', 'Chủ sở hữu', 'Ngày sửa'],
            rows: currentDashboard.recentRevisions.slice(0, 10).map(item => [item.title, item.revision, item.ownerName, this.formatReportDate(item.modifiedDate)]),
            widths: ['*', 55, 80, 70]
          },
          {
            title: '06. Chờ phê duyệt',
            subtitle: 'Danh sách tài liệu đang chờ xử lý theo bộ lọc hiện tại.',
            headers: ['Tiêu đề', 'File', 'Revision', 'Chủ sở hữu'],
            rows: currentDashboard.pendingApprovals.slice(0, 10).map(item => [item.title, item.fileName, item.revision, item.ownerName]),
            widths: ['*', 80, 55, 80]
          },
          {
            title: '07. Sản phẩm thiếu tài liệu',
            subtitle: 'Sản phẩm chưa có tài liệu tương ứng trong dữ liệu đã lọc.',
            headers: ['Sản phẩm', 'Mã SP', 'Có ngày bán'],
            rows: currentDashboard.productsWithoutDocuments.slice(0, 12).map(item => [item.productName, item.productNumber, item.sellStartDate ? 'Có' : 'Không']),
            widths: ['*', 80, 65]
          }
        ]
      });
    } catch (error) {
      console.error('Không thể tạo PDF dashboard kiểm soát tài liệu', error);
      alert('Không thể tạo file PDF. Vui lòng thử lại.');
    }
  }

  private describeDocumentFilters(dashboard: DocumentControlDashboardResponseDto): string[] {
    const filters = dashboard.filters;
    const status = dashboard.filterOptions.statuses.find(item => item.id === filters.status)?.name ?? 'Tất cả';
    const fileExtension = dashboard.filterOptions.fileExtensions.find(item => item.name === filters.fileExtension)?.name ?? filters.fileExtension ?? 'Tất cả';

    return [
      `Thời gian: ${this.formatReportDate(filters.startDate)} - ${this.formatReportDate(filters.endDate)}`,
      `Trạng thái: ${status}`,
      `Loại file: ${fileExtension}`
    ];
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

  customizeLayout(): void {
    this.toggleEditMode();
  }

  saveFilter(): void {
    saveDashboardFilter(this.savedFilterStorageKey, this.filterForm.getRawValue());
    this.loadDashboard();
  }
  private restoreSavedFilter(): void {
    this.filterForm.patchValue(restoreDashboardFilter(this.savedFilterStorageKey, { startDate: '2013-01-01', endDate: '2014-12-31', status: null, fileExtension: null }));
  }

}
