import { CommonModule, DecimalPipe } from '@angular/common';
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
  TableActiveDirective,
  TableColorDirective,
  TableDirective,
  TemplateIdDirective,
  WidgetStatAComponent
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import { DocumentControlDashboardService } from './document-control-dashboard.service';

@Component({
  selector: 'app-document-control',
  standalone: true,
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
    DecimalPipe,
    TableDirective,
    TableColorDirective,
    TableActiveDirective
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
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<any>(null);

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
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
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
    this.filterForm.reset({
      startDate: '2013-01-01',
      endDate: '2014-12-31',
      status: null,
      fileExtension: null
    });

    this.loadDashboard();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }

  exportPDF(): void {
    console.log('Exporting Document Control dashboard to PDF...');
    alert('Chức năng xuất PDF đang được phát triển');
  }

  customizeLayout(): void {
    console.log('Customizing Document Control dashboard layout...');
    alert('Chức năng tùy chỉnh layout đang được phát triển');
  }

  saveFilter(): void {
    console.log('Saving Document Control dashboard filters...');
    alert('Chức năng lưu bộ lọc đang được phát triển');
  }
}
