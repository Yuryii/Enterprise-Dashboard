import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ExecutiveDashboardFilter {
    startDate?: string | null;
    endDate?: string | null;
    territoryId?: number | null;
    salesPersonId?: number | null;
    vendorId?: number | null;
    departmentId?: number | null;
    productCategoryId?: number | null;
    currentEmployeesOnly?: boolean | null;
}

export interface ExecutiveFilterLookupItemDto {
    id: number;
    name: string;
}

export interface ExecutiveDepartmentFilterLookupItemDto {
    id: number;
    name: string;
    groupName: string;
}

export interface ExecutiveDashboardAppliedFilterDto {
    startDate?: string | null;
    endDate?: string | null;
    territoryId?: number | null;
    salesPersonId?: number | null;
    vendorId?: number | null;
    departmentId?: number | null;
    productCategoryId?: number | null;
    currentEmployeesOnly?: boolean | null;
}

export interface ExecutiveOverviewDto {
    totalRevenue: number;
    totalSpend: number;
    operatingGap: number;
    salesOrders: number;
    purchaseOrders: number;
    activeEmployees: number;
    workOrders: number;
    productionCompletionRate: number;
    productionScrapRate: number;
}

export interface ExecutiveTrendPointDto {
    period: string;
    year: number;
    month: number;
    revenue: number;
    spend: number;
    operatingGap: number;
}

export interface ExecutiveTerritoryRevenueItemDto {
    territoryId: number;
    territoryName: string;
    territoryGroup: string;
    revenue: number;
    orders: number;
}

export interface ExecutiveSalesPersonItemDto {
    salesPersonId: number;
    salesPersonName: string;
    territoryName: string;
    revenue: number;
    orders: number;
    salesQuota?: number | null;
    achievementRate?: number | null;
}

export interface ExecutiveDepartmentHeadcountItemDto {
    departmentId: number;
    departmentName: string;
    groupName: string;
    headcount: number;
}

export interface ExecutiveHeadcountGroupItemDto {
    groupName: string;
    headcount: number;
}

export interface ExecutiveVendorSpendItemDto {
    vendorId: number;
    vendorName: string;
    totalSpend: number;
    orders: number;
    averageOrderValue: number;
}

export interface ExecutiveVendorReceivingRateItemDto {
    vendorId: number;
    vendorName: string;
    receivingRate: number;
    receivedQty: number;
    orderedQty: number;
}

export interface ExecutiveProductionCategoryItemDto {
    productCategoryId: number;
    productCategoryName: string;
    workOrders: number;
    orderQty: number;
    stockedQty: number;
    scrappedQty: number;
    completionRate: number;
    scrapRate: number;
}

export interface ExecutiveOrderStatusItemDto {
    source: string;
    status: number;
    statusLabel: string;
    orders: number;
}

export interface ExecutiveDashboardFilterOptionsDto {
    territories: ExecutiveFilterLookupItemDto[];
    salesPeople: ExecutiveFilterLookupItemDto[];
    vendors: ExecutiveFilterLookupItemDto[];
    departments: ExecutiveDepartmentFilterLookupItemDto[];
    productCategories: ExecutiveFilterLookupItemDto[];
}

export interface ExecutiveDashboardResponseDto {
    filters: ExecutiveDashboardAppliedFilterDto;
    overview: ExecutiveOverviewDto;
    revenueVsSpendTrend: ExecutiveTrendPointDto[];
    revenueByTerritory: ExecutiveTerritoryRevenueItemDto[];
    topSalesPeople: ExecutiveSalesPersonItemDto[];
    headcountByDepartment: ExecutiveDepartmentHeadcountItemDto[];
    headcountByGroup: ExecutiveHeadcountGroupItemDto[];
    topVendors: ExecutiveVendorSpendItemDto[];
    vendorReceivingRates: ExecutiveVendorReceivingRateItemDto[];
    productionByCategory: ExecutiveProductionCategoryItemDto[];
    salesOrderStatuses: ExecutiveOrderStatusItemDto[];
    purchaseOrderStatuses: ExecutiveOrderStatusItemDto[];
    filterOptions: ExecutiveDashboardFilterOptionsDto;
}

@Injectable({ providedIn: 'root' })
export class ExecutiveDashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/executivedashboard`;

    getDashboard(filter: ExecutiveDashboardFilter): Observable<ExecutiveDashboardResponseDto> {
        let params = new HttpParams();

        if (filter.startDate) params = params.set('startDate', filter.startDate);
        if (filter.endDate) params = params.set('endDate', filter.endDate);
        if (filter.territoryId != null) params = params.set('territoryId', filter.territoryId);
        if (filter.salesPersonId != null) params = params.set('salesPersonId', filter.salesPersonId);
        if (filter.vendorId != null) params = params.set('vendorId', filter.vendorId);
        if (filter.departmentId != null) params = params.set('departmentId', filter.departmentId);
        if (filter.productCategoryId != null) params = params.set('productCategoryId', filter.productCategoryId);
        if (filter.currentEmployeesOnly != null) params = params.set('currentEmployeesOnly', filter.currentEmployeesOnly);

        return this.http.get<ExecutiveDashboardResponseDto>(this.apiUrl, { params });
    }
}
