import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
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
  selector: 'app-engineering',
  standalone: true,
  templateUrl: './engineering.component.html',
  styleUrls: ['./engineering.component.scss'],
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
    DecimalPipe,
    PercentPipe
  ]
})
export class EngineeringComponent {
  private readonly fb = new FormBuilder();

  private readonly widgetChartPalette = {
    primary: getStyle('--cui-primary') ?? '#5856d6',
    info: getStyle('--cui-info') ?? '#39f',
    warning: getStyle('--cui-warning') ?? '#f9b115',
    success: getStyle('--cui-success') ?? '#2eb85c',
    danger: getStyle('--cui-danger') ?? '#e55353'
  };

  readonly title = 'Engineering';
  readonly subtitle = 'Dashboard';

  readonly appliedFilters = signal({
    bomLevel: 'All',
    makeStrategy: 'All',
    scrapFocus: 'All'
  });

  readonly filterForm = this.fb.group({
    bomLevel: ['All'],
    makeStrategy: ['All'],
    scrapFocus: ['All']
  });

  readonly bomStructures = signal([
    { assembly: 'Mountain-200 Frame Set', component: 'HL Mountain Frame', level: 1, quantity: 1, sharedCount: 9 },
    { assembly: 'Mountain-200 Frame Set', component: 'Top Tube Reinforcement', level: 2, quantity: 2, sharedCount: 6 },
    { assembly: 'Road-650 Assembly', component: 'Road Frame', level: 1, quantity: 1, sharedCount: 8 },
    { assembly: 'Road-650 Assembly', component: 'Carbon Fork', level: 2, quantity: 1, sharedCount: 7 },
    { assembly: 'Touring-3000 Assembly', component: 'Touring Frame', level: 1, quantity: 1, sharedCount: 5 },
    { assembly: 'Touring-3000 Assembly', component: 'Rear Rack Support', level: 2, quantity: 3, sharedCount: 4 },
    { assembly: 'Hydration Pack Harness', component: 'Clip Set', level: 2, quantity: 4, sharedCount: 10 }
  ]);

  readonly commonComponents = signal([
    { component: 'Clip Set', occurrences: 10 },
    { component: 'HL Mountain Frame', occurrences: 9 },
    { component: 'Road Frame', occurrences: 8 },
    { component: 'Carbon Fork', occurrences: 7 },
    { component: 'Top Tube Reinforcement', occurrences: 6 },
    { component: 'Touring Frame', occurrences: 5 },
    { component: 'Rear Rack Support', occurrences: 4 }
  ]);

  readonly productModels = signal([
    { model: 'Mountain-200', skuCount: 12, hasIllustration: true, makeFlag: true, catalogReady: true },
    { model: 'Road-650', skuCount: 9, hasIllustration: true, makeFlag: true, catalogReady: true },
    { model: 'Touring-3000', skuCount: 7, hasIllustration: false, makeFlag: true, catalogReady: false },
    { model: 'Hydration Pack', skuCount: 5, hasIllustration: false, makeFlag: false, catalogReady: true },
    { model: 'Chain Lock', skuCount: 4, hasIllustration: true, makeFlag: false, catalogReady: false },
    { model: 'All-Purpose Bike Stand', skuCount: 6, hasIllustration: true, makeFlag: false, catalogReady: true }
  ]);

  readonly scrapFeedback = signal([
    { product: 'Mountain-200 Black, 42', scrapRate: 4.8, scrapQty: 23, reason: 'Sai kích thước' },
    { product: 'Road-650 Red, 44', scrapRate: 4.1, scrapQty: 19, reason: 'Lỗi cấu trúc' },
    { product: 'Touring-3000 Yellow, 50', scrapRate: 3.6, scrapQty: 15, reason: 'Trầy xước' },
    { product: 'HL Mountain Frame - Silver', scrapRate: 3.4, scrapQty: 14, reason: 'Sai kích thước' },
    { product: 'Carbon Fork Set', scrapRate: 2.8, scrapQty: 12, reason: 'Lỗi vật liệu' }
  ]);

