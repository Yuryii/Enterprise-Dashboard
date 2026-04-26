import { CommonModule, CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ChartData, ChartOptions } from 'chart.js';
import { Gridster as GridsterComponent, GridsterItem as GridsterItemComponent } from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';
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
import {
    ToolDesignBomComplexityItemDto,
    ToolDesignDashboardResponseDto,
    ToolDesignDashboardService,
    ToolDesignInventorySupportItemDto,
    ToolDesignLeadTimeItemDto,
    ToolDesignLocationLoadItemDto
} from './tool-design-dashboard.service';

export interface ChartDef {
    id: string;
    label: string;
}

@Component({
    selector: 'app-tool-design',
    standalone: true,
    templateUrl: './tool-design.component.html',
    styleUrls: ['./tool-design.component.scss'],
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
        DecimalPipe,
        PercentPipe
    ]
})
export class ToolDesignComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly toolDesignDashboardService = inject(ToolDesignDashboardService);
    private readonly destroyRef = inject(DestroyRef);

    readonly title = 'Tool Design';
    readonly subtitle = 'Thiết kế model, mức sẵn sàng tài liệu kỹ thuật và khả năng triển khai xuống sản xuất';

    private readonly defaultFilter = {
        productModelId: null as number | null,
        productId: null as number | null,
        productCategoryId: null as number | null,
        locationId: null as number | null,
        vendorId: null as number | null,
        makeOnly: true as boolean | null,
        finishedGoodsOnly: null as boolean | null,
        minDaysToManufacture: null as number | null,
        minStandardCost: null as number | null
    };

    readonly filterForm = this.fb.group({
        productModelId: [this.defaultFilter.productModelId],
        productId: [this.defaultFilter.productId],
        productCategoryId: [this.defaultFilter.productCategoryId],
        locationId: [this.defaultFilter.locationId],
        vendorId: [this.defaultFilter.vendorId],
        makeOnly: [this.defaultFilter.makeOnly],
        finishedGoodsOnly: [this.defaultFilter.finishedGoodsOnly],
        minDaysToManufacture: [this.defaultFilter.minDaysToManufacture],
        minStandardCost: [this.defaultFilter.minStandardCost]
    });

    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly dashboard = signal<ToolDesignDashboardResponseDto | null>(
        this.toolDesignDashboardService.getCachedDashboard(this.defaultFilter)
    );

    private readonly gridsterStorageKey = 'tool_design_grid_layout';
    private readonly hiddenChartsStorageKey = 'tool_design_hidden_charts';

    readonly isEditMode = signal(false);

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
        itemChangeCallback: (_item, _itemComponent) => this.saveLayoutToStorage()
    });

    readonly gridsterItems = signal<GridsterItemConfig[]>(
        this.loadLayoutFromStorage() ?? this.getDefaultLayout()
    );

    readonly showChartPicker = signal(false);

    readonly availableCharts: ChartDef[] = [
        { id: 'models-by-product', label: 'Models by product' },
        { id: 'instruction-coverage', label: 'Instruction coverage' },
        { id: 'complexity', label: 'Complexity' },
        { id: 'cost', label: 'Cost' },
        { id: 'location-load', label: 'Location load' },
        { id: 'vendor-lead-time', label: 'Vendor lead time' }
    ];

    readonly hiddenChartIds = signal<Set<string>>(this.loadHiddenChartsFromStorage());

    readonly kpiCards = computed(() => {
        const overview = this.dashboard()?.overview;
        if (!overview) return [];

        return [
            { label: 'Tổng model', value: overview.totalModels, format: 'number' as const },
            { label: 'Có instruction', value: overview.modelsWithInstructions, format: 'number' as const },
            { label: 'Tỷ lệ phủ tài liệu', value: overview.instructionCoverageRate, format: 'percent' as const },
            { label: 'Sản phẩm phụ thuộc vendor', value: overview.vendorDependentProducts, format: 'number' as const }
        ];
    });

    readonly healthCards = computed(() => {
        const overview = this.dashboard()?.overview;
        if (!overview) return [];

        return [
            { label: 'Model phức tạp cao', value: overview.complexModels, type: 'number' as const, progress: Math.min(100, overview.complexModels * 10) },
            { label: 'Work center tham gia', value: overview.activeWorkCenters, type: 'number' as const, progress: Math.min(100, overview.activeWorkCenters * 12) },
            { label: 'BOM assemblies', value: overview.bomAssemblies, type: 'number' as const, progress: Math.min(100, overview.bomAssemblies * 8) },
            { label: 'Tổng sản phẩm', value: overview.totalProducts, type: 'number' as const, progress: Math.min(100, overview.totalProducts * 2) }
        ];
    });

    readonly modelsByProductChartData = computed<ChartData<'bar'>>(() => {
        const items = this.dashboard()?.modelsByProductCount ?? [];
        return {
            labels: items.slice(0, 8).map((item) => item.modelName),
            datasets: [{
                label: 'Sản phẩm',
                data: items.slice(0, 8).map((item) => item.productCount),
                backgroundColor: '#2563EB',
                borderRadius: 6
            }]
        };
    });

    readonly modelsByProductOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } }
    };

    readonly instructionCoverageChartData = computed<ChartData<'doughnut'>>(() => {
        const items = this.dashboard()?.instructionCoverage ?? [];
        return {
            labels: items.map((item) => item.status),
            datasets: [{
                data: items.map((item) => item.models),
                backgroundColor: ['#14B8A6', '#F97316'],
                borderWidth: 0,
                cutout: '68%'
            }]
        };
    });

    readonly instructionCoverageOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
    };

    readonly complexityChartData = computed<ChartData<'bar'>>(() => {
        const items = this.dashboard()?.topComplexModels ?? [];
        return {
            labels: items.slice(0, 8).map((item) => item.modelName),
            datasets: [{
                label: 'Days to manufacture',
                data: items.slice(0, 8).map((item) => item.averageDaysToManufacture),
                backgroundColor: '#7C3AED',
                borderRadius: 6
            }]
        };
    });

    readonly complexityOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
    };

    readonly costChartData = computed<ChartData<'bar'>>(() => {
        const items = this.dashboard()?.topCostModels ?? [];
        return {
            labels: items.slice(0, 8).map((item) => item.modelName),
            datasets: [{
                label: 'Cost',
                data: items.slice(0, 8).map((item) => item.averageStandardCost),
                backgroundColor: '#F59E0B',
                borderRadius: 6
            }]
        };
    });

    readonly costOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
    };

    readonly locationLoadChartData = computed<ChartData<'bar'>>(() => {
        const items = this.dashboard()?.locationLoads ?? [];
        return {
            labels: items.slice(0, 8).map((item) => item.locationName),
            datasets: [{
                label: 'Routing steps',
                data: items.slice(0, 8).map((item) => item.routingSteps),
                backgroundColor: '#0F766E',
                borderRadius: 6
            }]
        };
    });

    readonly locationLoadOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } }
    };

    readonly vendorLeadTimeChartData = computed<ChartData<'bar'>>(() => {
        const items = this.dashboard()?.vendorLeadTimes ?? [];
        return {
            labels: items.slice(0, 8).map((item) => item.name),
            datasets: [{
                label: 'Lead time',
                data: items.slice(0, 8).map((item) => item.averageLeadTime),
                backgroundColor: '#14B8A6',
                borderRadius: 6
            }]
        };
    });

    readonly vendorLeadTimeOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
    };

    readonly bomComplexities = computed<ToolDesignBomComplexityItemDto[]>(() => this.dashboard()?.bomComplexities ?? []);
    readonly inventorySupport = computed<ToolDesignInventorySupportItemDto[]>(() => this.dashboard()?.inventorySupport ?? []);
    readonly locationLoads = computed<ToolDesignLocationLoadItemDto[]>(() => this.dashboard()?.locationLoads ?? []);
    readonly vendorLeadTimes = computed<ToolDesignLeadTimeItemDto[]>(() => this.dashboard()?.vendorLeadTimes ?? []);

    ngOnInit(): void {
        this.loadDashboard();
    }

    loadDashboard(forceRefresh = false): void {
        const filter = this.filterForm.getRawValue();
        const cached = this.toolDesignDashboardService.getCachedDashboard(filter);

        this.errorMessage.set(null);

        if (cached && !forceRefresh) {
            this.dashboard.set(cached);
            this.loading.set(false);
            return;
        }

        this.loading.set(!this.dashboard());

        this.toolDesignDashboardService.getDashboard(filter, forceRefresh)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.dashboard.set(response);
                    this.loading.set(false);
                },
                error: () => {
                    this.errorMessage.set('Không thể tải dữ liệu Tool Design.');
                    this.loading.set(false);
                }
            });
    }

    resetFilters(): void {
        this.filterForm.reset(this.defaultFilter);
        this.loadDashboard(true);
    }

    exportPDF(): void {
        alert('Chức năng xuất PDF đang được phát triển');
    }

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
            { id: 'models-by-product', cols: 8, rows: 6, x: 0, y: 0 },
            { id: 'instruction-coverage', cols: 4, rows: 6, x: 8, y: 0 },
            { id: 'complexity', cols: 6, rows: 5, x: 0, y: 6 },
            { id: 'cost', cols: 6, rows: 5, x: 6, y: 6 },
            { id: 'location-load', cols: 7, rows: 5, x: 0, y: 11 },
            { id: 'vendor-lead-time', cols: 5, rows: 5, x: 7, y: 11 }
        ];
    }

    customizeLayout(): void {
        this.toggleEditMode();
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

    saveFilter(): void {
        alert('Chức năng lưu bộ lọc đang được phát triển');
    }
}
