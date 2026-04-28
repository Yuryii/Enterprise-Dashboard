import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, HostListener, signal } from '@angular/core';
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
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';
import { clearDashboardFilter, restoreDashboardFilter, saveDashboardFilter } from '../shared/filter-storage';
import { exportDashboardPdf } from '../shared/dashboard-pdf-export';

export interface ChartDef {
  id: string;
  label: string;
}

@Component({
  selector: 'app-facilities',
  standalone: true,
  templateUrl: './facilities.component.html',
  styleUrls: ['./facilities.component.scss'],
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
    TableDirective,
    DecimalPipe
  ]
})
export class FacilitiesComponent {
  private readonly fb = new FormBuilder();

  constructor() {
    this.restoreSavedFilter();
    this.applyFilters();
  }

  private readonly widgetChartPalette = {
    primary: getStyle('--cui-primary') ?? '#5856d6',
    info: getStyle('--cui-info') ?? '#39f',
    warning: getStyle('--cui-warning') ?? '#f9b115',
    success: getStyle('--cui-success') ?? '#2eb85c',
    danger: getStyle('--cui-danger') ?? '#e55353'
  };

  readonly title = 'Cơ sở vật chất & Bảo trì';
  readonly subtitle = 'Bảng điều khiển';
  readonly includeAiAssessment = signal(false);
  readonly aiAssessmentLoading = signal(false);

  readonly appliedFilters = signal({
    facilityType: 'All',
    maintenancePriority: 'All',
    storageZone: 'All'
  });

  readonly filterForm = this.fb.group({
    facilityType: ['All'],
    maintenancePriority: ['All'],
    storageZone: ['All']
  });

  readonly locations = signal([
    { locationId: 10, name: 'Ô lắp ráp A', facilityType: 'Production Line', costRate: 78, availability: 160, actualHours: 142, plannedCost: 10800, actualCost: 11540, variance: 740, priority: 'Medium' },
    { locationId: 20, name: 'Kho sơn', facilityType: 'Warehouse', costRate: 52, availability: 120, actualHours: 86, plannedCost: 4600, actualCost: 4980, variance: 380, priority: 'Low' },
    { locationId: 30, name: 'Khu gia công 2', facilityType: 'Machine Station', costRate: 95, availability: 180, actualHours: 171, plannedCost: 14900, actualCost: 16320, variance: 1420, priority: 'High' },
    { locationId: 40, name: 'Bến lắp ráp cuối', facilityType: 'Production Line', costRate: 88, availability: 168, actualHours: 149, plannedCost: 13150, actualCost: 13610, variance: 460, priority: 'Medium' },
    { locationId: 50, name: 'Kho thành phẩm', facilityType: 'Warehouse', costRate: 61, availability: 144, actualHours: 101, plannedCost: 6250, actualCost: 6720, variance: 470, priority: 'Low' }
  ]);

  readonly machineRuntimeTrend = signal([
    { month: 'Th4', assembly: 118, machining: 149, warehouse: 82 },
    { month: 'Th5', assembly: 124, machining: 155, warehouse: 88 },
    { month: 'Th6', assembly: 129, machining: 161, warehouse: 90 },
    { month: 'Th7', assembly: 133, machining: 166, warehouse: 93 },
    { month: 'Th8', assembly: 140, machining: 169, warehouse: 98 },
    { month: 'Th9', assembly: 146, machining: 171, warehouse: 101 }
  ]);

  readonly inventoryCapacity = signal([
    { zone: 'Kho sơn', quantity: 1480, shelvesUsed: 14, binsUsed: 48, fillRate: 0.72, areaType: 'Warehouse' },
    { zone: 'Ô lắp ráp A', quantity: 940, shelvesUsed: 8, binsUsed: 22, fillRate: 0.58, areaType: 'Production Line' },
    { zone: 'Bến lắp ráp cuối', quantity: 1180, shelvesUsed: 10, binsUsed: 31, fillRate: 0.66, areaType: 'Production Line' },
    { zone: 'Kho thành phẩm', quantity: 1660, shelvesUsed: 16, binsUsed: 53, fillRate: 0.81, areaType: 'Warehouse' },
    { zone: 'Khu gia công 2', quantity: 760, shelvesUsed: 6, binsUsed: 19, fillRate: 0.49, areaType: 'Machine Station' }
  ]);

