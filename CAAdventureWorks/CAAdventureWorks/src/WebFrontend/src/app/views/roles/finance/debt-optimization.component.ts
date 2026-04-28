import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  FormLabelDirective,
  SpinnerComponent,
  TableDirective,
  BadgeComponent,
  AlertComponent
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { DebtOptimizationService } from './debt-optimization.service';
import type {
  OptimizationResponseDto,
  PendingDebtsResponseDto,
  DebtItemDto,
  DebtEmailDto,
  VendorScoreDto,
  EmailSendRequest,
  EmailSendResultDto
} from './debt-optimization.service';

@Component({
  selector: 'app-debt-optimization',
  standalone: true,
  templateUrl: './debt-optimization.component.html',
  styleUrls: ['./debt-optimization.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FormLabelDirective,
    ButtonDirective,
    SpinnerComponent,
    TableDirective,
    BadgeComponent,
    AlertComponent,
    IconDirective
  ]
})
export class DebtOptimizationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly debtService = inject(DebtOptimizationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = 'Tối ưu hóa thanh toán công nợ';
  readonly subtitle = 'Knapsack 0/1';

  readonly loading = signal(false);
  readonly optimizing = signal(false);
  readonly sendingEmail = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly pendingDebts = signal<PendingDebtsResponseDto | null>(null);
  readonly optimizationResult = signal<OptimizationResponseDto | null>(null);
  readonly vendorScores = signal<VendorScoreDto[]>([]);

  readonly budgetForm = this.fb.group({
    budget: [800_000_000]
  });

  ngOnInit(): void {
    this.loadPendingDebts();
    this.loadVendorScores();
  }

  loadPendingDebts(): void {
    this.loading.set(true);
    this.debtService.getDebts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.pendingDebts.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          this.errorMessage.set('Không thể tải danh sách công nợ: ' + (err.message ?? 'Lỗi không xác định'));
          this.loading.set(false);
        }
      });
  }

  loadVendorScores(): void {
    this.debtService.getVendorScores()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.vendorScores.set(data),
        error: () => {}
      });
  }

  optimizePayment(): void {
    const budget = this.budgetForm.value.budget ?? 0;
    if (budget <= 0) {
      this.errorMessage.set('Ngân sách phải lớn hơn 0.');
      return;
    }

    this.optimizing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.optimizationResult.set(null);

    this.debtService.optimizePayment(budget)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.optimizationResult.set(result);
          this.optimizing.set(false);
          this.successMessage.set(
            `Đã tối ưu: ${result.paidDebtsCount} hóa đơn Giải ngân ngay, ` +
            `${result.deferredDebtsCount} hóa đơn Xin khất nợ. ` +
            `Điểm Uy tín: ${result.totalImportanceScore}, ` +
            `Còn dư: ${this.formatCurrency(result.remainingBudget)}`
          );
        },
        error: (err) => {
          this.errorMessage.set('Tối ưu thất bại: ' + (err.message ?? 'Lỗi không xác định'));
          this.optimizing.set(false);
        }
      });
  }

  sendEmail(): void {
    const result = this.optimizationResult();
    if (!result?.aiEmailDraft) return;

    const draft = result.aiEmailDraft;
    const request: EmailSendRequest = {
      recipients: draft.recipients,
      cc: draft.cc,
      subject: draft.subject,
      body: draft.body
    };

    this.sendingEmail.set(true);
    this.errorMessage.set(null);

    this.debtService.sendEmail(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sendResult: EmailSendResultDto) => {
          this.sendingEmail.set(false);
          if (sendResult.success) {
            this.successMessage.set('Email đã được gửi thành công!');
          } else {
            this.errorMessage.set('Gửi email thất bại: ' + (sendResult.message ?? 'Lỗi không xác định'));
          }
        },
        error: (err) => {
          this.sendingEmail.set(false);
          this.errorMessage.set('Gửi email thất bại: ' + (err.message ?? 'Lỗi không xác định'));
        }
      });
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
  }

  getStatusColor(status: string): string {
    if (status === 'Paid') return 'success';
    if (status === 'Deferred') return 'danger';
    if (status === 'Pending') return 'warning';
    return 'secondary';
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'Core Material': return 'cilIndustry';
      case 'Equipment': return 'cilCog';
      case 'Logistics': return 'cilTruck';
      case 'Service': return 'cilBriefcase';
      case 'Office Supply': return 'cilPencil';
      default: return 'cilBuilding';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value);
  }

  formatScore(score: number): string {
    return score.toString();
  }
}
