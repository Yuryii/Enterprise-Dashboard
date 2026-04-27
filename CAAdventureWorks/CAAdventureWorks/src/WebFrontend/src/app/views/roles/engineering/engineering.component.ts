import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, HostListener, inject, signal } from '@angular/core';
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
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';
import { clearDashboardFilter, restoreDashboardFilter, saveDashboardFilter } from '../shared/filter-storage';
import { exportDashboardPdf } from '../shared/dashboard-pdf-export';

export interface ChartDef {
  id: string;
  label: string;
}

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
    FormSelectDirective,
    ButtonDirective,
    ChartjsComponent,
    IconDirective,
    TemplateIdDirective,
    WidgetStatAComponent,
    TableDirective,
    DecimalPipe,
    GridsterComponent,
    GridsterItemComponent
  ]
})
export class EngineeringComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

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

  readonly title = 'Engineering';
  readonly subtitle = 'Dashboard';

  readonly includeAiAssessment = signal(false);
  readonly aiAssessmentLoading = signal(false);


  private readonly savedFilterStorageKey = 'engineering_saved_filter';
  readonly gridsterStorageKey = 'engineering_grid_layout';
  private readonly hiddenChartsStorageKey = 'engineering_hidden_charts';

  readonly isEditMode = signal(false);

  readonly gridsterOptions = signal<GridsterConfig>({
    draggable: { enabled: false },
    resizable: { enabled: false },
    pushItems: true,
    minCols: 12,
    maxCols: 12,
    minRows: 22,
    fixedRowHeight: 80,
    keepFixedHeightInMobile: false,
    keepFixedWidthInMobile: false,
    mobileBreakpoint: 640,
    itemChangeCallback: (_item, _itemComponent) => this.saveLayoutToStorage()
  });

  readonly gridsterItems = signal<GridsterItemConfig[]>(
    this.loadLayoutFromStorage() ?? this.getDefaultLayout()
  );

  readonly showChartPicker = signal(false);

  readonly availableCharts: ChartDef[] = [
    { id: 'common-components', label: 'Cấu hình chung' },
    { id: 'make-vs-buy', label: 'Make vs Buy' },
    { id: 'sku-per-model', label: 'SKU per model' },
    { id: 'scrap-rate', label: 'Scrap rate' },
    { id: 'scrap-reason-distribution', label: 'Scrap reason distribution' },
    { id: 'bom-hierarchy', label: 'BOM Hierarchy' },
    { id: 'missing-drawings', label: 'Model thiếu bản vẽ / mô tả' }
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
      { id: 'common-components', cols: 4, rows: 5, x: 0, y: 0 },
      { id: 'make-vs-buy', cols: 4, rows: 5, x: 4, y: 0 },
      { id: 'sku-per-model', cols: 4, rows: 5, x: 8, y: 0 },
      { id: 'scrap-rate', cols: 7, rows: 6, x: 0, y: 5 },
      { id: 'scrap-reason-distribution', cols: 5, rows: 6, x: 7, y: 5 },
      { id: 'bom-hierarchy', cols: 7, rows: 5, x: 0, y: 11 },
      { id: 'missing-drawings', cols: 5, rows: 5, x: 7, y: 11 }
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
    clearDashboardFilter(this.savedFilterStorageKey);
    this.filterForm.reset({ bomLevel: 'All', makeStrategy: 'All', scrapFocus: 'All' });
    this.applyFilters();
  }

  toggleAiAssessment(enabled: boolean): void {
    this.includeAiAssessment.set(enabled);
  }

  async exportPDF(): Promise<void> {
    const currentDashboard = {
      metrics: this.kpiCards(),
      secondaryMetrics: this.engineeringHealthCards(),
      filters: this.filterForm.getRawValue(),
      bomHierarchy: this.bomHierarchyRows(),
      productModels: this.filteredProductModels(),
      scrapFeedback: this.filteredScrapFeedback(),
      scrapReasonMix: this.filteredScrapReasonMix()
    };

    try {
      await exportDashboardPdf({
        aiAssessment: { enabled: this.includeAiAssessment(), departmentId: 'engineering', dashboard: currentDashboard, filters: this.filterForm.getRawValue(), setLoading: value => this.aiAssessmentLoading.set(value) },
        title: this.title,
        subtitle: 'Báo cáo theo bộ lọc hiện tại',
        filePrefix: 'EngineeringDashboard',
        metrics: this.kpiCards(),
        secondaryMetrics: this.engineeringHealthCards(),
        filters: this.describeEngineeringFilters(),
        sections: [
          {
            title: '01. BOM hierarchy theo bộ lọc',
            subtitle: 'Cấu trúc assembly - component đang hiển thị sau khi lọc cấp BOM.',
            headers: ['Assembly', 'Component', 'Level', 'Quantity'],
            rows: this.bomHierarchyRows().map(item => [item.assembly, item.component, item.level, item.quantity]),
            widths: ['*', '*', 45, 55]
          },
          {
            title: '02. Product model theo chiến lược make/buy',
            subtitle: 'Danh sách model đang được tính vào KPI kỹ thuật hiện tại.',
            headers: ['Model', 'SKU', 'Có bản vẽ', 'Make', 'Catalog ready'],
            rows: this.filteredProductModels().map(item => [item.model, item.skuCount, item.hasIllustration ? 'Có' : 'Không', item.makeFlag ? 'Make' : 'Buy', item.catalogReady ? 'Có' : 'Không']),
            widths: ['*', 45, 60, 50, 65]
          },
          {
            title: '03. Model thiếu bản vẽ / mô tả',
            subtitle: 'Các model cần bổ sung illustration hoặc catalog.',
            headers: ['Model', 'SKU', 'Có bản vẽ', 'Catalog ready'],
            rows: this.missingDrawings().map(item => [item.model, item.skuCount, item.hasIllustration ? 'Có' : 'Không', item.catalogReady ? 'Có' : 'Không']),
            widths: ['*', 55, 75, 75]
          },
          {
            title: '04. Scrap feedback theo bộ lọc',
            subtitle: 'R&D backlog và phản hồi scrap cần xem xét.',
            headers: ['Sản phẩm', 'Scrap rate', 'SL scrap', 'Lý do'],
            rows: this.filteredScrapFeedback().map(item => [item.product, `${item.scrapRate}%`, item.scrapQty, item.reason]),
            widths: ['*', 65, 55, 80]
          },
          {
            title: '05. Cơ cấu lý do scrap',
            subtitle: 'Tỷ trọng nguyên nhân scrap trong bộ lọc hiện tại.',
            headers: ['Lý do', 'Tỷ lệ'],
            rows: this.filteredScrapReasonMix().map(item => [item.reason, `${item.percentage}%`]),
            widths: ['*', 60]
          }
        ]
      });
    } catch (error) {
      console.error('Không thể tạo PDF dashboard Engineering', error);
      alert('Không thể tạo file PDF. Vui lòng thử lại.');
    }
  }

  private describeEngineeringFilters(): string[] {
    const filters = this.appliedFilters();
    return [
      `Cấp BOM: ${filters.bomLevel === 'All' ? 'Tất cả' : filters.bomLevel}`,
      `Make strategy: ${filters.makeStrategy === 'All' ? 'Tất cả' : filters.makeStrategy}`,
      `Scrap focus: ${filters.scrapFocus === 'All' ? 'Tất cả' : filters.scrapFocus}`
    ];
  }

  customizeLayout(): void {
    this.toggleEditMode();
  }

  saveFilter(): void {
    saveDashboardFilter(this.savedFilterStorageKey, this.filterForm.getRawValue());
    this.applyFilters();
  }
  private restoreSavedFilter(): void {
    this.filterForm.patchValue(restoreDashboardFilter(this.savedFilterStorageKey, { bomLevel: 'All', makeStrategy: 'All', scrapFocus: 'All' }));
  }

}
