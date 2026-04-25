import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DocumentControlDashboardFilter {
    startDate?: string | null;
    endDate?: string | null;
    status?: number | null;
    fileExtension?: string | null;
}

export interface DocumentControlFilterLookupItem {
    id: number;
    name: string;
}

export interface DocumentControlDashboardAppliedFilterDto {
    startDate?: string | null;
    endDate?: string | null;
    status?: number | null;
    fileExtension?: string | null;
}

export interface DocumentControlOverviewDto {
    totalDocuments: number;
    totalFolders: number;
    totalFiles: number;
    approvedDocuments: number;
    pendingDocuments: number;
    obsoleteDocuments: number;
    productsWithDocuments: number;
    productsWithoutDocuments: number;
    documentCoverageRate: number;
}

export interface DocumentControlStatusItemDto {
    status: number;
    statusLabel: string;
    documentCount: number;
    percentage: number;
}

export interface DocumentControlFileTypeItemDto {
    fileExtension: string;
    documentCount: number;
    percentage: number;
}

export interface DocumentControlProductItemDto {
    productId: number;
    productName: string;
    productNumber: string;
    documentCount: number;
}

export interface DocumentControlOwnerItemDto {
    ownerId: number;
    ownerName: string;
    jobTitle: string;
    documentCount: number;
}

export interface DocumentControlRevisionItemDto {
    documentNode: number;
    title: string;
    revision: string;
    modifiedDate: string;
    ownerName: string;
}

export interface DocumentControlPendingItemDto {
    documentNode: number;
    title: string;
    fileName: string;
    revision: string;
    ownerName: string;
    modifiedDate: string;
}

export interface DocumentControlProductWithoutDocDto {
    productId: number;
    productName: string;
    productNumber: string;
    sellStartDate: boolean;
}

export interface DocumentControlDashboardFilterOptionsDto {
    statuses: DocumentControlFilterLookupItem[];
    fileExtensions: DocumentControlFilterLookupItem[];
}

export interface DocumentControlDashboardResponseDto {
    filters: DocumentControlDashboardAppliedFilterDto;
    overview: DocumentControlOverviewDto;
    documentsByStatus: DocumentControlStatusItemDto[];
    documentsByFileType: DocumentControlFileTypeItemDto[];
    topProductsWithDocuments: DocumentControlProductItemDto[];
    topDocumentOwners: DocumentControlOwnerItemDto[];
    recentRevisions: DocumentControlRevisionItemDto[];
    pendingApprovals: DocumentControlPendingItemDto[];
    productsWithoutDocuments: DocumentControlProductWithoutDocDto[];
    filterOptions: DocumentControlDashboardFilterOptionsDto;
}

@Injectable({ providedIn: 'root' })
export class DocumentControlDashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/documentcontroldashboard`;

    getDashboard(filter: DocumentControlDashboardFilter): Observable<DocumentControlDashboardResponseDto> {
        let params = new HttpParams();

        if (filter.startDate) {
            params = params.set('startDate', filter.startDate);
        }

        if (filter.endDate) {
            params = params.set('endDate', filter.endDate);
        }

        if (filter.status != null) {
            params = params.set('status', filter.status);
        }

        if (filter.fileExtension) {
            params = params.set('fileExtension', filter.fileExtension);
        }

        return this.http.get<DocumentControlDashboardResponseDto>(this.apiUrl, { params });
    }
}