  readonly scrapReasonMix = signal([
    { reason: 'Sai kích thước', percentage: 34 },
    { reason: 'Lỗi cấu trúc', percentage: 27 },
    { reason: 'Trầy xước', percentage: 21 },
    { reason: 'Lỗi vật liệu', percentage: 18 }
  ]);

  readonly filteredBomStructures = computed(() => {
    const filters = this.appliedFilters();

    return this.bomStructures().filter((item) => {
      if (filters.bomLevel === '1' && item.level !== 1) return false;
      if (filters.bomLevel === '2' && item.level !== 2) return false;
      if (filters.bomLevel === '3' && item.level < 3) return false;
      return true;
    });
  });

  readonly filteredProductModels = computed(() => {
    const filters = this.appliedFilters();

    return this.productModels().filter((item) => {
      if (filters.makeStrategy === 'Make' && !item.makeFlag) return false;
      if (filters.makeStrategy === 'Buy' && item.makeFlag) return false;
      return true;
    });
  });

  readonly filteredScrapFeedback = computed(() => {
    const filters = this.appliedFilters();

    return this.scrapFeedback().filter((item) => {
      if (filters.scrapFocus === 'Dimension') return item.reason === 'Sai kích thước';
      if (filters.scrapFocus === 'Structure') return item.reason === 'Lỗi cấu trúc';
      if (filters.scrapFocus === 'Surface') return item.reason === 'Trầy xước';
      return true;
    });
  });

  readonly filteredScrapReasonMix = computed(() => {
    const filters = this.appliedFilters();

    return this.scrapReasonMix().filter((item) => {
      if (filters.scrapFocus === 'Dimension') return item.reason === 'Sai kích thước';
      if (filters.scrapFocus === 'Structure') return item.reason === 'Lỗi cấu trúc';
      if (filters.scrapFocus === 'Surface') return item.reason === 'Trầy xước';
      return true;
    });
  });

  readonly missingDrawings = computed(() => this.filteredProductModels().filter((item) => !item.hasIllustration || !item.catalogReady));

  readonly kpiCards = computed(() => {
    const models = this.filteredProductModels();
    const bomItems = this.filteredBomStructures();
    const assemblies = new Set(bomItems.map((item) => item.assembly)).size;
    const avgComponents = assemblies > 0 ? bomItems.reduce((sum, item) => sum + item.quantity, 0) / assemblies : 0;
    const illustratedModels = models.filter((item) => item.hasIllustration).length;
    const coverage = models.length ? (illustratedModels / models.length) * 100 : 0;

    return [
      { label: 'Cụm lắp ráp hiện hành', value: assemblies, format: 'number' },
      { label: 'Linh kiện TB / thành phẩm', value: avgComponents, format: 'decimal' },
      { label: 'Product models quản lý', value: models.length, format: 'number' },
      { label: 'Tỷ lệ model có bản vẽ', value: coverage, format: 'percent' }
    ];
  });

  readonly engineeringHealthCards = computed(() => {
    const models = this.filteredProductModels();
    const makeCount = models.filter((item) => item.makeFlag).length;
    const buyCount = models.filter((item) => !item.makeFlag).length;
    const avgSku = models.reduce((sum, item) => sum + item.skuCount, 0) / models.length;
    const scrapItems = this.filteredScrapFeedback();
    const avgScrap = scrapItems.length ? scrapItems.reduce((sum, item) => sum + item.scrapRate, 0) / scrapItems.length : 0;

    return [
      { label: 'Model tự sản xuất', value: makeCount, suffix: '' },
      { label: 'Model mua ngoài', value: buyCount, suffix: '' },
      { label: 'SKU trung bình / model', value: avgSku, suffix: '' },
      { label: 'Scrap trung bình', value: avgScrap, suffix: '%' }
    ];
  });

