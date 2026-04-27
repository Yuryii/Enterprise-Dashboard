import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SalesOrderListItemDto {
    salesOrderId: number;
    salesOrderNumber: string;
    orderDate: string;
    dueDate: string;
    shipDate?: string | null;
    status: number;
    onlineOrderFlag: boolean;
    customerId: number;
    customerName: string;
    salesPersonId?: number | null;
    salesPersonName?: string | null;
    territoryId?: number | null;
    subTotal: number;
    taxAmt: number;
    freight: number;
    totalDue: number;
    detailCount: number;
}

export interface PagedSalesOrdersDto {
    items: SalesOrderListItemDto[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

export interface SalesOrderDetailDto {
    salesOrderDetailId: number;
    orderQty: number;
    productId: number;
    productName: string;
    specialOfferId: number;
    unitPrice: number;
    unitPriceDiscount: number;
    lineTotal: number;
}

export interface SalesOrderDto {
    salesOrderId: number;
    salesOrderNumber: string;
    orderDate: string;
    dueDate: string;
    shipDate?: string | null;
    status: number;
    onlineOrderFlag: boolean;
    purchaseOrderNumber?: string | null;
    accountNumber?: string | null;
    customerId: number;
    customerName: string;
    salesPersonId?: number | null;
    salesPersonName?: string | null;
    territoryId?: number | null;
    billToAddressId: number;
    shipToAddressId: number;
    shipMethodId: number;
    subTotal: number;
    taxAmt: number;
    freight: number;
    totalDue: number;
    comment?: string | null;
    details: SalesOrderDetailDto[];
}

export interface UpsertSalesOrderDetailDto {
    salesOrderDetailId?: number | null;
    orderQty: number;
    productId: number;
    specialOfferId: number;
    unitPrice: number;
    unitPriceDiscount: number;
}

export interface UpsertSalesOrderRequest {
    orderDate: string;
    dueDate: string;
    shipDate?: string | null;
    status: number;
    onlineOrderFlag: boolean;
    purchaseOrderNumber?: string | null;
    accountNumber?: string | null;
    customerId: number;
    salesPersonId?: number | null;
    territoryId?: number | null;
    billToAddressId: number;
    shipToAddressId: number;
    shipMethodId: number;
    taxAmt: number;
    freight: number;
    comment?: string | null;
    details: UpsertSalesOrderDetailDto[];
}

export interface SalesOrderImportStatusDto {
    jobId: string;
    status: string;
    totalRows: number;
    processedRows: number;
    insertedRows: number;
    failedRows: number;
    message?: string | null;
}

export interface LookupItemDto {
    id: number;
    name: string;
}

export interface SalesOrderLookupsDto {
    customers: LookupItemDto[];
    salesPeople: LookupItemDto[];
    products: LookupItemDto[];
    shipMethods: LookupItemDto[];
    territories: LookupItemDto[];
    addresses: LookupItemDto[];
    specialOffers: LookupItemDto[];
}

@Injectable({ providedIn: 'root' })
export class SalesDataManagementService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/sales-data-management`;

    getOrders(page: number, pageSize: number, search?: string | null): Observable<PagedSalesOrdersDto> {
        let params = new HttpParams()
            .set('page', page)
            .set('pageSize', pageSize);

        if (search?.trim()) {
            params = params.set('search', search.trim());
        }

        return this.http.get<PagedSalesOrdersDto>(`${this.apiUrl}/orders`, { params });
    }

    getOrder(id: number): Observable<SalesOrderDto> {
        return this.http.get<SalesOrderDto>(`${this.apiUrl}/orders/${id}`);
    }

    createOrder(request: UpsertSalesOrderRequest): Observable<SalesOrderDto> {
        return this.http.post<SalesOrderDto>(`${this.apiUrl}/orders`, request);
    }

    updateOrder(id: number, request: UpsertSalesOrderRequest): Observable<SalesOrderDto> {
        return this.http.put<SalesOrderDto>(`${this.apiUrl}/orders/${id}`, request);
    }

    deleteOrder(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/orders/${id}`);
    }

    getLookups(): Observable<SalesOrderLookupsDto> {
        return this.http.get<SalesOrderLookupsDto>(`${this.apiUrl}/lookups`);
    }

    importOrders(file: File): Observable<SalesOrderImportStatusDto> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<SalesOrderImportStatusDto>(`${this.apiUrl}/orders/import`, formData);
    }

    getImportStatus(jobId: string): Observable<SalesOrderImportStatusDto> {
        return this.http.get<SalesOrderImportStatusDto>(`${this.apiUrl}/orders/import/${jobId}`);
    }
}
