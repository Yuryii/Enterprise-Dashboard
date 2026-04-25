import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface FinanceDashboardFilter {
    startDate?: string | null;
    endDate?: string | null;
    currencyCode?: string | null;
    territoryId?: number | null;
}

export interface FinanceFilterLookupItemDto {
    id: number;
    name: string;
}

export interface FinanceDashboardAppliedFilterDto {
    startDate?: string | null;
    endDate?: string | null;
    currencyCode?: string | null;
    territoryId?: number | null;
}

export interface FinanceOverviewDto {
    totalRevenue: number;
    totalExpense: number;
    grossProfit: number;
    profitMargin: number;
    totalTax: number;
    averageTaxRate: number;
    cashFlow: number;
    totalOrders: number;
}

export interface FinanceTrendPointDto {
    period: string;
    year: number;
    month: number;
    amount: number;
    count: number;
}

export interface FinanceTaxItemDto {
    stateProvinceId: number;
    stateProvinceName: string;
    totalTax: number;
    averageTaxRate: number;
    orderCount: number;
}

export interface FinanceCurrencyItemDto {
    currencyCode: string;
    currencyName: string;
    totalRevenue: number;
    orderCount: number;
    percentage: number;
}

export interface FinancePaymentMethodItemDto {
    paymentMethod: string;
    totalAmount: number;
    orderCount: number;
    percentage: number;
}

export interface FinanceCashFlowItemDto {
    period: string;
    year: number;
    month: number;
    cashIn: number;
    cashOut: number;
    netCashFlow: number;
}

export interface FinanceDashboardFilterOptionsDto {
    currencies: FinanceFilterLookupItemDto[];
    territories: FinanceFilterLookupItemDto[];
}

export interface FinanceDashboardResponseDto {
    filters: FinanceDashboardAppliedFilterDto;
    overview: FinanceOverviewDto;
    revenueTrend: FinanceTrendPointDto[];
    expenseTrend: FinanceTrendPointDto[];
    profitTrend: FinanceTrendPointDto[];
    taxByRegion: FinanceTaxItemDto[];
    revenueByCurrency: FinanceCurrencyItemDto[];
    paymentMethods: FinancePaymentMethodItemDto[];
    cashFlow: FinanceCashFlowItemDto[];
    filterOptions: FinanceDashboardFilterOptionsDto;
}

@Injectable({
    providedIn: 'root'
})
export class FinanceDashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/financedashboard`;

    getDashboard(filter: FinanceDashboardFilter): Observable<FinanceDashboardResponseDto> {
        let params = new HttpParams();

        if (filter.startDate) {
            params = params.set('startDate', filter.startDate);
        }
        if (filter.endDate) {
            params = params.set('endDate', filter.endDate);
        }
        if (filter.currencyCode) {
            params = params.set('currencyCode', filter.currencyCode);
        }
        if (filter.territoryId !== null && filter.territoryId !== undefined) {
            params = params.set('territoryId', filter.territoryId.toString());
        }

        return this.http.get<FinanceDashboardResponseDto>(this.apiUrl, { params });
    }
}
