import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ISDashboardFilter {
    startDate?: string | null;
    endDate?: string | null;
    departmentId?: number | null;
    errorNumber?: number | null;
}

export interface ISFilterLookupItemDto {
    id: number;
    name: string;
}

export interface ISDashboardAppliedFilterDto {
    startDate?: string | null;
    endDate?: string | null;
    departmentId?: number | null;
    errorNumber?: number | null;
}

export interface ISOverviewDto {
    totalSystemErrors: number;
    totalDatabaseChanges: number;
    totalUserAccounts: number;
    activeUserAccounts: number;
    totalDepartments: number;
    recentPasswordChanges: number;
    currentDatabaseVersion: string;
    lastDatabaseUpdate?: string | null;
}

export interface ISErrorTrendDto {
    period: string;
    year: number;
    month: number;
    day: number;
    errorCount: number;
}

export interface ISTopErrorDto {
    errorNumber: number;
    errorMessage: string;
    errorCount: number;
    lastOccurrence?: string | null;
}

export interface ISUserErrorDto {
    userName: string;
    errorCount: number;
    lastError?: string | null;
}

export interface ISDatabaseActivityDto {
    databaseUser: string;
    event: string;
    activityCount: number;
    lastActivity?: string | null;
}

export interface ISEventTypeDto {
    eventType: string;
    eventCount: number;
    percentage: number;
}

export interface ISUserAccountDto {
    departmentId: number;
    departmentName: string;
    userCount: number;
    activeUserCount: number;
}

export interface ISPasswordAgeDto {
    ageRange: string;
    userCount: number;
    percentage: number;
}

export interface ISDashboardFilterOptionsDto {
    departments: ISFilterLookupItemDto[];
    errorNumbers: ISFilterLookupItemDto[];
}

export interface ISDashboardResponseDto {
    filters: ISDashboardAppliedFilterDto;
    overview: ISOverviewDto;
    errorTrend: ISErrorTrendDto[];
    topErrors: ISTopErrorDto[];
    usersWithMostErrors: ISUserErrorDto[];
    databaseActivity: ISDatabaseActivityDto[];
    eventTypeDistribution: ISEventTypeDto[];
    userAccountsByDepartment: ISUserAccountDto[];
    passwordAgeDistribution: ISPasswordAgeDto[];
    filterOptions: ISDashboardFilterOptionsDto;
}

@Injectable({ providedIn: 'root' })
export class ISDashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/isdashboard`;

    getDashboard(filter: ISDashboardFilter): Observable<ISDashboardResponseDto> {
        let params = new HttpParams();

        if (filter.startDate) params = params.set('startDate', filter.startDate);
        if (filter.endDate) params = params.set('endDate', filter.endDate);
        if (filter.departmentId != null) params = params.set('departmentId', filter.departmentId);
        if (filter.errorNumber != null) params = params.set('errorNumber', filter.errorNumber);

        return this.http.get<ISDashboardResponseDto>(this.apiUrl, { params });
    }
}
