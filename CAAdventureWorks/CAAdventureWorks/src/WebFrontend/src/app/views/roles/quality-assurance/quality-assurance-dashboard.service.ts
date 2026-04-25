import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface QualityAssuranceDashboardFilter {
    startDate?: string | null;
    endDate?: string | null;
    scrapReasonId?: number | null;
    productCategoryId?: number | null;
    locationId?: number | null;
    vendorId?: number | null;
    currentInspectorsOnly?: boolean | null;
}

export interface QualityFilterLookupItemDto {
    id: number;
    name: string;
}

export interface QualityLocationFilterLookupItemDto {
    id: number;
    name: string;
}

export interface QualityAssuranceDashboardAppliedFilterDto {
    startDate?: string | null;
    endDate?: string | null;
    scrapReasonId?: number | null;
    productCategoryId?: number | null;
    locationId?: number | null;
    vendorId?: number | null;
    currentInspectorsOnly?: boolean | null;
}

export interface QualityAssuranceOverviewDto {
    totalWorkOrders: number;
    totalOrderQty: number;
    totalScrappedQty: number;
    scrapRate: number;
    completionRate: number;
    ordersWithDefects: number;
    activeInspectors: number;
    vendorRejectRate: number;
}

export interface QualityTrendPointDto {
    period: string;
    year: number;
    month: number;
    workOrders: number;
    scrappedQty: number;
    scrapRate: number;
}

export interface QualityScrapReasonItemDto {
    scrapReasonId: number;
    scrapReasonName: string;
    workOrders: number;
    scrappedQty: number;
}

export interface QualityProductItemDto {
    productId: number;
    productName: string;
    productCategoryName: string;
    workOrders: number;
    scrappedQty: number;
    scrapRate: number;
}

export interface QualityCategoryItemDto {
    productCategoryId: number;
    productCategoryName: string;
    workOrders: number;
    scrappedQty: number;
    scrapRate: number;
}

export interface QualityLocationItemDto {
    locationId: number;
    locationName: string;
    plannedCost: number;
    actualCost: number;
    actualResourceHours: number;
    workOrders: number;
}

export interface QualityVendorItemDto {
    vendorId: number;
    vendorName: string;
    receivedQty: number;
    rejectedQty: number;
    rejectRate: number;
}

export interface QualityDepartmentItemDto {
    departmentId: number;
    departmentName: string;
    groupName: string;
    headcount: number;
}

export interface QualityAssuranceDashboardFilterOptionsDto {
    scrapReasons: QualityFilterLookupItemDto[];
    productCategories: QualityFilterLookupItemDto[];
    locations: QualityLocationFilterLookupItemDto[];
    vendors: QualityFilterLookupItemDto[];
}

export interface QualityAssuranceDashboardResponseDto {
    filters: QualityAssuranceDashboardAppliedFilterDto;
    overview: QualityAssuranceOverviewDto;
    defectTrend: QualityTrendPointDto[];
    topScrapReasons: QualityScrapReasonItemDto[];
    topDefectProducts: QualityProductItemDto[];
    defectsByCategory: QualityCategoryItemDto[];
    defectsByLocation: QualityLocationItemDto[];
    vendorRejectRates: QualityVendorItemDto[];
    inspectorHeadcount: QualityDepartmentItemDto[];
    filterOptions: QualityAssuranceDashboardFilterOptionsDto;
}

@Injectable({ providedIn: 'root' })
export class QualityAssuranceDashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/qualityassurancedashboard`;

    getDashboard(filter: QualityAssuranceDashboardFilter): Observable<QualityAssuranceDashboardResponseDto> {
        let params = new HttpParams();

        if (filter.startDate) params = params.set('startDate', filter.startDate);
        if (filter.endDate) params = params.set('endDate', filter.endDate);
        if (filter.scrapReasonId != null) params = params.set('scrapReasonId', filter.scrapReasonId);
        if (filter.productCategoryId != null) params = params.set('productCategoryId', filter.productCategoryId);
        if (filter.locationId != null) params = params.set('locationId', filter.locationId);
        if (filter.vendorId != null) params = params.set('vendorId', filter.vendorId);
        if (filter.currentInspectorsOnly != null) params = params.set('currentInspectorsOnly', filter.currentInspectorsOnly);

        return this.http.get<QualityAssuranceDashboardResponseDto>(this.apiUrl, { params });
    }
}
