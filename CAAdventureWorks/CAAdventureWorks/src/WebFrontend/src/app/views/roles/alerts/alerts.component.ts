import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import {
  CardComponent,
  TabDirective,
  TabPanelComponent,
  TableDirective,
  TabsComponent,
  TabsContentComponent,
  TabsListComponent,
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { AlertService, type AlertDefinitionDto, type AlertConfigurationDto, type AlertHistoryDto } from '../../../core/services/alert.service';

interface CountdownData {
  total: number;
  remaining: number;
  isSeconds: boolean;
}

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardComponent,
    TabsComponent,
    TabsListComponent,
    TabsContentComponent,
    TabDirective,
    TabPanelComponent,
    TableDirective,
    IconDirective,
  ],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.scss'
})
export class AlertsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly alertService = inject(AlertService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly activeTabKey = signal<string | number>('config');

  readonly definitions = signal<AlertDefinitionDto[]>([]);
  readonly configurations = signal<AlertConfigurationDto[]>([]);
  readonly history = signal<AlertHistoryDto[]>([]);
  readonly totalHistoryCount = signal(0);
  readonly historyPage = signal(1);
  readonly historyPageSize = 15;

  readonly selectedDefinition = signal<AlertDefinitionDto | null>(null);
  readonly activating = signal(false);
  readonly selectedHistory = signal<AlertHistoryDto | null>(null);

  private readonly configCountdowns = signal<Map<number, CountdownData>>(new Map());
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  readonly scanIntervalOptions = [
    { value: 15, label: '15 giây' },
    { value: 1, label: 'Hàng ngày' },
    { value: 3, label: '3 ngày' },
    { value: 7, label: '7 ngày' },
    { value: 14, label: '14 ngày' },
    { value: 30, label: '30 ngày' },
  ];

  readonly configForm = this.fb.group({
    thresholdValue: [null as number | null],
    scanIntervalDays: [7],
    scanIntervalSeconds: [null as number | null],
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading.set(true);

    this.alertService.getAlertDefinitions('Sales')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (defs) => {
          this.definitions.set(defs);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      });

    this.alertService.getConfigurations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (configs) => {
          this.configurations.set(configs);
          this.refreshCountdowns();
        },
        error: () => {}
      });

    this.loadHistory();
    this.startCountdownTimer();
  }

  loadHistory(page: number = 1): void {
    this.historyPage.set(page);
    this.alertService.getHistory(page, this.historyPageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.history.set(result.items);
          this.totalHistoryCount.set(result.totalCount);
        },
        error: () => {}
      });
  }

  onTabChange(value: string | number | undefined): void {
    this.activeTabKey.set(value as string | number);
    if (value === 'history') {
      this.loadHistory(1);
    }
  }

  getConfigForDefinition(definitionId: number): AlertConfigurationDto | undefined {
    return this.configurations().find(c => c.alertDefinitionId === definitionId);
  }

  isAlertEnabled(definitionId: number): boolean {
    return this.getConfigForDefinition(definitionId)?.isEnabled ?? false;
  }

  onDefinitionClick(def: AlertDefinitionDto): void {
    if (this.selectedDefinition()?.id === def.id) {
      this.selectedDefinition.set(null);
      return;
    }
    this.selectedDefinition.set(def);
    const existing = this.getConfigForDefinition(def.id);
    const isSeconds = existing?.scanIntervalSeconds === 15;
    this.configForm.patchValue({
      thresholdValue: existing?.thresholdValue ?? def.defaultThreshold ?? null,
      scanIntervalDays: isSeconds ? 15 : (existing?.scanIntervalDays ?? 7),
      scanIntervalSeconds: existing?.scanIntervalSeconds ?? null,
    });
  }

  onScanIntervalChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = parseInt(select.value, 10);
    if (value === 15) {
      this.configForm.patchValue({ scanIntervalSeconds: 15 });
    } else {
      this.configForm.patchValue({ scanIntervalSeconds: null });
    }
  }

  onToggleAlert(def: AlertDefinitionDto, enabled: boolean, event: Event): void {
    event.stopPropagation();
    const existing = this.getConfigForDefinition(def.id);

    if (existing) {
      this.alertService.updateConfiguration({
        id: existing.id,
        isEnabled: enabled,
        thresholdValue: existing.thresholdValue,
        scanIntervalDays: existing.scanIntervalDays,
        scanIntervalSeconds: existing.scanIntervalSeconds,
        extraParameters: existing.extraParameters,
      }).subscribe({
        next: (updated) => {
          const current = this.configurations().filter(c => c.id !== updated.id);
          this.configurations.set([...current, updated]);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể cập nhật cấu hình cảnh báo.',
          });
        }
      });
    } else if (enabled) {
      this.alertService.createConfiguration({
        alertDefinitionId: def.id,
        thresholdValue: def.defaultThreshold,
        scanIntervalDays: 7,
        scanIntervalSeconds: null,
        extraParameters: null,
      }).subscribe({
        next: (created) => {
          this.configurations.set([...this.configurations(), created]);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tạo cấu hình cảnh báo.',
          });
        }
      });
    }
  }

  onSaveConfiguration(): void {
    const def = this.selectedDefinition();
    if (!def) return;

    const existing = this.getConfigForDefinition(def.id);
    const formValue = this.configForm.getRawValue();

    if (existing) {
      this.alertService.updateConfiguration({
        id: existing.id,
        isEnabled: existing.isEnabled,
        thresholdValue: formValue.thresholdValue ?? def.defaultThreshold ?? null,
        scanIntervalDays: formValue.scanIntervalDays ?? 7,
        scanIntervalSeconds: formValue.scanIntervalSeconds ?? null,
        extraParameters: existing.extraParameters,
      }).subscribe({
        next: (updated) => {
          const current = this.configurations().filter(c => c.id !== updated.id);
          this.configurations.set([...current, updated]);
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cấu hình đã được cập nhật.',
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể cập nhật cấu hình.',
          });
        }
      });
    } else {
      this.alertService.createConfiguration({
        alertDefinitionId: def.id,
        thresholdValue: formValue.thresholdValue ?? def.defaultThreshold ?? null,
        scanIntervalDays: formValue.scanIntervalDays ?? 7,
        scanIntervalSeconds: formValue.scanIntervalSeconds ?? null,
        extraParameters: null,
      }).subscribe({
        next: (created) => {
          this.configurations.set([...this.configurations(), created]);
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cấu hình đã được tạo.',
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tạo cấu hình.',
          });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.stopCountdownTimer();
  }

  onActivateNow(): void {
    const def = this.selectedDefinition();
    if (!def) return;

    const existing = this.getConfigForDefinition(def.id);
    if (!existing) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Vui lòng lưu cấu hình trước khi kích hoạt.',
      });
      return;
    }

    this.activating.set(true);

    this.alertService.activateNow(existing.id).subscribe({
      next: () => {
        this.activating.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Cảnh báo đã được kích hoạt thành công!',
        });
        this.loadHistory(1);
        this.alertService.refreshUnreadCount();
        this.alertService.getUnreadAlerts(5).subscribe(alerts => {
          this.alertService.unreadAlerts.set(alerts);
        });
        this.alertService.getConfigurations()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (configs) => {
              this.configurations.set(configs);
              this.resetCountdown(existing.id);
            },
            error: () => {}
          });
      },
      error: (err) => {
        this.activating.set(false);
        console.error('[Alerts] activateNow error:', err);
        const msg = err?.error?.message || err?.message || 'Không thể kích hoạt cảnh báo ngay.';
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: msg,
        });
      }
    });
  }

  onDeleteConfig(configId: number, event: Event): void {
    event.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa cấu hình này?')) return;

    this.alertService.deleteConfiguration(configId).subscribe({
        next: () => {
          this.configurations.set(this.configurations().filter(c => c.id !== configId));
          this.selectedDefinition.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cấu hình đã được xóa.',
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể xóa cấu hình.',
          });
        }
    });
  }

  onHistoryClick(alert: AlertHistoryDto): void {
    if (this.selectedHistory()?.id === alert.id) {
      this.selectedHistory.set(null);
    } else {
      this.selectedHistory.set(alert);
    }
  }

  onMarkAsRead(): void {
    const h = this.selectedHistory();
    if (!h) return;
    this.alertService.dismissAlert(h.id, true).subscribe(() => {
      const updated = { ...h, isRead: true };
      this.selectedHistory.set(updated);
      this.history.update(list => list.map(a => a.id === updated.id ? updated : a));
      this.alertService.refreshUnreadCount();
    });
  }

  onDismissHistory(alert: AlertHistoryDto, event: Event): void {
    event.stopPropagation();
    this.alertService.dismissAlert(alert.id).subscribe({
      next: () => {
        this.history.set(this.history().filter(h => h.id !== alert.id));
        this.totalHistoryCount.update(c => c - 1);
        this.alertService.refreshUnreadCount();
      },
      error: () => {}
    });
  }

  getAlertColor(alertCode: string): string {
    const colors: Record<string, string> = {
      'SALES_REVENUE_DECLINE': 'danger',
      'SALES_ORDER_COUNT_DECLINE': 'warning',
      'SALES_TOP_PRODUCT_CHANGE': 'info',
      'SALES_ORDER_STATUS_ISSUE': 'danger',
      'SALES_CUSTOMER_CONCENTRATION': 'warning',
    };
    return colors[alertCode] ?? 'secondary';
  }

  getAlertIcon(alertCode: string): string {
    const icons: Record<string, string> = {
      'SALES_REVENUE_DECLINE': 'cilChartLineDown',
      'SALES_ORDER_COUNT_DECLINE': 'cilCart',
      'SALES_TOP_PRODUCT_CHANGE': 'cilStar',
      'SALES_ORDER_STATUS_ISSUE': 'cilWarning',
      'SALES_CUSTOMER_CONCENTRATION': 'cilPeople',
    };
    return icons[alertCode] ?? 'cilBell';
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    date.setHours(date.getHours() + 7);
    return date.toLocaleString('vi-VN');
  }

  formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const vnDate = new Date(date);
    vnDate.setHours(vnDate.getHours() + 7);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return vnDate.toLocaleDateString('vi-VN');
  }

  getCountdown(definitionId: number): CountdownData | null {
    const config = this.getConfigForDefinition(definitionId);
    if (!config || !config.isEnabled) return null;
    return this.configCountdowns().get(config.id) ?? null;
  }

  formatCountdown(seconds: number): string {
    if (seconds <= 0) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  private startCountdownTimer(): void {
    this.refreshCountdowns();
    this.countdownInterval = setInterval(() => {
      this.refreshCountdowns();
    }, 1000);
  }

  private stopCountdownTimer(): void {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private refreshCountdowns(): void {
    const now = new Date();
    const updated = new Map<number, CountdownData>();

    for (const config of this.configurations()) {
      if (!config.isEnabled) continue;

      const isSeconds = !!(config.scanIntervalSeconds && config.scanIntervalSeconds > 0);
      let total: number;
      let remaining: number;

      if (isSeconds) {
        total = config.scanIntervalSeconds!;
        const elapsed = config.lastTriggeredAt
          ? Math.floor((now.getTime() - new Date(config.lastTriggeredAt).getTime()) / 1000)
          : total + 1;
        remaining = Math.max(0, total - (elapsed % total));
        if (remaining === 0) remaining = total;
      } else {
        total = config.scanIntervalDays * 86400;
        if (config.lastTriggeredAt) {
          const lastTriggered = new Date(config.lastTriggeredAt);
          const nextRun = new Date(lastTriggered);
          nextRun.setDate(nextRun.getDate() + config.scanIntervalDays);
          nextRun.setHours(0, 0, 0, 0);
          if (nextRun <= lastTriggered) {
            nextRun.setDate(nextRun.getDate() + config.scanIntervalDays);
          }
          remaining = Math.max(0, Math.floor((nextRun.getTime() - now.getTime()) / 1000));
        } else {
          remaining = total;
        }
      }

      updated.set(config.id, { total, remaining, isSeconds });
    }

    this.configCountdowns.set(updated);
  }

  private resetCountdown(configId: number): void {
    this.refreshCountdowns();
  }

  get totalPages(): number {
    return Math.ceil(this.totalHistoryCount() / this.historyPageSize);
  }
}
