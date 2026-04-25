import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface HRDashboardFilter {
    startDate?: string | null;
    endDate?: string | null;
    departmentId?: number | null;
    gender?: string | null;
    salariedOnly?: boolean | null;
    activeOnly?: boolean | null;
}

export interface HRFilterLookupItemDto {
    id: number;
    name: string;
}

export interface HRDashboardAppliedFilterDto {
    startDate?: string | null;
    endDate?: string | null;
    departmentId?: number | null;
    gender?: string | null;
    salariedOnly?: boolean | null;
    activeOnly?: boolean | null;
}

export interface HROverviewDto {
    totalEmployees: number;
    activeEmployees: number;
    totalDepartments: number;
    averagePayRate: number;
    averageVacationHours: number;
    averageSickLeaveHours: number;
    averageTenureYears: number;
    salariedEmployees: number;
}

export interface HRTrendPointDto {
    period: string;
    year: number;
    month: number;
    newHires: number;
    totalEmployees: number;
}

export interface HRDepartmentItemDto {
    departmentId: number;
    departmentName: string;
    employeeCount: number;
    averagePayRate: number;
}

export interface HRJobTitleItemDto {
    jobTitle: string;
    employeeCount: number;
    averagePayRate: number;
    averageVacationHours: number;
}

export interface HRGenderItemDto {
    gender: string;
    genderLabel: string;
    employeeCount: number;
    percentage: number;
}

export interface HRPayRateItemDto {
    departmentId: number;
    departmentName: string;
    minPayRate: number;
    maxPayRate: number;
    averagePayRate: number;
}

export interface HRTenureItemDto {
    tenureRange: string;
    employeeCount: number;
    percentage: number;
}

export interface HRShiftItemDto {
    shiftId: number;
    shiftName: string;
    employeeCount: number;
    percentage: number;
}

export interface HRDashboardFilterOptionsDto {
    departments: HRFilterLookupItemDto[];
}

export interface HRDashboardResponseDto {
    filters: HRDashboardAppliedFilterDto;
    overview: HROverviewDto;
    employeeTrend: HRTrendPointDto[];
    employeesByDepartment: HRDepartmentItemDto[];
    topJobTitles: HRJobTitleItemDto[];
    genderDistribution: HRGenderItemDto[];
    payRateByDepartment: HRPayRateItemDto[];
    employeeTenure: HRTenureItemDto[];
    shiftDistribution: HRShiftItemDto[];
    filterOptions: HRDashboardFilterOptionsDto;
}

@Injectable({ providedIn: 'root' })
export class HRDashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/hrdashboard`;

    getDashboard(filter: HRDashboardFilter): Observable<HRDashboardResponseDto> {
        let params = new HttpParams();

        if (filter.startDate) params = params.set('startDate', filter.startDate);
        if (filter.endDate) params = params.set('endDate', filter.endDate);
        if (filter.departmentId != null) params = params.set('departmentId', filter.departmentId);
        if (filter.gender) params = params.set('gender', filter.gender);
        if (filter.salariedOnly != null) params = params.set('salariedOnly', filter.salariedOnly);
        if (filter.activeOnly != null) params = params.set('activeOnly', filter.activeOnly);

        return this.http.get<HRDashboardResponseDto>(this.apiUrl, { params });
    }
}
