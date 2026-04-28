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
  selector: 'app-marketing',
  standalone: true,
  templateUrl: './marketing.component.html',
  styleUrls: ['./marketing.component.scss'],
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
export class MarketingComponent {
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

  readonly title = 'Marketing';
  readonly subtitle = 'Dashboard';

  readonly includeAiAssessment = signal(false);
  readonly aiAssessmentLoading = signal(false);


  readonly appliedFilters = signal({
    campaignType: 'All',
    reviewSentiment: 'All',
    targetSegment: 'All'
  });

  readonly filterForm = this.fb.group({
    campaignType: ['All'],
    reviewSentiment: ['All'],
    targetSegment: ['All']
  });

  readonly savedFilterStorageKey = 'marketing_saved_filter';
  readonly gridsterStorageKey = 'marketing_grid_layout';
  readonly hiddenChartsStorageKey = 'marketing_hidden_charts';

  readonly isEditMode = signal(false);
  readonly showChartPicker = signal(false);

  readonly gridsterOptions = signal<GridsterConfig>({
    draggable: { enabled: false },
    resizable: { enabled: false },
    pushItems: true,
    minCols: 12,
    maxCols: 12,
    minRows: 30,
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
    { id: 'campaign-revenue', label: 'Doanh thu theo loại campaign' },
    { id: 'campaign-trend', label: 'Hiệu suất campaign theo thời gian' },
    { id: 'review-rating', label: 'Phân bổ rating review' },
    { id: 'review-volume', label: 'Khối lượng review theo tháng' },
    { id: 'targeting-funnel', label: 'Funnel khách hàng mục tiêu' },
    { id: 'top-campaigns', label: 'Top campaign mang lại doanh thu' },
    { id: 'low-rating-reviews', label: 'Review 1-2 sao cần xử lý' },
    { id: 'target-stores', label: 'Danh sách cửa hàng mục tiêu' },
    { id: 'remarketing-list', label: 'Data list remarketing' }
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
      { id: 'campaign-revenue', cols: 4, rows: 5, x: 0, y: 0 },
      { id: 'campaign-trend', cols: 8, rows: 5, x: 4, y: 0 },
      { id: 'review-rating', cols: 7, rows: 6, x: 0, y: 5 },
      { id: 'review-volume', cols: 5, rows: 6, x: 7, y: 5 },
      { id: 'targeting-funnel', cols: 6, rows: 5, x: 0, y: 11 },
      { id: 'top-campaigns', cols: 7, rows: 5, x: 0, y: 16 },
      { id: 'low-rating-reviews', cols: 5, rows: 5, x: 7, y: 16 },
      { id: 'target-stores', cols: 7, rows: 5, x: 0, y: 21 },
      { id: 'remarketing-list', cols: 5, rows: 5, x: 7, y: 21 }
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

  readonly campaigns = signal([
    {
      specialOfferId: 1,
      description: 'Summer Bike Festival',
      type: 'Seasonal',
      category: 'Summer Campaign',
      revenue: 482000,
      orders: 214,
      roi: 2.48,
      discountPct: 0.15,
      contributionRate: 0.21,
      startDate: '2024-06-01',
      endDate: '2024-07-15'
    },
    {
      specialOfferId: 2,
      description: 'Black Friday Rush',
      type: 'Flash Sale',
      category: 'Holiday',
      revenue: 695000,
      orders: 301,
      roi: 3.12,
      discountPct: 0.25,
      contributionRate: 0.29,
      startDate: '2024-11-20',
      endDate: '2024-11-30'
    },
    {
      specialOfferId: 3,
      description: 'New Customer Welcome',
      type: 'Acquisition',
      category: 'CRM',
      revenue: 268000,
      orders: 176,
      roi: 2.04,
      discountPct: 0.1,
      contributionRate: 0.14,
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    },
    {
      specialOfferId: 4,
      description: 'Weekend Accessory Boost',
      type: 'Bundle',
      category: 'Cross-sell',
      revenue: 183500,
      orders: 149,
      roi: 1.76,
      discountPct: 0.08,
      contributionRate: 0.09,
      startDate: '2024-08-01',
      endDate: '2024-08-31'
    },
    {
      specialOfferId: 5,
      description: 'Dealer Re-Activation',
      type: 'Partner Push',
      category: 'B2B',
      revenue: 356400,
      orders: 94,
      roi: 2.67,
      discountPct: 0.12,
      contributionRate: 0.17,
      startDate: '2024-09-01',
      endDate: '2024-10-10'
    }
  ]);

  readonly campaignTrend = signal([
    { period: 'W1', seasonal: 58, flashSale: 66, acquisition: 41 },
    { period: 'W2', seasonal: 74, flashSale: 81, acquisition: 46 },
    { period: 'W3', seasonal: 86, flashSale: 93, acquisition: 52 },
    { period: 'W4', seasonal: 92, flashSale: 108, acquisition: 57 },
    { period: 'W5', seasonal: 97, flashSale: 126, acquisition: 61 },
    { period: 'W6', seasonal: 101, flashSale: 139, acquisition: 64 }
  ]);

  readonly reviews = signal([
    {
      product: 'Mountain-200 Black, 42',
      reviewer: 'Nguyen Minh Khang',
      rating: 5,
      sentiment: 'Positive',
      reviewDate: '2024-09-02',
      comment: 'Khung xe đẹp, giao nhanh và đúng kỳ vọng.'
    },
    {
      product: 'Road-650 Red, 44',
      reviewer: 'Tran Bao Chau',
      rating: 4,
      sentiment: 'Positive',
      reviewDate: '2024-09-06',
      comment: 'Thiết kế nổi bật, trải nghiệm tổng thể tốt.'
    },
    {
      product: 'Touring-3000 Yellow, 50',
      reviewer: 'Le Hoang Nam',
      rating: 2,
      sentiment: 'Negative',
      reviewDate: '2024-09-10',
      comment: 'Yên xe chưa thoải mái, cần CSKH gọi lại.'
    },
    {
      product: 'HL Mountain Frame - Silver',
      reviewer: 'Pham Gia Han',
      rating: 1,
      sentiment: 'Negative',
      reviewDate: '2024-09-12',
      comment: 'Bao bì bị trầy, cảm nhận thương hiệu giảm mạnh.'
    },
    {
      product: 'Sport-100 Helmet, Blue',
      reviewer: 'Do Khanh Linh',
      rating: 3,
      sentiment: 'Neutral',
      reviewDate: '2024-09-15',
      comment: 'Sản phẩm ổn nhưng thông điệp khuyến mãi chưa rõ ràng.'
    },
    {
      product: 'Hydration Pack - 70 oz.',
      reviewer: 'Vu Anh Tuan',
      rating: 5,
      sentiment: 'Positive',
      reviewDate: '2024-09-18',
      comment: 'Rất hài lòng, sẵn sàng giới thiệu cho bạn bè.'
    }
  ]);

  readonly reviewVolume = signal([
    { period: 'Apr', count: 18 },
    { period: 'May', count: 24 },
    { period: 'Jun', count: 29 },
    { period: 'Jul', count: 34 },
    { period: 'Aug', count: 41 },
    { period: 'Sep', count: 47 }
  ]);

  readonly storeSegments = signal([
    {
      name: 'Cycle World HCM',
      region: 'South',
      segment: 'High Potential',
      annualRevenueBand: '>$2M',
      floorArea: 4800,
      leadScore: 92,
      storeType: 'Retail Chain'
    },
    {
      name: 'Urban Bike Hub',
      region: 'North',
      segment: 'Growth',
      annualRevenueBand: '$1M-$2M',
      floorArea: 2900,
      leadScore: 78,
      storeType: 'Specialty Store'
    },
    {
      name: 'Adventure Wheels',
      region: 'Central',
      segment: 'High Potential',
      annualRevenueBand: '$1M-$2M',
      floorArea: 3400,
      leadScore: 84,
      storeType: 'Outdoor Dealer'
    },
    {
      name: 'Downtown Motion',
      region: 'South',
      segment: 'Nurture',
      annualRevenueBand: '$500K-$1M',
      floorArea: 1700,
      leadScore: 61,
      storeType: 'Boutique'
    },
    {
      name: 'Peak Performance Bikes',
      region: 'North',
      segment: 'Growth',
      annualRevenueBand: '>$2M',
      floorArea: 4100,
      leadScore: 80,
      storeType: 'Retail Chain'
    }
  ]);

  readonly leadContacts = signal([
    { fullName: 'Nguyen Thi Mai', email: 'mai.nguyen@cycleworld.vn', campaign: 'Dealer Re-Activation', audience: 'B2B Dealer' },
    { fullName: 'Tran Van Son', email: 'son.tran@urbanbike.vn', campaign: 'New Customer Welcome', audience: 'Prospect' },
    { fullName: 'Le Thu Ha', email: 'ha.le@adventurewheels.vn', campaign: 'Summer Bike Festival', audience: 'VIP Customer' },
    { fullName: 'Pham Quoc Dat', email: 'dat.pham@peakperformance.vn', campaign: 'Black Friday Rush', audience: 'B2B Dealer' }
  ]);

  readonly filteredCampaigns = computed(() => {
    const filters = this.appliedFilters();

    return this.campaigns().filter((item) => {
      if (filters.campaignType === 'Seasonal') return item.type === 'Seasonal';
      if (filters.campaignType === 'Flash Sale') return item.type === 'Flash Sale';
      if (filters.campaignType === 'Acquisition') return item.type === 'Acquisition';
      if (filters.campaignType === 'Partner Push') return item.type === 'Partner Push';
      return true;
    });
  });

  readonly filteredReviews = computed(() => {
    const filters = this.appliedFilters();

    return this.reviews().filter((item) => {
      if (filters.reviewSentiment === 'Positive') return item.sentiment === 'Positive';
      if (filters.reviewSentiment === 'Negative') return item.sentiment === 'Negative';
      if (filters.reviewSentiment === 'Neutral') return item.sentiment === 'Neutral';
      return true;
    });
  });

  readonly filteredStoreSegments = computed(() => {
    const filters = this.appliedFilters();

    return this.storeSegments().filter((item) => {
      if (filters.targetSegment === 'High Potential') return item.segment === 'High Potential';
      if (filters.targetSegment === 'Growth') return item.segment === 'Growth';
      if (filters.targetSegment === 'Nurture') return item.segment === 'Nurture';
      return true;
    });
  });

  readonly lowRatingReviews = computed(() => this.filteredReviews().filter((item) => item.rating <= 2));

  readonly kpiCards = computed(() => {
    const campaigns = this.filteredCampaigns();
    const totalRevenue = campaigns.reduce((sum, item) => sum + item.revenue, 0);
    const totalOrders = campaigns.reduce((sum, item) => sum + item.orders, 0);
    const avgContribution = campaigns.length
      ? campaigns.reduce((sum, item) => sum + item.contributionRate, 0) / campaigns.length
      : 0;
    const avgRoi = campaigns.length ? campaigns.reduce((sum, item) => sum + item.roi, 0) / campaigns.length : 0;

    return [
      { label: 'Doanh thu từ khuyến mãi', value: totalRevenue, format: 'currency' },
      { label: 'Đơn hàng gắn campaign', value: totalOrders, format: 'number' },
      { label: 'Tỷ lệ đóng góp doanh thu', value: avgContribution, format: 'percent' },
      { label: 'ROI trung bình chiến dịch', value: avgRoi, format: 'decimal' }
    ];
  });

  readonly brandHealthCards = computed(() => {
    const reviews = this.filteredReviews();
    const avgRating = reviews.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0;
    const positiveRate = reviews.length ? reviews.filter((item) => item.rating >= 4).length / reviews.length : 0;
    const negativeRate = reviews.length ? reviews.filter((item) => item.rating <= 2).length / reviews.length : 0;
    const targetStores = this.filteredStoreSegments().length;

    return [
      { label: 'Điểm rating trung bình', value: avgRating, suffix: '', progress: avgRating * 20, tone: 'progress-info' },
      { label: 'Tỷ lệ review tích cực', value: positiveRate * 100, suffix: '%', progress: positiveRate * 100, tone: 'progress-success' },
      { label: 'Tỷ lệ review tiêu cực', value: negativeRate * 100, suffix: '%', progress: negativeRate * 100, tone: 'progress-warning' },
      { label: 'Cửa hàng mục tiêu', value: targetStores, suffix: '', progress: Math.min(100, targetStores * 20), tone: 'progress-primary' }
    ];
  });

  readonly campaignRevenueByTypeChartData = computed<ChartData<'bar'>>(() => {
    const groups = this.filteredCampaigns().reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + item.revenue;
      return acc;
    }, {});

    return {
      labels: Object.keys(groups),
      datasets: [{
        data: Object.values(groups),
        backgroundColor: [
          this.widgetChartPalette.primary,
          this.widgetChartPalette.info,
          this.widgetChartPalette.warning,
          this.widgetChartPalette.success,
          this.widgetChartPalette.danger
        ],
        borderRadius: 8
      }]
    };
  });