  readonly maintenanceSchedule = signal([
    { workOrderId: 5101, location: 'Khu gia công 2', orderQty: 124, scrapReason: 'Quá nhiệt', plannedDate: '2024-09-18', actualStartDate: '2024-09-19', actualResourceHrs: 171, status: 'Urgent' },
    { workOrderId: 5102, location: 'Ô lắp ráp A', orderQty: 88, scrapReason: 'Lệch căn chỉnh', plannedDate: '2024-09-21', actualStartDate: '2024-09-21', actualResourceHrs: 142, status: 'Planned' },
    { workOrderId: 5103, location: 'Kho sơn', orderQty: 42, scrapReason: 'Kiểm tra độ ẩm', plannedDate: '2024-09-24', actualStartDate: '2024-09-24', actualResourceHrs: 86, status: 'Planned' },
    { workOrderId: 5104, location: 'Kho thành phẩm', orderQty: 57, scrapReason: 'Nghẽn luồng xe nâng', plannedDate: '2024-09-26', actualStartDate: '2024-09-27', actualResourceHrs: 101, status: 'Monitor' }
  ]);

  readonly operatingCostMix = signal([
    { location: 'Khu gia công 2', fixedCost: 9200, usageCost: 7120 },
    { location: 'Bến lắp ráp cuối', fixedCost: 8040, usageCost: 5570 },
    { location: 'Ô lắp ráp A', fixedCost: 7380, usageCost: 4160 },
    { location: 'Kho thành phẩm', fixedCost: 4320, usageCost: 2400 },
    { location: 'Kho sơn', fixedCost: 3550, usageCost: 1430 }
  ]);

  readonly filteredLocations = computed(() => {
    const filters = this.appliedFilters();

    return this.locations().filter((item) => {
      if (filters.facilityType === 'Production Line') return item.facilityType === 'Production Line';
      if (filters.facilityType === 'Warehouse') return item.facilityType === 'Warehouse';
      if (filters.facilityType === 'Machine Station') return item.facilityType === 'Machine Station';
      if (filters.maintenancePriority === 'High') return item.priority === 'High';
      if (filters.maintenancePriority === 'Medium') return item.priority === 'Medium';
      if (filters.maintenancePriority === 'Low') return item.priority === 'Low';
      return true;
    });
  });

  readonly filteredInventoryCapacity = computed(() => {
    const filters = this.appliedFilters();

    return this.inventoryCapacity().filter((item) => {
      if (filters.storageZone === 'Warehouse') return item.areaType === 'Warehouse';
      if (filters.storageZone === 'Production Line') return item.areaType === 'Production Line';
      if (filters.storageZone === 'Machine Station') return item.areaType === 'Machine Station';
      return true;
    });
  });

  readonly utilizationRows = computed(() => this.filteredLocations().map((item) => ({
    ...item,
    utilizationRate: item.availability === 0 ? 0 : item.actualHours / item.availability
  })));

  readonly kpiCards = computed(() => {
    const locations = this.filteredLocations();
    const totalHours = locations.reduce((sum, item) => sum + item.actualHours, 0);
    const totalAvailability = locations.reduce((sum, item) => sum + item.availability, 0);
    const totalVariance = locations.reduce((sum, item) => sum + item.variance, 0);
    const totalCost = locations.reduce((sum, item) => sum + item.actualHours * item.costRate, 0);

    return [
      { label: 'Tỷ lệ hoạt động thực tế', value: totalAvailability === 0 ? 0 : (totalHours / totalAvailability) * 100, format: 'percent' },
      { label: 'Chênh lệch chi phí vận hành', value: totalVariance, format: 'number' },
      { label: 'Tổng chi phí cơ sở', value: totalCost, format: 'number' },
      { label: 'Số khu vực đang theo dõi', value: locations.length, format: 'number' }
    ];
  });