  readonly commonComponentsChartData = computed<ChartData<'bar'>>(() => ({
    labels: this.commonComponents().map((item) => item.component),
    datasets: [{
      data: this.commonComponents().map((item) => item.occurrences),
      backgroundColor: '#14b8a6',
      borderRadius: 6,
      barThickness: 12
    }]
  }));

  readonly commonComponentsOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  readonly makeVsBuyChartData = computed<ChartData<'doughnut'>>(() => {
    const models = this.filteredProductModels();
    const makeCount = models.filter((item) => item.makeFlag).length;
    const buyCount = models.filter((item) => !item.makeFlag).length;

    return {
      labels: ['Tự sản xuất', 'Mua ngoài'],
      datasets: [{
        data: [makeCount, buyCount],
        backgroundColor: [this.widgetChartPalette.primary, this.widgetChartPalette.warning],
        borderWidth: 0
      }]
    };
  });

  readonly makeVsBuyOptions: ChartOptions<'doughnut'> = {
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

  readonly skuPerModelChartData = computed<ChartData<'bar'>>(() => ({
    labels: this.filteredProductModels().map((item) => item.model),
    datasets: [{
      data: this.filteredProductModels().map((item) => item.skuCount),
      backgroundColor: [
        this.widgetChartPalette.primary,
        this.widgetChartPalette.info,
        this.widgetChartPalette.warning,
        this.widgetChartPalette.success,
        this.widgetChartPalette.danger,
        '#6f42c1'
      ],
      borderRadius: 6
    }]
  }));

  readonly skuPerModelOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } }
    }
  };

  readonly scrapRateChartData = computed<ChartData<'bar'>>(() => ({
    labels: this.filteredScrapFeedback().map((item) => item.product),
    datasets: [{
      data: this.filteredScrapFeedback().map((item) => item.scrapRate),
      backgroundColor: '#f59e0b',
      borderRadius: 6,
      barThickness: 14
    }]
  }));

  readonly scrapRateOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: '#eeeeee' },
        ticks: { font: { size: 10 }, callback: (value) => value + '%' }
      },
      y: { grid: { display: false }, ticks: { font: { size: 9 } } }
    }
  };

  readonly scrapReasonChartData = computed<ChartData<'pie'>>(() => ({
    labels: this.filteredScrapReasonMix().map((item) => item.reason),
    datasets: [{
      data: this.filteredScrapReasonMix().map((item) => item.percentage),
      backgroundColor: [
        this.widgetChartPalette.danger,
        this.widgetChartPalette.warning,
        this.widgetChartPalette.info,
        this.widgetChartPalette.success
      ],
      borderWidth: 0,
      hoverOffset: 6
    }]
  }));

  readonly scrapReasonOptions: ChartOptions<'pie'> = {
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

  readonly bomHierarchyRows = computed(() => this.filteredBomStructures().map((item) => ({
    assembly: item.assembly,
    component: `${'— '.repeat(Math.max(item.level - 1, 0))}${item.component}`,
    level: item.level,
    quantity: item.quantity
  })));

  applyFilters(): void {
    this.appliedFilters.set({
      bomLevel: this.filterForm.get('bomLevel')?.value ?? 'All',
      makeStrategy: this.filterForm.get('makeStrategy')?.value ?? 'All',
      scrapFocus: this.filterForm.get('scrapFocus')?.value ?? 'All'
    });
  }

  resetFilters(): void {
    this.filterForm.reset({
      bomLevel: 'All',
      makeStrategy: 'All',
      scrapFocus: 'All'
    });
    this.applyFilters();
  }

  exportPDF(): void {
    alert('Chức năng xuất PDF đang được phát triển');
  }

  customizeLayout(): void {
    alert('Chức năng tùy chỉnh bố cục đang được phát triển');
  }

  saveFilter(): void {
    alert('Chức năng lưu bộ lọc đang được phát triển');
  }
}
