import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface ProductionDashboardFilter {
    startDate?: string | null;
    endDate?: string | null;
    productId?: number | null;
    productCategoryId?: number | null;
    locationId?: number | null;
    scrapReasonId?: number | null;
    makeOnly?: boolean | null;
    finishedGoodsOnly?: boolean | null;
    openOnly?: boolean | null;
    delayedOnly?: boolean | null;
    safetyStockOnly?: boolean | null;
}

export interface ProductionFilterLookupItemDto {
    id: number;
    name: string;
}

export interface ProductionLocationFilterLookupItemDto {
    id: number;
    name: string;
}

export interface ProductionDashboardAppliedFilterDto {
    startDate?: string | null;
    endDate?: string | null;
    productId?: number | null;
    productCategoryId?: number | null;
    locationId?: number | null;
    scrapReasonId?: number | null;
    makeOnly?: boolean | null;
    finishedGoodsOnly?: boolean | null;
    openOnly?: boolean | null;
    delayedOnly?: boolean | null;
    safetyStockOnly?: boolean | null;
}

export interface ProductionOverviewDto {
    totalWorkOrders: number;
    totalOrderQty: number;
    totalStockedQty: number;
    totalScrappedQty: number;
    completionRate: number;
    scrapRate: number;
    openWorkOrders: number;
    delayedWorkOrders: number;
    plannedCost: number;
    actualCost: number;
    costVariance: number;
    actualResourceHours: number;
    totalInventoryQty: number;
    safetyStockAlerts: number;
    productionTransactionCost: number;
}

export interface ProductionTrendPointDto {
    period: string;
    year: number;
    month: number;
    workOrders: number;
    openWorkOrders: number;
    delayedWorkOrders: number;
}

export interface ProductionOutputTrendPointDto {
    period: string;
    year: number;
    month: number;
    orderQty: number;
    stockedQty: number;
    scrappedQty: number;
    completionRate: number;
    scrapRate: number;
}

export interface ProductionProductItemDto {
    productId: number;
    productName: string;
    productCategoryName: string;
    workOrders: number;
    orderQty: number;
    stockedQty: number;
    scrappedQty: number;
    completionRate: number;
    scrapRate: number;
}

export interface ProductionCategoryItemDto {
    productCategoryId: number;
    productCategoryName: string;
    workOrders: number;
    orderQty: number;
    stockedQty: number;
    scrappedQty: number;
    completionRate: number;
    scrapRate: number;
}

export interface ProductionLocationCostItemDto {
    locationId: number;
    locationName: string;
    plannedCost: number;
    actualCost: number;
    costVariance: number;
    workOrders: number;
}

export interface ProductionOperationVarianceItemDto {
    operationSequence: number;
    plannedCost: number;
    actualCost: number;
    costVariance: number;
    actualResourceHours: number;
}

export interface ProductionLocationHoursItemDto {
    locationId: number;
    locationName: string;
    actualResourceHours: number;
    plannedCost: number;
    actualCost: number;
}

export interface ProductionDelayedItemDto {
    productId: number;
    productName: string;
    locationId?: number | null;
    locationName: string;
    workOrders: number;
}

export interface ProductionInventoryItemDto {
    locationId: number;
    locationName: string;
    inventoryQty: number;
    distinctProducts: number;
}

export interface ProductionSafetyStockItemDto {
    productId: number;
    productName: string;
    inventoryQty: number;
    safetyStockLevel: number;
    reorderPoint: number;
    shortageQty: number;
}

export interface ProductionCostHistoryItemDto {
    productId: number;
    productName: string;
    startDate: string;
    endDate?: string | null;
    standardCost: number;
}

export interface ProductionBomItemDto {
    productAssemblyId: number;
    assemblyName: string;
    components: number;
    totalPerAssemblyQty: number;
    maxBomLevel: number;
}

export interface ProductionTransactionTrendPointDto {
    period: string;
    year: number;
    month: number;
    quantity: number;
    actualCost: number;
    transactions: number;
}

export interface ProductionDashboardFilterOptionsDto {
    products: ProductionFilterLookupItemDto[];
    productCategories: ProductionFilterLookupItemDto[];
    locations: ProductionLocationFilterLookupItemDto[];
    scrapReasons: ProductionFilterLookupItemDto[];
}