  readonly maintenanceCards = computed(() => {
    const inventory = this.filteredInventoryCapacity();
    const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const avgFillRate = inventory.length ? inventory.reduce((sum, item) => sum + item.fillRate, 0) / inventory.length : 0;
    const urgentCount = this.maintenanceSchedule().filter((item) => item.status === 'Urgent').length;
    const plannedCount = this.maintenanceSchedule().filter((item) => item.status === 'Planned').length;

    return [
      { label: 'Tổng tồn lưu trữ', value: totalQuantity, suffix: '', progress: Math.min(100, totalQuantity / 80), tone: 'progress-info' },
      { label: 'Tỷ lệ lấp đầy TB', value: avgFillRate * 100, suffix: '%', progress: avgFillRate * 100, tone: 'progress-success' },
      { label: 'Lịch bảo trì khẩn', value: urgentCount, suffix: '', progress: Math.min(100, urgentCount * 25), tone: 'progress-warning' },
      { label: 'Lịch bảo trì kế hoạch', value: plannedCount, suffix: '', progress: Math.min(100, plannedCount * 25), tone: 'progress-primary' }
    ];
  });

  readonly costVarianceChartData = computed<ChartData<'bar'>>(() => ({
    labels: this.filteredLocations().map((item) => item.name),
    datasets: [
      {
        label: 'Chi phí kế hoạch',
        data: this.filteredLocations().map((item) => item.plannedCost),
        backgroundColor: this.widgetChartPalette.info,
        borderRadius: 6
      },
      {
        label: 'Chi phí thực tế',
        data: this.filteredLocations().map((item) => item.actualCost),
        backgroundColor: this.widgetChartPalette.warning,
        borderRadius: 6
      }
    ]
  }));

