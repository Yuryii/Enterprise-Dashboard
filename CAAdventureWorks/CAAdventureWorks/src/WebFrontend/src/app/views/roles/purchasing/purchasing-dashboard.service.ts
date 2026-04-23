import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PurchasingDashboardFilter {
    startDate?: string | null;
    endDate?: string | null;
    vendorId?: number | null;
    status?: number | null;
    shipMethodId?: number | null;
    productId?: number | null;
    preferredVendorOnly?: boolean | null;
    activeVendorOnly?: boolean | null;
}

export interface PurchasingFilterLookupItemDto {
    id: number;
    name: string;
}

export interface PurchasingDashboardAppliedFilterDto {
    startDate?: string | null;
    endDate?: string | null;
    vendorId?: number | null;
    status?: number | null;
    shipMethodId?: number | null;
    productId?: number | null;
    preferredVendorOnly?: boolean | null;
    activeVendorOnly?: boolean | null;
}

export interface PurchasingOverviewDto {
    totalSpend: number;
    totalOrders: number;
    averageOrderValue: number;
    totalOrderedQty: number;
    receiveRate: number;
    rejectRate: number;
    activeVendors: number;
    preferredVendors: number;
}

export interface PurchasingTrendPointDto {
    period: string;
    year: number;
    month: number;
    totalSpend: number;
    orders: number;
}

export interface PurchasingStatusItemDto {
    status: number;
    statusLabel: string;
    orders: number;
    totalSpend: number;
}

export interface PurchasingVendorItemDto {
    vendorId: number;
    vendorName: string;
    totalSpend: number;
    orders: number;
    averageOrderValue: number;
}

export interface PurchasingProductItemDto {
    productId: number;
    productName: string;
    orderedQty: number;
    lineTotal: number;
    averageUnitPrice: number;
}

export interface PurchasingVendorRateItemDto {
    vendorId: number;
    vendorName: string;
    receiveRate: number;
    rejectRate: number;
    stockedRate: number;
}

export interface PurchasingVendorLeadTimeItemDto {
    vendorId: number;
    vendorName: string;
    averageLeadTimeDays: number;
    productCount: number;
    averageStandardPrice: number;
}

export interface PurchasingLocationItemDto {
    country: string;
    stateProvince: string;
    vendorCount: number;
}

export interface PurchasingDashboardFilterOptionsDto {
    vendors: PurchasingFilterLookupItemDto[];
    shipMethods: PurchasingFilterLookupItemDto[];
    products: PurchasingFilterLookupItemDto[];
}

export interface PurchasingDashboardResponseDto {
    filters: PurchasingDashboardAppliedFilterDto;
    overview: PurchasingOverviewDto;
    spendTrend: PurchasingTrendPointDto[];
    orderStatuses: PurchasingStatusItemDto[];
    topVendors: PurchasingVendorItemDto[];
    topProducts: PurchasingProductItemDto[];
    vendorDeliveryRates: PurchasingVendorRateItemDto[];
    vendorLeadTimes: PurchasingVendorLeadTimeItemDto[];
    vendorsByRegion: PurchasingLocationItemDto[];
    filterOptions: PurchasingDashboardFilterOptionsDto;
}

@Injectable({ providedIn: 'root' })
export class PurchasingDashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/purchasingdashboard`;

    getDashboard(filter: PurchasingDashboardFilter): Observable<PurchasingDashboardResponseDto> {
        let params = new HttpParams();

        if (filter.startDate) params = params.set('startDate', filter.startDate);
        if (filter.endDate) params = params.set('endDate', filter.endDate);
        if (filter.vendorId != null) params = params.set('vendorId', filter.vendorId);
        if (filter.status != null) params = params.set('status', filter.status);
        if (filter.shipMethodId != null) params = params.set('shipMethodId', filter.shipMethodId);
        if (filter.productId != null) params = params.set('productId', filter.productId);
        if (filter.preferredVendorOnly != null) params = params.set('preferredVendorOnly', filter.preferredVendorOnly);
        if (filter.activeVendorOnly != null) params = params.set('activeVendorOnly', filter.activeVendorOnly);

        return this.http.get<PurchasingDashboardResponseDto>(this.apiUrl, { params });
    }
}