export interface ProductionDashboardResponseDto {
    filters: ProductionDashboardAppliedFilterDto;
    overview: ProductionOverviewDto;
    workOrderTrend: ProductionTrendPointDto[];
    outputTrend: ProductionOutputTrendPointDto[];
    topProducts: ProductionProductItemDto[];
    topScrapProducts: ProductionProductItemDto[];
    categories: ProductionCategoryItemDto[];
    locationCosts: ProductionLocationCostItemDto[];
    operationVariances: ProductionOperationVarianceItemDto[];
    locationHours: ProductionLocationHoursItemDto[];
    delayedWorkOrders: ProductionDelayedItemDto[];
    inventoryByLocation: ProductionInventoryItemDto[];
    safetyStockAlerts: ProductionSafetyStockItemDto[];
    costHistory: ProductionCostHistoryItemDto[];
    bomSummaries: ProductionBomItemDto[];
    transactionTrend: ProductionTransactionTrendPointDto[];
    filterOptions: ProductionDashboardFilterOptionsDto;
}

export interface ProductionControlExceptionFilterDto {
    startDate?: string | null;
    endDate?: string | null;
    productId?: number | null;
    productCategoryId?: number | null;
    locationId?: number | null;
    scrapReasonId?: number | null;
    makeOnly?: boolean | null;
    finishedGoodsOnly?: boolean | null;
    openOnly?: boolean | null;
    delayedOnly?: boolean | null;
    safetyStockOnly?: boolean | null;
}

export interface ProductionControlExceptionSummaryDto {
    openWorkOrders: number;
    delayedWorkOrders: number;
    highScrapWorkOrders: number;
    safetyStockAlerts: number;
}

export interface ProductionControlWorkOrderExceptionItemDto {
    workOrderId: number;
    productId: number;
    productName: string;
    productCategoryName: string;
    startDate: string;
    dueDate: string;
    endDate?: string | null;
    orderQty: number;
    stockedQty: number;
    scrappedQty: number;
    completionRate: number;
    scrapRate: number;
    isOpen: boolean;
    isDelayed: boolean;
    locationNames: string;
    latestScheduledEndDate?: string | null;
    delayDays: number;
    scrapReasonName?: string | null;
    totalPlannedCost: number;
    totalActualCost: number;
    costVariance: number;
}

export interface ProductionControlSafetyStockExceptionItemDto {
    productId: number;
    productName: string;
    productCategoryId: number;
    productCategoryName: string;
    inventoryQty: number;
    safetyStockLevel: number;
    reorderPoint: number;
    shortageQty: number;
}

export interface ProductionControlExceptionsResponseDto {
    filters: ProductionControlExceptionFilterDto;
    summary: ProductionControlExceptionSummaryDto;
    filterOptions: ProductionDashboardFilterOptionsDto;
    openWorkOrders: ProductionControlWorkOrderExceptionItemDto[];
    delayedWorkOrders: ProductionControlWorkOrderExceptionItemDto[];
    highScrapWorkOrders: ProductionControlWorkOrderExceptionItemDto[];
    safetyStockAlerts: ProductionControlSafetyStockExceptionItemDto[];
}