  readonly campaignRevenueByTypeOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } }
    }
  };

  readonly campaignTrendChartData = computed<ChartData<'line'>>(() => ({
    labels: this.campaignTrend().map((item) => item.period),
    datasets: [
      {
        label: 'Seasonal',
        data: this.campaignTrend().map((item) => item.seasonal),
        borderColor: this.widgetChartPalette.primary,
        backgroundColor: 'rgba(88, 86, 214, 0.18)',
        fill: true,
        tension: 0.35
      },
      {
        label: 'Flash Sale',
        data: this.campaignTrend().map((item) => item.flashSale),
        borderColor: this.widgetChartPalette.warning,
        backgroundColor: 'rgba(249, 177, 21, 0.12)',
        fill: true,
        tension: 0.35
      },
      {
        label: 'Acquisition',
        data: this.campaignTrend().map((item) => item.acquisition),
        borderColor: this.widgetChartPalette.success,
        backgroundColor: 'rgba(46, 184, 92, 0.10)',
        fill: true,
        tension: 0.35
      }
    ]
  }));

  readonly campaignTrendOptions: ChartOptions<'line'> = {
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

  readonly reviewRatingChartData = computed<ChartData<'pie'>>(() => {
    const ratings = [1, 2, 3, 4, 5].map((star) => this.filteredReviews().filter((item) => item.rating === star).length);

    return {
      labels: ['1 sao', '2 sao', '3 sao', '4 sao', '5 sao'],
      datasets: [{
        data: ratings,
        backgroundColor: [
          this.widgetChartPalette.danger,
          '#fb7185',
          this.widgetChartPalette.warning,
          '#34d399',
          this.widgetChartPalette.success
        ],
        borderWidth: 0,
        hoverOffset: 6
      }]
    };
  });

  readonly reviewRatingOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14,
          font: { size: 12, weight: 500 }
        }
      }
    }
  };

  readonly reviewVolumeChartData = computed<ChartData<'bar'>>(() => ({
    labels: this.reviewVolume().map((item) => item.period),
    datasets: [{
      label: 'Reviews',
      data: this.reviewVolume().map((item) => item.count),
      backgroundColor: '#14b8a6',
      borderRadius: 6,
      barThickness: 18
    }]
  }));

  readonly reviewVolumeOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } }
    }
  };

  readonly targetingFunnelChartData = computed<ChartData<'bar'>>(() => {
    const counts = {
      'High Potential': this.filteredStoreSegments().filter((item) => item.segment === 'High Potential').length,
      Growth: this.filteredStoreSegments().filter((item) => item.segment === 'Growth').length,
      Nurture: this.filteredStoreSegments().filter((item) => item.segment === 'Nurture').length
    };

    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: [this.widgetChartPalette.primary, this.widgetChartPalette.info, this.widgetChartPalette.warning],
        borderRadius: 8,
        barThickness: 24
      }]
    };
  });

  readonly targetingFunnelOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } }
    }
  };

  readonly storeTypeTreemapRows = computed(() => {
    const grouped = this.filteredStoreSegments().reduce<Record<string, number>>((acc, item) => {
      acc[item.storeType] = (acc[item.storeType] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([storeType, count]) => ({ storeType, count }))
      .sort((a, b) => b.count - a.count);
  });

  readonly topCampaignRows = computed(() => [...this.filteredCampaigns()].sort((a, b) => b.revenue - a.revenue));

  applyFilters(): void {
    this.appliedFilters.set({
      campaignType: this.filterForm.get('campaignType')?.value ?? 'All',
      reviewSentiment: this.filterForm.get('reviewSentiment')?.value ?? 'All',
      targetSegment: this.filterForm.get('targetSegment')?.value ?? 'All'
    });
  }

  resetFilters(): void {
    clearDashboardFilter(this.savedFilterStorageKey);
    this.filterForm.reset({ campaignType: 'All', reviewSentiment: 'All', targetSegment: 'All' });
    this.applyFilters();
  }

  toggleAiAssessment(enabled: boolean): void {
    this.includeAiAssessment.set(enabled);
  }

  async exportPDF(): Promise<void> {
    const currentDashboard = {
      metrics: this.kpiCards(),
      secondaryMetrics: this.brandHealthCards(),
      filters: this.filterForm.getRawValue(),
      campaigns: this.filteredCampaigns(),
      reviews: this.filteredReviews(),
      storeSegments: this.filteredStoreSegments()
    };

    try {
      await exportDashboardPdf({
        aiAssessment: { enabled: this.includeAiAssessment(), departmentId: 'marketing', dashboard: currentDashboard, filters: this.filterForm.getRawValue(), setLoading: value => this.aiAssessmentLoading.set(value) },
        title: this.title,
        subtitle: 'Báo cáo theo bộ lọc hiện tại',
        filePrefix: 'MarketingDashboard',
        metrics: this.kpiCards(),
        secondaryMetrics: this.brandHealthCards(),
        filters: this.describeMarketingFilters(),
        sections: [
          {
            title: '01. Campaign theo bộ lọc',
            subtitle: 'Danh sách campaign đang được tính vào KPI Marketing hiện tại.',
            headers: ['Campaign', 'Loại', 'Doanh thu', 'Đơn hàng', 'ROI'],
            rows: this.topCampaignRows().map(item => [item.description, item.type, this.formatCurrency(item.revenue), item.orders, item.roi.toFixed(2)]),
            widths: ['*', 70, 85, 55, 45]
          },
          {
            title: '02. Xu hướng hiệu suất campaign',
            subtitle: 'Hiệu suất theo tuần của các nhóm campaign chính.',
            headers: ['Kỳ', 'Seasonal', 'Flash Sale', 'Acquisition'],
            rows: this.campaignTrend().map(item => [item.period, item.seasonal, item.flashSale, item.acquisition]),
            widths: ['*', 70, 70, 70]
          },
          {
            title: '03. Review theo sentiment đang lọc',
            subtitle: 'Review khách hàng sau khi áp dụng bộ lọc cảm xúc.',
            headers: ['Sản phẩm', 'Người đánh giá', 'Rating', 'Sentiment', 'Ngày'],
            rows: this.filteredReviews().map(item => [item.product, item.reviewer, item.rating, item.sentiment, this.formatReportDate(item.reviewDate)]),
            widths: ['*', 75, 45, 65, 65]
          },
          {
            title: '04. Review 1-2 sao cần xử lý',
            subtitle: 'Các phản hồi tiêu cực cần CSKH xử lý trong bộ lọc hiện tại.',
            headers: ['Sản phẩm', 'Người đánh giá', 'Rating', 'Ghi chú'],
            rows: this.lowRatingReviews().map(item => [item.product, item.reviewer, item.rating, item.comment]),
            widths: ['*', 75, 45, '*']
          },
          {
            title: '05. Cửa hàng mục tiêu',
            subtitle: 'Danh sách cửa hàng theo phân khúc mục tiêu đang chọn.',
            headers: ['Cửa hàng', 'Vùng', 'Phân khúc', 'Doanh thu/năm', 'Lead score'],
            rows: this.filteredStoreSegments().map(item => [item.name, item.region, item.segment, item.annualRevenueBand, item.leadScore]),
            widths: ['*', 55, 75, 70, 55]
          },
          {
            title: '06. Data list remarketing',
            subtitle: 'Danh sách liên hệ phục vụ remarketing/campaign follow-up.',
            headers: ['Họ tên', 'Email', 'Campaign', 'Audience'],
            rows: this.leadContacts().map(item => [item.fullName, item.email, item.campaign, item.audience]),
            widths: [75, '*', 80, 70]
          }
        ]
      });
    } catch (error) {
      console.error('Không thể tạo PDF dashboard Marketing', error);
      alert('Không thể tạo file PDF. Vui lòng thử lại.');
    }
  }

  private describeMarketingFilters(): string[] {
    const filters = this.appliedFilters();
    return [
      `Loại campaign: ${this.displayFilterValue(filters.campaignType)}`,
      `Sentiment review: ${this.displayFilterValue(filters.reviewSentiment)}`,
      `Phân khúc mục tiêu: ${this.displayFilterValue(filters.targetSegment)}`
    ];
  }

  private displayFilterValue(value: string): string {
    return value === 'All' ? 'Tất cả' : value;
  }

  private formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value ?? 0));
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
    this.applyFilters();
  }
  private restoreSavedFilter(): void {
    this.filterForm.patchValue(restoreDashboardFilter(this.savedFilterStorageKey, { campaignType: 'All', reviewSentiment: 'All', targetSegment: 'All' }));
  }

}
