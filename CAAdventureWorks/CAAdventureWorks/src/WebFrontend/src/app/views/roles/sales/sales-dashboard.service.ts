import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SalesDashboardFilter {
    startDate?: string | null;
    endDate?: string | null;
    territoryId?: number | null;
    salesPersonId?: number | null;
    productCategoryId?: number | null;
    onlineOrderFlag?: boolean | null;
}

export interface SalesFilterLookupItem {
    id: number;
    name: string;
}

export interface SalesDashboardAppliedFilterDto {
    startDate?: string | null;
    endDate?: string | null;
    territoryId?: number | null;
    salesPersonId?: number | null;
    productCategoryId?: number | null;
    onlineOrderFlag?: boolean | null;
}

export interface SalesOverviewDto {
    totalRevenue: number;
    netSales: number;
    totalOrders: number;
    unitsSold: number;
    averageOrderValue: number;
    onlineOrderRate: number;
    cancellationRate: number;
    onTimeShippingRate: number;
    discountRate: number;
    freightRatio: number;
}

export interface RevenueTrendPointDto {
    period: string;
    year: number;
    month: number;
    revenue: number;
    orders: number;
}

export interface SalesPerformanceItemDto {
    id: number;
    name: string;
    group?: string | null;
    revenue: number;
    orders: number;
    target?: number | null;
    achievementRate?: number | null;
}

export interface CategoryMixItemDto {
    category: string;
    subcategory: string;
    revenue: number;
    unitsSold: number;
}

export interface ProductPerformanceItemDto {
    productId: number;
    productName: string;
    category: string;
    revenue: number;
    unitsSold: number;
    discountAmount: number;
}

export interface CustomerSegmentItemDto {
    segment: string;
    revenue: number;
    orders: number;
    customers: number;
}

export interface OrderStatusItemDto {
    status: number;
    statusLabel: string;
    orders: number;
    revenue: number;
}

export interface QuotaSummaryDto {
    actualSales: number;
    targetSales: number;
    achievementRate: number;
    gapToTarget: number;
}

export interface ShippingSummaryDto {
    onTimeRate: number;
    averageLeadTimeDays: number;
    freightTotal: number;
    freightPerOrder: number;
}

export interface SalesReasonItemDto {
    salesReasonId: number;
    name: string;
    reasonType: string;
    revenue: number;
    orders: number;
}

export interface SalesDashboardFilterOptionsDto {
    territories: SalesFilterLookupItem[];
    salesPeople: SalesFilterLookupItem[];
    categories: SalesFilterLookupItem[];
}

export interface SalesDashboardResponseDto {
    filters: SalesDashboardAppliedFilterDto;
    overview: SalesOverviewDto;
    revenueTrend: RevenueTrendPointDto[];
    salesByPerson: SalesPerformanceItemDto[];
    salesByTerritory: SalesPerformanceItemDto[];
    categoryMix: CategoryMixItemDto[];
    topProducts: ProductPerformanceItemDto[];
    customerSegments: CustomerSegmentItemDto[];
    orderStatuses: OrderStatusItemDto[];
    quota: QuotaSummaryDto;
    shipping: ShippingSummaryDto;
    salesReasons: SalesReasonItemDto[];
    filterOptions: SalesDashboardFilterOptionsDto;
}

@Injectable({ providedIn: 'root' })
export class SalesDashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/salesdashboard`;

    getDashboard(filter: SalesDashboardFilter): Observable<SalesDashboardResponseDto> {
        let params = new HttpParams();

        if (filter.startDate) {
            params = params.set('startDate', filter.startDate);
        }

        if (filter.endDate) {
            params = params.set('endDate', filter.endDate);
        }

        if (filter.territoryId != null) {
            params = params.set('territoryId', filter.territoryId);
        }

        if (filter.salesPersonId != null) {
            params = params.set('salesPersonId', filter.salesPersonId);
        }

        if (filter.productCategoryId != null) {
            params = params.set('productCategoryId', filter.productCategoryId);
        }

        if (filter.onlineOrderFlag != null) {
            params = params.set('onlineOrderFlag', filter.onlineOrderFlag);
        }

        return this.http.get<SalesDashboardResponseDto>(this.apiUrl, { params });
    }
}