@Injectable({ providedIn: 'root' })
export class ProductionDashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/productiondashboard`;
    private readonly productionControlApiUrl = `${environment.apiUrl}/api/productiondashboard/exceptions`;
    private readonly dashboardCache = new Map<string, ProductionDashboardResponseDto>();
    private readonly productionControlCache = new Map<string, ProductionControlExceptionsResponseDto>();
    private readonly sessionStorageKey = 'production-dashboard-cache-v2';
    private readonly productionControlSessionStorageKey = 'production-control-dashboard-cache-v2';

    constructor() {
        this.restoreDashboardCacheFromSessionStorage();
        this.restoreProductionControlCacheFromSessionStorage();
    }

    getCachedDashboard(filter: ProductionDashboardFilter): ProductionDashboardResponseDto | null {
        return this.dashboardCache.get(this.buildCacheKey(filter)) ?? null;
    }

    getCachedProductionControlExceptions(filter: ProductionDashboardFilter): ProductionControlExceptionsResponseDto | null {
        return this.productionControlCache.get(this.buildCacheKey(filter)) ?? null;
    }

    getDashboard(filter: ProductionDashboardFilter, forceRefresh = false): Observable<ProductionDashboardResponseDto> {
        const cacheKey = this.buildCacheKey(filter);
        const cached = this.dashboardCache.get(cacheKey);

        if (!forceRefresh && cached) {
            return of(cached);
        }

        const params = this.buildQueryParams(filter);

        return this.http.get<ProductionDashboardResponseDto>(this.apiUrl, { params }).pipe(
            tap((response) => {
                this.dashboardCache.set(cacheKey, response);
                this.persistDashboardCacheToSessionStorage();
            })
        );
    }

    getProductionControlExceptions(filter: ProductionDashboardFilter, forceRefresh = false): Observable<ProductionControlExceptionsResponseDto> {
        const cacheKey = this.buildCacheKey(filter);
        const cached = this.productionControlCache.get(cacheKey);

        if (!forceRefresh && cached) {
            return of(cached);
        }

        const params = this.buildQueryParams(filter);

        return this.http.get<ProductionControlExceptionsResponseDto>(this.productionControlApiUrl, { params }).pipe(
            tap((response) => {
                this.productionControlCache.set(cacheKey, response);
                this.persistProductionControlCacheToSessionStorage();
            })
        );
    }

    private restoreDashboardCacheFromSessionStorage(): void {
        const rawCache = sessionStorage.getItem(this.sessionStorageKey);
        if (!rawCache) {
            return;
        }

        try {
            const entries = JSON.parse(rawCache) as [string, ProductionDashboardResponseDto][];
            this.dashboardCache.clear();

            for (const [key, value] of entries) {
                this.dashboardCache.set(key, value);
            }
        } catch {
            sessionStorage.removeItem(this.sessionStorageKey);
            this.dashboardCache.clear();
        }
    }

    private restoreProductionControlCacheFromSessionStorage(): void {
        const rawCache = sessionStorage.getItem(this.productionControlSessionStorageKey);
        if (!rawCache) {
            return;
        }

        try {
            const entries = JSON.parse(rawCache) as [string, ProductionControlExceptionsResponseDto][];
            this.productionControlCache.clear();

            for (const [key, value] of entries) {
                this.productionControlCache.set(key, value);
            }
        } catch {
            sessionStorage.removeItem(this.productionControlSessionStorageKey);
            this.productionControlCache.clear();
        }
    }

    private persistDashboardCacheToSessionStorage(): void {
        sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(Array.from(this.dashboardCache.entries())));
    }

    private persistProductionControlCacheToSessionStorage(): void {
        sessionStorage.setItem(this.productionControlSessionStorageKey, JSON.stringify(Array.from(this.productionControlCache.entries())));
    }

    private buildQueryParams(filter: ProductionDashboardFilter): HttpParams {
        let params = new HttpParams();

        if (filter.startDate) params = params.set('startDate', filter.startDate);
        if (filter.endDate) params = params.set('endDate', filter.endDate);
        if (filter.productId != null) params = params.set('productId', filter.productId);
        if (filter.productCategoryId != null) params = params.set('productCategoryId', filter.productCategoryId);
        if (filter.locationId != null) params = params.set('locationId', filter.locationId);
        if (filter.scrapReasonId != null) params = params.set('scrapReasonId', filter.scrapReasonId);
        if (filter.makeOnly != null) params = params.set('makeOnly', filter.makeOnly);
        if (filter.finishedGoodsOnly != null) params = params.set('finishedGoodsOnly', filter.finishedGoodsOnly);
        if (filter.openOnly != null) params = params.set('openOnly', filter.openOnly);
        if (filter.delayedOnly != null) params = params.set('delayedOnly', filter.delayedOnly);
        if (filter.safetyStockOnly != null) params = params.set('safetyStockOnly', filter.safetyStockOnly);

        return params;
    }

    private buildCacheKey(filter: ProductionDashboardFilter): string {
        return JSON.stringify({
            startDate: filter.startDate ?? null,
            endDate: filter.endDate ?? null,
            productId: filter.productId ?? null,
            productCategoryId: filter.productCategoryId ?? null,
            locationId: filter.locationId ?? null,
            scrapReasonId: filter.scrapReasonId ?? null,
            makeOnly: filter.makeOnly ?? null,
            finishedGoodsOnly: filter.finishedGoodsOnly ?? null,
            openOnly: filter.openOnly ?? null,
            delayedOnly: filter.delayedOnly ?? null,
            safetyStockOnly: filter.safetyStockOnly ?? null
        });
    }
}