  readonly costVarianceOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 10, boxHeight: 10 }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } }
    }
  };

  readonly runtimeTrendChartData = computed<ChartData<'line'>>(() => ({
    labels: this.machineRuntimeTrend().map((item) => item.month),
    datasets: [
      {
        label: 'Lắp ráp',
        data: this.machineRuntimeTrend().map((item) => item.assembly),
        borderColor: this.widgetChartPalette.primary,
        backgroundColor: 'rgba(88, 86, 214, 0.15)',
        fill: true,
        tension: 0.35
      },
      {
        label: 'Gia công',
        data: this.machineRuntimeTrend().map((item) => item.machining),
        borderColor: this.widgetChartPalette.danger,
        backgroundColor: 'rgba(229, 83, 83, 0.10)',
        fill: true,
        tension: 0.35
      },
      {
        label: 'Kho',
        data: this.machineRuntimeTrend().map((item) => item.warehouse),
        borderColor: this.widgetChartPalette.success,
        backgroundColor: 'rgba(46, 184, 92, 0.10)',
        fill: true,
        tension: 0.35
      }
    ]
  }));

  readonly runtimeTrendOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 10, boxHeight: 10 }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } }
    }
  };

  readonly inventoryDonutChartData = computed<ChartData<'doughnut'>>(() => ({
    labels: this.filteredInventoryCapacity().map((item) => item.zone),
    datasets: [{
      data: this.filteredInventoryCapacity().map((item) => item.quantity),
      backgroundColor: [
        this.widgetChartPalette.primary,
        this.widgetChartPalette.info,
        this.widgetChartPalette.warning,
        this.widgetChartPalette.success,
        this.widgetChartPalette.danger
      ],
      borderWidth: 0
    }]
  }));

  readonly inventoryDonutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '64%',
    plugins: {
      legend: {
        position: 'right',
        labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 12, weight: 500 } }
      }
    }
  };

  readonly operatingCostChartData = computed<ChartData<'bar'>>(() => ({
    labels: this.operatingCostMix().map((item) => item.location),
    datasets: [
      {
        label: 'Chi phí cố định',
        data: this.operatingCostMix().map((item) => item.fixedCost),
        backgroundColor: this.widgetChartPalette.primary,
        borderRadius: 6
      },
      {
        label: 'Chi phí sử dụng',
        data: this.operatingCostMix().map((item) => item.usageCost),
        backgroundColor: this.widgetChartPalette.warning,
        borderRadius: 6
      }
    ]
  }));

  readonly operatingCostOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 10, boxHeight: 10 }
      }
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { stacked: true, beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } }
    }
  };

  readonly capacityHeatmapRows = computed(() => [...this.filteredInventoryCapacity()].sort((a, b) => b.fillRate - a.fillRate));

  readonly savedFilterStorageKey = 'facilities_saved_filter';
  readonly gridsterStorageKey = 'facilities_grid_layout';
  readonly hiddenChartsStorageKey = 'facilities_hidden_charts';

  readonly isEditMode = signal(false);
  readonly showChartPicker = signal(false);

  readonly gridsterOptions = signal<GridsterConfig>({
    draggable: { enabled: false },
    resizable: { enabled: false },
    pushItems: true,
    minCols: 12,
    maxCols: 12,
    minRows: 32,
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
    { id: 'cost-variance', label: 'Chi phí kế hoạch so với thực tế' },
    { id: 'runtime-trend', label: 'Biến động giờ chạy máy' },
    { id: 'inventory-capacity', label: 'Phân bổ tồn kho' },
    { id: 'operating-cost', label: 'Chi phí vận hành' },
    { id: 'capacity-heatmap', label: 'Bản đồ nhiệt sức chứa' },
    { id: 'utilization-table', label: 'Tình trạng sử dụng khu vực' },
    { id: 'maintenance-schedule', label: 'Lịch bảo trì' },
    { id: 'storage-capacity', label: 'Chi tiết sức chứa lưu trữ' }
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
      { id: 'cost-variance', cols: 6, rows: 6, x: 0, y: 0 },
      { id: 'runtime-trend', cols: 6, rows: 6, x: 6, y: 0 },
      { id: 'inventory-capacity', cols: 5, rows: 6, x: 0, y: 6 },
      { id: 'operating-cost', cols: 7, rows: 6, x: 5, y: 6 },
      { id: 'capacity-heatmap', cols: 7, rows: 5, x: 0, y: 12 },
      { id: 'maintenance-schedule', cols: 5, rows: 5, x: 7, y: 12 },
      { id: 'utilization-table', cols: 12, rows: 6, x: 0, y: 17 },
      { id: 'storage-capacity', cols: 12, rows: 5, x: 0, y: 23 }
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

  applyFilters(): void {
    this.appliedFilters.set({
      facilityType: this.filterForm.get('facilityType')?.value ?? 'All',
      maintenancePriority: this.filterForm.get('maintenancePriority')?.value ?? 'All',
      storageZone: this.filterForm.get('storageZone')?.value ?? 'All'
    });
  }

  resetFilters(): void {
    clearDashboardFilter(this.savedFilterStorageKey);
    this.filterForm.reset({ facilityType: 'All', maintenancePriority: 'All', storageZone: 'All' });
    this.applyFilters();
  }

  displayFacilityType(value: string): string {
    const labels: Record<string, string> = {
      'All': 'Tất cả',
      'Production Line': 'Dây chuyền sản xuất',
      'Warehouse': 'Kho',
      'Machine Station': 'Trạm máy'
    };
    return labels[value] ?? value;
  }

  displayPriority(value: string): string {
    const labels: Record<string, string> = {
      'All': 'Tất cả',
      'High': 'Cao',
      'Medium': 'Trung bình',
      'Low': 'Thấp'
    };
    return labels[value] ?? value;
  }

  displayStatus(value: string): string {
    const labels: Record<string, string> = {
      'Urgent': 'Khẩn cấp',
      'Planned': 'Đã lên kế hoạch',
      'Monitor': 'Theo dõi'
    };
    return labels[value] ?? value;
  }

  toggleAiAssessment(enabled: boolean): void {
    this.includeAiAssessment.set(enabled);
  }

  async exportPDF(): Promise<void> {
    const currentDashboard = {
      metrics: this.kpiCards(),
      secondaryMetrics: this.maintenanceCards(),
      filters: this.filterForm.getRawValue(),
      utilization: this.utilizationRows(),
      inventoryCapacity: this.filteredInventoryCapacity(),
      maintenanceSchedule: this.maintenanceSchedule(),
      operatingCostMix: this.operatingCostMix(),
      capacityHeatmap: this.capacityHeatmapRows()
    };

    try {
      await exportDashboardPdf({
        aiAssessment: { enabled: this.includeAiAssessment(), departmentId: 'facilities', dashboard: currentDashboard, filters: this.filterForm.getRawValue(), setLoading: value => this.aiAssessmentLoading.set(value) },
        title: this.title,
        subtitle: 'Báo cáo theo bộ lọc hiện tại',
        filePrefix: 'FacilitiesDashboard',
        metrics: this.kpiCards(),
        secondaryMetrics: this.maintenanceCards(),
        filters: this.describeFacilitiesFilters(),
        sections: [
          {
            title: '01. Tình trạng sử dụng khu vực',
            subtitle: 'Mức sẵn sàng, giờ thực tế, chênh lệch và ưu tiên bảo trì theo bộ lọc.',
            headers: ['Khu vực', 'Loại', 'Khả dụng', 'Giờ TT', 'Sử dụng', 'Ưu tiên'],
            rows: this.utilizationRows().map(item => [item.name, this.displayFacilityType(item.facilityType), item.availability, item.actualHours, this.formatPercent(item.utilizationRate), this.displayPriority(item.priority)]),
            widths: ['*', 70, 55, 55, 55, 60]
          },
          {
            title: '02. Chi tiết sức chứa khu vực lưu trữ',
            subtitle: 'Tồn kho, kệ, bin và tỷ lệ lấp đầy theo storage zone đang lọc.',
            headers: ['Khu vực', 'Loại', 'Tồn', 'Kệ', 'Bin', 'Lấp đầy'],
            rows: this.filteredInventoryCapacity().map(item => [item.zone, this.displayFacilityType(item.areaType), item.quantity, item.shelvesUsed, item.binsUsed, this.formatPercent(item.fillRate)]),
            widths: ['*', 70, 55, 45, 45, 60]
          },
          {
            title: '03. Lịch bảo trì',
            subtitle: 'Lịch bảo trì tham chiếu WorkOrder trong dashboard hiện tại.',
            headers: ['WO', 'Khu vực', 'SL', 'Lý do', 'Ngày KH', 'Trạng thái'],
            rows: this.maintenanceSchedule().map(item => [item.workOrderId, item.location, item.orderQty, item.scrapReason, this.formatReportDate(item.plannedDate), this.displayStatus(item.status)]),
            widths: [45, '*', 45, 70, 65, 70]
          },
          {
            title: '04. Chi phí vận hành',
            subtitle: 'Chi phí cố định và chi phí sử dụng theo khu vực.',
            headers: ['Khu vực', 'Chi phí cố định', 'Chi phí sử dụng', 'Tổng'],
            rows: this.operatingCostMix().map(item => [item.location, this.formatCurrency(item.fixedCost), this.formatCurrency(item.usageCost), this.formatCurrency(item.fixedCost + item.usageCost)]),
            widths: ['*', 85, 85, 85]
          },
          {
            title: '05. Bản đồ nhiệt sức chứa',
            subtitle: 'Các vùng có tỷ lệ lấp đầy cao nhất theo bộ lọc.',
            headers: ['Khu vực', 'Số lượng', 'Tỷ lệ lấp đầy'],
            rows: this.capacityHeatmapRows().map(item => [item.zone, item.quantity, this.formatPercent(item.fillRate)]),
            widths: ['*', 75, 80]
          }
        ]
      });
    } catch (error) {
      console.error('Không thể tạo PDF dashboard cơ sở vật chất', error);
      alert('Không thể tạo file PDF. Vui lòng thử lại.');
    }
  }

  private describeFacilitiesFilters(): string[] {
    const filters = this.appliedFilters();
    return [
      `Loại cơ sở: ${this.displayFacilityType(filters.facilityType)}`,
      `Ưu tiên bảo trì: ${this.displayPriority(filters.maintenancePriority)}`,
      `Khu lưu trữ: ${this.displayFacilityType(filters.storageZone)}`
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

  customizeLayout(): void { this.toggleEditMode(); }

  saveFilter(): void {
    saveDashboardFilter(this.savedFilterStorageKey, this.filterForm.getRawValue());
    this.applyFilters();
  }
  private restoreSavedFilter(): void {
    this.filterForm.patchValue(restoreDashboardFilter(this.savedFilterStorageKey, { facilityType: 'All', maintenancePriority: 'All', storageZone: 'All' }));
  }

}
