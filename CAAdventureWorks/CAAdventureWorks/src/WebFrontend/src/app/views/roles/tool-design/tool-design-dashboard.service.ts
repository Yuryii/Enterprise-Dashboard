import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface ToolDesignDashboardFilter {
    productModelId?: number | null;
    productId?: number | null;
    productCategoryId?: number | null;
    locationId?: number | null;
    vendorId?: number | null;
    makeOnly?: boolean | null;
    finishedGoodsOnly?: boolean | null;
    minDaysToManufacture?: number | null;
    minStandardCost?: number | null;
}

export interface ToolDesignFilterLookupItemDto {
    id: number;
    name: string;
}

export interface ToolDesignLocationFilterLookupItemDto {
    id: number;
    name: string;
}

export interface ToolDesignDashboardAppliedFilterDto {
    productModelId?: number | null;
    productId?: number | null;
    productCategoryId?: number | null;
    locationId?: number | null;
    vendorId?: number | null;
    makeOnly?: boolean | null;
    finishedGoodsOnly?: boolean | null;
    minDaysToManufacture?: number | null;
    minStandardCost?: number | null;
}

export interface ToolDesignOverviewDto {
    totalModels: number;
    totalProducts: number;
    modelsWithInstructions: number;
    instructionCoverageRate: number;
    complexModels: number;
    vendorDependentProducts: number;
    activeWorkCenters: number;
    bomAssemblies: number;
}

export interface ToolDesignModelCountItemDto {
    productModelId: number;
    modelName: string;
    productCount: number;
}

export interface ToolDesignStatusItemDto {
    status: string;
    models: number;
}

export interface ToolDesignComplexityItemDto {
    productModelId: number;
    modelName: string;
    averageDaysToManufacture: number;
    averageStandardCost: number;
    productCount: number;
}

export interface ToolDesignCostItemDto {
    productModelId: number;
    modelName: string;
    averageStandardCost: number;
    maxStandardCost: number;
}

export interface ToolDesignCategoryMixItemDto {
    productCategoryId: number;
    categoryName: string;
    models: number;
    products: number;
}

export interface ToolDesignLocationLoadItemDto {
    locationId: number;
    locationName: string;
    routingSteps: number;
    workOrders: number;
}

export interface ToolDesignCostVarianceItemDto {
    locationId: number;
    locationName: string;
    plannedCost: number;
    actualCost: number;
    costVariance: number;
}

export interface ToolDesignLeadTimeItemDto {
    id: number;
    name: string;
    averageLeadTime: number;
    productCount: number;
}

export interface ToolDesignBomComplexityItemDto {
    productAssemblyId: number;
    assemblyName: string;
    components: number;
    totalPerAssemblyQty: number;
    maxBomLevel: number;
}

export interface ToolDesignInventorySupportItemDto {
    locationId: number;
    locationName: string;
    inventoryQty: number;
    distinctProducts: number;
}

export interface ToolDesignDashboardFilterOptionsDto {
    productModels: ToolDesignFilterLookupItemDto[];
    products: ToolDesignFilterLookupItemDto[];
    productCategories: ToolDesignFilterLookupItemDto[];
    locations: ToolDesignLocationFilterLookupItemDto[];
    vendors: ToolDesignFilterLookupItemDto[];
}

export interface ToolDesignDashboardResponseDto {
    filters: ToolDesignDashboardAppliedFilterDto;
    overview: ToolDesignOverviewDto;
    modelsByProductCount: ToolDesignModelCountItemDto[];
    instructionCoverage: ToolDesignStatusItemDto[];
    topComplexModels: ToolDesignComplexityItemDto[];
    topCostModels: ToolDesignCostItemDto[];
    categoryMix: ToolDesignCategoryMixItemDto[];
    locationLoads: ToolDesignLocationLoadItemDto[];
    locationCostVariances: ToolDesignCostVarianceItemDto[];
    vendorLeadTimes: ToolDesignLeadTimeItemDto[];
    bomComplexities: ToolDesignBomComplexityItemDto[];
    inventorySupport: ToolDesignInventorySupportItemDto[];
    filterOptions: ToolDesignDashboardFilterOptionsDto;
}

@Injectable({ providedIn: 'root' })
export class ToolDesignDashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/tooldesigndashboard`;
    private readonly cache = new Map<string, ToolDesignDashboardResponseDto>();
    private readonly sessionStorageKey = 'tool-design-dashboard-cache';

    constructor() {
        this.restoreCacheFromSessionStorage();
    }

    getCachedDashboard(filter: ToolDesignDashboardFilter): ToolDesignDashboardResponseDto | null {
        return this.cache.get(this.buildCacheKey(filter)) ?? null;
    }

    getDashboard(filter: ToolDesignDashboardFilter, forceRefresh = false): Observable<ToolDesignDashboardResponseDto> {
        const cacheKey = this.buildCacheKey(filter);
        const cached = this.cache.get(cacheKey);

        if (!forceRefresh && cached) {
            return of(cached);
        }

        const params = this.buildQueryParams(filter);
        return this.http.get<ToolDesignDashboardResponseDto>(this.apiUrl, { params }).pipe(
            tap((response) => {
                this.cache.set(cacheKey, response);
                this.persistCacheToSessionStorage();
            })
        );
    }

    private restoreCacheFromSessionStorage(): void {
        const rawCache = sessionStorage.getItem(this.sessionStorageKey);
        if (!rawCache) {
            return;
        }

        try {
            const entries = JSON.parse(rawCache) as [string, ToolDesignDashboardResponseDto][];
            this.cache.clear();
            for (const [key, value] of entries) {
                this.cache.set(key, value);
            }
        } catch {
            sessionStorage.removeItem(this.sessionStorageKey);
            this.cache.clear();
        }
    }

    private persistCacheToSessionStorage(): void {
        sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(Array.from(this.cache.entries())));
    }

    private buildQueryParams(filter: ToolDesignDashboardFilter): HttpParams {
        let params = new HttpParams();

        if (filter.productModelId != null) params = params.set('productModelId', filter.productModelId);
        if (filter.productId != null) params = params.set('productId', filter.productId);
        if (filter.productCategoryId != null) params = params.set('productCategoryId', filter.productCategoryId);
        if (filter.locationId != null) params = params.set('locationId', filter.locationId);
        if (filter.vendorId != null) params = params.set('vendorId', filter.vendorId);
        if (filter.makeOnly != null) params = params.set('makeOnly', filter.makeOnly);
        if (filter.finishedGoodsOnly != null) params = params.set('finishedGoodsOnly', filter.finishedGoodsOnly);
        if (filter.minDaysToManufacture != null) params = params.set('minDaysToManufacture', filter.minDaysToManufacture);
        if (filter.minStandardCost != null) params = params.set('minStandardCost', filter.minStandardCost);

        return params;
    }

    private buildCacheKey(filter: ToolDesignDashboardFilter): string {
        return JSON.stringify({
            productModelId: filter.productModelId ?? null,
            productId: filter.productId ?? null,
            productCategoryId: filter.productCategoryId ?? null,
            locationId: filter.locationId ?? null,
            vendorId: filter.vendorId ?? null,
            makeOnly: filter.makeOnly ?? null,
            finishedGoodsOnly: filter.finishedGoodsOnly ?? null,
            minDaysToManufacture: filter.minDaysToManufacture ?? null,
            minStandardCost: filter.minStandardCost ?? null
        });
    }
}
