import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DebtItemDto {
  id: number;
  vendorName: string;
  vendorEmail: string;
  invoiceNumber: string;
  amount: number;
  importanceScore: number;
  category: string;
  dueDate: string;
  status: string;
}

export interface DebtEmailDto {
  subject: string;
  recipients: string[];
  cc: string[];
  body: string;
  generatedBy: string;
}

export interface OptimizationResponseDto {
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  totalImportanceScore: number;
  paidDebtsCount: number;
  deferredDebtsCount: number;
  paidDebts: DebtItemDto[];
  deferredDebts: DebtItemDto[];
  aiEmailDraft: DebtEmailDto | null;
  optimizedAt: string;
}

export interface PendingDebtsResponseDto {
  totalCount: number;
  totalAmount: number;
  debts: DebtItemDto[];
}

export interface VendorScoreDto {
  id: number;
  vendorCategory: string;
  score: number;
  reason: string;
}

export interface EmailSendRequest {
  recipients: string[];
  cc: string[] | null;
  subject: string;
  body: string;
}

export interface EmailSendResultDto {
  success: boolean;
  message: string | null;
}

export interface OptimizePaymentRequest {
  budget: number;
}

export interface ComposeEmailRequest {
  deferredVendorIds: number[];
}

@Injectable({ providedIn: 'root' })
export class DebtOptimizationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/debt-optimization`;

  getDebts(): Observable<PendingDebtsResponseDto> {
    return this.http.get<PendingDebtsResponseDto>(`${this.apiUrl}/debts`);
  }

  optimizePayment(budget: number): Observable<OptimizationResponseDto> {
    return this.http.post<OptimizationResponseDto>(`${this.apiUrl}/optimize`, { budget } as OptimizePaymentRequest);
  }

  composeEmail(deferredVendorIds: number[]): Observable<DebtEmailDto> {
    return this.http.post<DebtEmailDto>(`${this.apiUrl}/compose-email`, { deferredVendorIds } as ComposeEmailRequest);
  }

  sendEmail(request: EmailSendRequest): Observable<EmailSendResultDto> {
    return this.http.post<EmailSendResultDto>(`${this.apiUrl}/send-email`, request);
  }

  getVendorScores(): Observable<VendorScoreDto[]> {
    return this.http.get<VendorScoreDto[]>(`${this.apiUrl}/vendor-scores`);
  }
}
