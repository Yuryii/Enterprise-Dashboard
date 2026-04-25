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
  selector: 'app-shipping-receiving',
  standalone: true,
  templateUrl: './shipping-receiving.component.html',
  styleUrls: ['./shipping-receiving.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
export class ShippingReceivingComponent {
  private readonly fb = new FormBuilder();

  private readonly widgetChartPalette = {
    primary: getStyle('--cui-primary') ?? '#5856d6',
    info: getStyle('--cui-info') ?? '#39f',
    warning: getStyle('--cui-warning') ?? '#f9b115',
    success: getStyle('--cui-success') ?? '#2eb85c',
    danger: getStyle('--cui-danger') ?? '#e55353'
  };

  readonly title = 'Shipping & Receiving';
  readonly subtitle = 'Dashboard';

  readonly appliedFilters = signal({
    flowType: 'All',
    shipMethod: 'All',
    shipmentStatus: 'All'
  });

  readonly filterForm = this.fb.group({
    flowType: ['All'],
    shipMethod: ['All'],
    shipmentStatus: ['All']
  });

  readonly inboundOrders = signal([
    { purchaseOrderId: 4101, vendor: 'Superior Bicycles', receivedQty: 420, rejectedQty: 18, stockedQty: 402, month: 'Apr', status: 'Rejected Items', dock: 'Inbound A' },
    { purchaseOrderId: 4102, vendor: 'Metro Components', receivedQty: 510, rejectedQty: 9, stockedQty: 501, month: 'May', status: 'Accepted', dock: 'Inbound B' },
    { purchaseOrderId: 4103, vendor: 'Blue Ridge Parts', receivedQty: 475, rejectedQty: 26, stockedQty: 449, month: 'Jun', status: 'Rejected Items', dock: 'Inbound A' },
    { purchaseOrderId: 4104, vendor: 'CycleWorks Asia', receivedQty: 560, rejectedQty: 7, stockedQty: 553, month: 'Jul', status: 'Accepted', dock: 'Inbound C' },
    { purchaseOrderId: 4105, vendor: 'Pioneer Industrial', receivedQty: 388, rejectedQty: 14, stockedQty: 374, month: 'Aug', status: 'Review', dock: 'Inbound B' }
  ]);

  readonly outboundOrders = signal([
    { salesOrderId: 72001, shipMethod: 'Express Air', orderDate: '2024-09-02', shipDate: '2024-09-03', freight: 420, state: 'California', city: 'San Diego', status: 'Shipped', leadTime: 1, onTime: true },
    { salesOrderId: 72002, shipMethod: 'Standard Ground', orderDate: '2024-09-03', shipDate: '2024-09-06', freight: 185, state: 'Texas', city: 'Austin', status: 'Pending', leadTime: 3, onTime: false },
    { salesOrderId: 72003, shipMethod: 'Cargo Freight', orderDate: '2024-09-04', shipDate: '2024-09-07', freight: 560, state: 'Washington', city: 'Seattle', status: 'Shipped', leadTime: 3, onTime: true },
    { salesOrderId: 72004, shipMethod: 'Express Air', orderDate: '2024-09-05', shipDate: '2024-09-06', freight: 465, state: 'Nevada', city: 'Reno', status: 'Shipped', leadTime: 1, onTime: true },
    { salesOrderId: 72005, shipMethod: 'Standard Ground', orderDate: '2024-09-06', shipDate: '2024-09-10', freight: 210, state: 'Arizona', city: 'Phoenix', status: 'Pending', leadTime: 4, onTime: false },
    { salesOrderId: 72006, shipMethod: 'Cargo Freight', orderDate: '2024-09-07', shipDate: '2024-09-09', freight: 610, state: 'Oregon', city: 'Portland', status: 'Shipped', leadTime: 2, onTime: true }
  ]);

  readonly shipMethodMix = signal([
    { name: 'Express Air', orders: 28, baseCost: 2800, variableCost: 1640 },
    { name: 'Standard Ground', orders: 41, baseCost: 2150, variableCost: 980 },
    { name: 'Cargo Freight', orders: 19, baseCost: 3320, variableCost: 2280 }
  ]);

  readonly inboundTrend = signal([
    { month: 'Apr', received: 420, rejected: 18 },
    { month: 'May', received: 510, rejected: 9 },
    { month: 'Jun', received: 475, rejected: 26 },
    { month: 'Jul', received: 560, rejected: 7 },
    { month: 'Aug', received: 388, rejected: 14 },
    { month: 'Sep', received: 530, rejected: 11 }
  ]);

  readonly outboundTrend = signal([
    { day: '09-02', shipped: 12 },
    { day: '09-03', shipped: 14 },
    { day: '09-04', shipped: 11 },
    { day: '09-05', shipped: 17 },
    { day: '09-06', shipped: 19 },
    { day: '09-07', shipped: 16 },
    { day: '09-08', shipped: 21 }
  ]);

  readonly freightByRegion = signal([
    { state: 'California', city: 'San Diego', freight: 980, volume: 18 },
    { state: 'Texas', city: 'Austin', freight: 720, volume: 14 },
    { state: 'Washington', city: 'Seattle', freight: 810, volume: 11 },
    { state: 'Nevada', city: 'Reno', freight: 665, volume: 9 },
    { state: 'Arizona', city: 'Phoenix', freight: 705, volume: 12 }
  ]);

  readonly filteredInboundOrders = computed(() => {
    const filters = this.appliedFilters();

    return this.inboundOrders().filter((item) => {
      if (filters.flowType === 'Inbound') return true;
      if (filters.flowType === 'Outbound') return false;
      if (filters.shipmentStatus === 'Rejected Items') return item.status === 'Rejected Items';
      if (filters.shipmentStatus === 'Review') return item.status === 'Review';
      if (filters.shipmentStatus === 'Accepted') return item.status === 'Accepted';
      return true;
    });
  });

  readonly filteredOutboundOrders = computed(() => {
    const filters = this.appliedFilters();

    return this.outboundOrders().filter((item) => {
      if (filters.flowType === 'Inbound') return false;
      if (filters.shipMethod !== 'All' && item.shipMethod !== filters.shipMethod) return false;
      if (filters.shipmentStatus === 'Pending') return item.status === 'Pending';
      if (filters.shipmentStatus === 'Shipped') return item.status === 'Shipped';
      return true;
    });
  });

  readonly kpiCards = computed(() => {
    const inbound = this.filteredInboundOrders();
    const outbound = this.filteredOutboundOrders();
    const totalReceived = inbound.reduce((sum, item) => sum + item.receivedQty, 0);
    const totalRejected = inbound.reduce((sum, item) => sum + item.rejectedQty, 0);
    const avgLeadTime = outbound.length ? outbound.reduce((sum, item) => sum + item.leadTime, 0) / outbound.length : 0;
    const totalFreight = outbound.reduce((sum, item) => sum + item.freight, 0);

    return [
      { label: 'Tỷ lệ từ chối QC', value: totalReceived === 0 ? 0 : (totalRejected / totalReceived) * 100, format: 'percent' },
      { label: 'Thời gian giao hàng TB', value: avgLeadTime, format: 'decimal' },
      { label: 'Đơn chờ giao', value: outbound.filter((item) => item.status === 'Pending').length, format: 'number' },
      { label: 'Tổng chi phí Freight', value: totalFreight, format: 'number' }
    ];
  });

  readonly logisticsCards = computed(() => {
    const outbound = this.filteredOutboundOrders();
    const inbound = this.filteredInboundOrders();
    const totalStocked = inbound.reduce((sum, item) => sum + item.stockedQty, 0);
    const onTimeRate = outbound.length ? outbound.filter((item) => item.onTime).length / outbound.length : 0;
    const avgFreight = outbound.length ? outbound.reduce((sum, item) => sum + item.freight, 0) / outbound.length : 0;
    const suppliersWithRejects = inbound.filter((item) => item.rejectedQty > 0).length;

    return [
      { label: 'StockedQty đã nhập kho', value: totalStocked, suffix: '' },
      { label: 'On-time delivery', value: onTimeRate * 100, suffix: '%' },
      { label: 'Freight / đơn TB', value: avgFreight, suffix: '' },
      { label: 'PO có hàng lỗi', value: suppliersWithRejects, suffix: '' }
    ];
  });

  readonly inboundQcChartData = computed<ChartData<'bar'>>(() => ({
    labels: this.inboundTrend().map((item) => item.month),
    datasets: [
      {
        label: 'Received Qty',
        data: this.inboundTrend().map((item) => item.received),
        backgroundColor: this.widgetChartPalette.info,
        borderRadius: 6
      },
      {
        label: 'Rejected Qty',
        data: this.inboundTrend().map((item) => item.rejected),
        backgroundColor: this.widgetChartPalette.danger,
        borderRadius: 6
      }
    ]
  }));

  readonly inboundQcOptions: ChartOptions<'bar'> = {
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

  readonly shipMethodPieChartData = computed<ChartData<'pie'>>(() => ({
    labels: this.shipMethodMix().map((item) => item.name),
    datasets: [{
      data: this.shipMethodMix().map((item) => item.orders),
      backgroundColor: [this.widgetChartPalette.primary, this.widgetChartPalette.info, this.widgetChartPalette.warning],
      borderWidth: 0,
      hoverOffset: 6
    }]
  }));

  readonly shipMethodPieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 12, weight: 500 } }
      }
    }
  };

  readonly outboundTrendChartData = computed<ChartData<'line'>>(() => ({
    labels: this.outboundTrend().map((item) => item.day),
    datasets: [{
      label: 'Shipped Orders',
      data: this.outboundTrend().map((item) => item.shipped),
      borderColor: this.widgetChartPalette.success,
      backgroundColor: 'rgba(46, 184, 92, 0.14)',
      fill: true,
      tension: 0.35
    }]
  }));

  readonly outboundTrendOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } }
    }
  };

  readonly freightStackedChartData = computed<ChartData<'bar'>>(() => ({
    labels: this.shipMethodMix().map((item) => item.name),
    datasets: [
      {
        label: 'Ship Base',
        data: this.shipMethodMix().map((item) => item.baseCost),
        backgroundColor: this.widgetChartPalette.primary,
        borderRadius: 6
      },
      {
        label: 'Ship Rate',
        data: this.shipMethodMix().map((item) => item.variableCost),
        backgroundColor: this.widgetChartPalette.warning,
        borderRadius: 6
      }
    ]
  }));

  readonly freightStackedOptions: ChartOptions<'bar'> = {
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

  readonly freightRegionRows = computed(() => [...this.freightByRegion()].sort((a, b) => b.freight - a.freight));

  readonly rejectedInboundRows = computed(() => this.filteredInboundOrders().filter((item) => item.rejectedQty > 0));

  applyFilters(): void {
    this.appliedFilters.set({
      flowType: this.filterForm.get('flowType')?.value ?? 'All',
      shipMethod: this.filterForm.get('shipMethod')?.value ?? 'All',
      shipmentStatus: this.filterForm.get('shipmentStatus')?.value ?? 'All'
    });
  }

  resetFilters(): void {
    this.filterForm.reset({
      flowType: 'All',
      shipMethod: 'All',
      shipmentStatus: 'All'
    });
    this.applyFilters();
  }

  exportPDF(): void {
    alert('Chức năng xuất PDF cho dashboard Shipping & Receiving đang được phát triển');
  }

  customizeLayout(): void {
    alert('Chức năng tùy chỉnh bố cục Shipping & Receiving đang được phát triển');
  }

  saveFilter(): void {
    alert('Chức năng lưu bộ lọc Shipping & Receiving đang được phát triển');
  }
}
