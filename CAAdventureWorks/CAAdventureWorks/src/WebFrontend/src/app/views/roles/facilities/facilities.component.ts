import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
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

@Component({
  selector: 'app-facilities',
  standalone: true,
  templateUrl: './facilities.component.html',
  styleUrls: ['./facilities.component.scss'],
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
    TableDirective,
    DecimalPipe
  ]
})
export class FacilitiesComponent {
  private readonly fb = new FormBuilder();

  private readonly widgetChartPalette = {
    primary: getStyle('--cui-primary') ?? '#5856d6',
    info: getStyle('--cui-info') ?? '#39f',
    warning: getStyle('--cui-warning') ?? '#f9b115',
    success: getStyle('--cui-success') ?? '#2eb85c',
    danger: getStyle('--cui-danger') ?? '#e55353'
  };

  readonly title = 'Facilities & Maintenance';
  readonly subtitle = 'Dashboard';

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
    { locationId: 10, name: 'Assembly Cell A', facilityType: 'Production Line', costRate: 78, availability: 160, actualHours: 142, plannedCost: 10800, actualCost: 11540, variance: 740, priority: 'Medium' },
    { locationId: 20, name: 'Paint Storage', facilityType: 'Warehouse', costRate: 52, availability: 120, actualHours: 86, plannedCost: 4600, actualCost: 4980, variance: 380, priority: 'Low' },
    { locationId: 30, name: 'Machining Bay 2', facilityType: 'Machine Station', costRate: 95, availability: 180, actualHours: 171, plannedCost: 14900, actualCost: 16320, variance: 1420, priority: 'High' },
    { locationId: 40, name: 'Final Assembly Dock', facilityType: 'Production Line', costRate: 88, availability: 168, actualHours: 149, plannedCost: 13150, actualCost: 13610, variance: 460, priority: 'Medium' },
    { locationId: 50, name: 'Finished Goods Hub', facilityType: 'Warehouse', costRate: 61, availability: 144, actualHours: 101, plannedCost: 6250, actualCost: 6720, variance: 470, priority: 'Low' }
  ]);

  readonly machineRuntimeTrend = signal([
    { month: 'Apr', assembly: 118, machining: 149, warehouse: 82 },
    { month: 'May', assembly: 124, machining: 155, warehouse: 88 },
    { month: 'Jun', assembly: 129, machining: 161, warehouse: 90 },
    { month: 'Jul', assembly: 133, machining: 166, warehouse: 93 },
    { month: 'Aug', assembly: 140, machining: 169, warehouse: 98 },
    { month: 'Sep', assembly: 146, machining: 171, warehouse: 101 }
  ]);

  readonly inventoryCapacity = signal([
    { zone: 'Paint Storage', quantity: 1480, shelvesUsed: 14, binsUsed: 48, fillRate: 0.72, areaType: 'Warehouse' },
    { zone: 'Assembly Cell A', quantity: 940, shelvesUsed: 8, binsUsed: 22, fillRate: 0.58, areaType: 'Production Line' },
    { zone: 'Final Assembly Dock', quantity: 1180, shelvesUsed: 10, binsUsed: 31, fillRate: 0.66, areaType: 'Production Line' },
    { zone: 'Finished Goods Hub', quantity: 1660, shelvesUsed: 16, binsUsed: 53, fillRate: 0.81, areaType: 'Warehouse' },
    { zone: 'Machining Bay 2', quantity: 760, shelvesUsed: 6, binsUsed: 19, fillRate: 0.49, areaType: 'Machine Station' }
  ]);

  readonly maintenanceSchedule = signal([
    { workOrderId: 5101, location: 'Machining Bay 2', orderQty: 124, scrapReason: 'Overheating', plannedDate: '2024-09-18', actualStartDate: '2024-09-19', actualResourceHrs: 171, status: 'Urgent' },
    { workOrderId: 5102, location: 'Assembly Cell A', orderQty: 88, scrapReason: 'Alignment drift', plannedDate: '2024-09-21', actualStartDate: '2024-09-21', actualResourceHrs: 142, status: 'Planned' },
    { workOrderId: 5103, location: 'Paint Storage', orderQty: 42, scrapReason: 'Humidity check', plannedDate: '2024-09-24', actualStartDate: '2024-09-24', actualResourceHrs: 86, status: 'Planned' },
    { workOrderId: 5104, location: 'Finished Goods Hub', orderQty: 57, scrapReason: 'Forklift traffic bottleneck', plannedDate: '2024-09-26', actualStartDate: '2024-09-27', actualResourceHrs: 101, status: 'Monitor' }
  ]);

  readonly operatingCostMix = signal([
    { location: 'Machining Bay 2', fixedCost: 9200, usageCost: 7120 },
    { location: 'Final Assembly Dock', fixedCost: 8040, usageCost: 5570 },
    { location: 'Assembly Cell A', fixedCost: 7380, usageCost: 4160 },
    { location: 'Finished Goods Hub', fixedCost: 4320, usageCost: 2400 },
    { location: 'Paint Storage', fixedCost: 3550, usageCost: 1430 }
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
      { label: 'Tổng chi phí facility', value: totalCost, format: 'number' },
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
      { label: 'Tổng tồn lưu trữ', value: totalQuantity, suffix: '' },
      { label: 'Tỷ lệ lấp đầy TB', value: avgFillRate * 100, suffix: '%' },
      { label: 'Lịch bảo trì khẩn', value: urgentCount, suffix: '' },
      { label: 'Lịch bảo trì kế hoạch', value: plannedCount, suffix: '' }
    ];
  });

  readonly costVarianceChartData = computed<ChartData<'bar'>>(() => ({
    labels: this.filteredLocations().map((item) => item.name),
    datasets: [
      {
        label: 'Planned Cost',
        data: this.filteredLocations().map((item) => item.plannedCost),
        backgroundColor: this.widgetChartPalette.info,
        borderRadius: 6
      },
      {
        label: 'Actual Cost',
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
        label: 'Assembly',
        data: this.machineRuntimeTrend().map((item) => item.assembly),
        borderColor: this.widgetChartPalette.primary,
        backgroundColor: 'rgba(88, 86, 214, 0.15)',
        fill: true,
        tension: 0.35
      },
      {
        label: 'Machining',
        data: this.machineRuntimeTrend().map((item) => item.machining),
        borderColor: this.widgetChartPalette.danger,
        backgroundColor: 'rgba(229, 83, 83, 0.10)',
        fill: true,
        tension: 0.35
      },
      {
        label: 'Warehouse',
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
        label: 'Fixed Cost',
        data: this.operatingCostMix().map((item) => item.fixedCost),
        backgroundColor: this.widgetChartPalette.primary,
        borderRadius: 6
      },
      {
        label: 'Usage Cost',
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

  applyFilters(): void {
    this.appliedFilters.set({
      facilityType: this.filterForm.get('facilityType')?.value ?? 'All',
      maintenancePriority: this.filterForm.get('maintenancePriority')?.value ?? 'All',
      storageZone: this.filterForm.get('storageZone')?.value ?? 'All'
    });
  }

  resetFilters(): void {
    this.filterForm.reset({
      facilityType: 'All',
      maintenancePriority: 'All',
      storageZone: 'All'
    });
    this.applyFilters();
  }

  exportPDF(): void {
    alert('Chức năng xuất PDF cho dashboard Facilities & Maintenance đang được phát triển');
  }

  customizeLayout(): void {
    alert('Chức năng tùy chỉnh bố cục Facilities & Maintenance đang được phát triển');
  }

  saveFilter(): void {
    alert('Chức năng lưu bộ lọc Facilities & Maintenance đang được phát triển');
  }
}
