import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
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
export class AlertsComponent implements OnInit {
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

    // Load definitions filtered by user's department (backend enforces this)
    this.alertService.getAlertDefinitions()
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
        },
        error: () => {}
      });

    this.loadHistory();
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

  /**
   * Get color for an alert based on its code prefix.
   * Each department prefix has a consistent color scheme.
   */
  getAlertColor(alertCode: string): string {
    const colors: Record<string, string> = {
      // Sales
      'SALES_REVENUE_DECLINE': 'danger',
      'SALES_ORDER_COUNT_DECLINE': 'warning',
      'SALES_TOP_PRODUCT_CHANGE': 'info',
      'SALES_ORDER_STATUS_ISSUE': 'danger',
      'SALES_CUSTOMER_CONCENTRATION': 'warning',
      // Production
      'PRODUCTION_SCRAP_RATE': 'danger',
      'PRODUCTION_WORKORDER_DELAY': 'warning',
      'PRODUCTION_MACHINE_DOWNTIME': 'danger',
      'PRODUCTION_INVENTORY_LOW': 'warning',
      // Purchasing
      'PURCHASING_PO_DELAY': 'warning',
      'PURCHASING_VENDOR_PERF': 'warning',
      'PURCHASING_STOCKOUT': 'danger',
      'PURCHASING_PRICE_VARIANCE': 'info',
      // Human Resources
      'HR_OPEN_POSITIONS': 'info',
      'HR_TURNOVER_RATE': 'warning',
      'HR_OVERTIME_HIGH': 'warning',
      'HR_SICK_LEAVE_HIGH': 'info',
      // Finance
      'FINANCE_BUDGET_VARIANCE': 'danger',
      'FINANCE_OVERDUE_PAYMENT': 'danger',
      'FINANCE_AR_AGING': 'warning',
      'FINANCE_CREDIT_LIMIT': 'info',
      // Engineering
      'ENG_PROJECT_DELAY': 'danger',
      'ENG_CHANGE_ORDER_RATE': 'warning',
      'ENG_DOCUMENT_REVISION': 'info',
      // Marketing
      'MKT_CAMPAIGN_ROI': 'info',
      'MKT_LEAD_CONVERSION': 'warning',
      'MKT_WEBSITE_TRAFFIC': 'info',
      'MKT_SOCIAL_ENGAGEMENT': 'info',
      // Quality Assurance
      'QA_DEFECT_RATE': 'danger',
      'QA_INSPECTION_FAIL': 'danger',
      'QA_RETURN_RATE': 'warning',
      'QA_CUSTOMER_COMPLAINT': 'danger',
      // Document Control
      'DOC_PENDING_APPROVAL': 'warning',
      'DOC_EXPIRING': 'info',
      'DOC_REVISION_PENDING': 'info',
      // Facilities
      'FAC_WORKORDER_BACKLOG': 'warning',
      'FAC_EQUIPMENT_FAILURE': 'danger',
      'FAC_UTILITY_COST': 'info',
      'FAC_SAFETY_INCIDENT': 'danger',
      // Information Services
      'IS_SYSTEM_DOWN': 'danger',
      'IS_TICKET_BACKLOG': 'warning',
      'IS_SECURITY_ALERT': 'danger',
      'IS_BACKUP_FAILURE': 'danger',
      // Shipping and Receiving
      'SHIP_DELAY_RATE': 'warning',
      'SHIP_RETURN_RATE': 'warning',
      'SHIP_RECEIVING_BACKLOG': 'info',
      'SHIP_DAMAGE_RATE': 'danger',
      // Production Control
      'PRODCTRL_SCHEDULE_ADHERENCE': 'info',
      'PRODCTRL_WIP_HIGH': 'warning',
      'PRODCTRL_CYCLE_TIME': 'info',
      // Tool Design
      'TOOL_REVISION_RATE': 'info',
      'TOOL_DELIVERY_DELAY': 'warning',
      'TOOL_COST_OVERRUN': 'warning',
      // Executive
      'EXEC_REVENUE_BELOW_TARGET': 'danger',
      'EXEC_MARGIN_DECLINE': 'danger',
      'EXEC_INVENTORY_TURNS': 'info',
      'EXEC_EMPLOYEE_SATISFACTION': 'warning',
      'EXEC_CUSTOMER_SATISFACTION': 'warning',
    };
    return colors[alertCode] ?? 'secondary';
  }

  /**
   * Get icon for an alert based on its code prefix.
   */
  getAlertIcon(alertCode: string): string {
    const icons: Record<string, string> = {
      // Sales
      'SALES_REVENUE_DECLINE': 'cilChartLineDown',
      'SALES_ORDER_COUNT_DECLINE': 'cilCart',
      'SALES_TOP_PRODUCT_CHANGE': 'cilStar',
      'SALES_ORDER_STATUS_ISSUE': 'cilWarning',
      'SALES_CUSTOMER_CONCENTRATION': 'cilPeople',
      // Production
      'PRODUCTION_SCRAP_RATE': 'cilIndustry',
      'PRODUCTION_WORKORDER_DELAY': 'cilClock',
      'PRODUCTION_MACHINE_DOWNTIME': 'cilSettings',
      'PRODUCTION_INVENTORY_LOW': 'cilBox',
      // Purchasing
      'PURCHASING_PO_DELAY': 'cilTruck',
      'PURCHASING_VENDOR_PERF': 'cilStar',
      'PURCHASING_STOCKOUT': 'cilWarning',
      'PURCHASING_PRICE_VARIANCE': 'cilChartLine',
      // Human Resources
      'HR_OPEN_POSITIONS': 'cilUserFollow',
      'HR_TURNOVER_RATE': 'cilUserUnfollow',
      'HR_OVERTIME_HIGH': 'cilClock',
      'HR_SICK_LEAVE_HIGH': 'cilMedical',
      // Finance
      'FINANCE_BUDGET_VARIANCE': 'cilCalculator',
      'FINANCE_OVERDUE_PAYMENT': 'cilWarning',
      'FINANCE_AR_AGING': 'cilClock',
      'FINANCE_CREDIT_LIMIT': 'cilCreditCard',
      // Engineering
      'ENG_PROJECT_DELAY': 'cilClock',
      'ENG_CHANGE_ORDER_RATE': 'cilPencil',
      'ENG_DOCUMENT_REVISION': 'cilDescription',
      // Marketing
      'MKT_CAMPAIGN_ROI': 'cilChartPie',
      'MKT_LEAD_CONVERSION': 'cilPeople',
      'MKT_WEBSITE_TRAFFIC': 'cilGlobeAlt',
      'MKT_SOCIAL_ENGAGEMENT': 'cilShare',
      // Quality Assurance
      'QA_DEFECT_RATE': 'cilWarning',
      'QA_INSPECTION_FAIL': 'cilXCircle',
      'QA_RETURN_RATE': 'cilReturn',
      'QA_CUSTOMER_COMPLAINT': 'cilSpeech',
      // Document Control
      'DOC_PENDING_APPROVAL': 'cilCheckCircle',
      'DOC_EXPIRING': 'cilClock',
      'DOC_REVISION_PENDING': 'cilPen',
      // Facilities
      'FAC_WORKORDER_BACKLOG': 'cilList',
      'FAC_EQUIPMENT_FAILURE': 'cilWarning',
      'FAC_UTILITY_COST': 'cilDollar',
      'FAC_SAFETY_INCIDENT': 'cilShieldAlt',
      // Information Services
      'IS_SYSTEM_DOWN': 'cilCloudSlash',
      'IS_TICKET_BACKLOG': 'cilList',
      'IS_SECURITY_ALERT': 'cilShieldAlt',
      'IS_BACKUP_FAILURE': 'cilWarning',
      // Shipping and Receiving
      'SHIP_DELAY_RATE': 'cilTruck',
      'SHIP_RETURN_RATE': 'cilReturn',
      'SHIP_RECEIVING_BACKLOG': 'cilInbox',
      'SHIP_DAMAGE_RATE': 'cilWarning',
      // Production Control
      'PRODCTRL_SCHEDULE_ADHERENCE': 'cilCheck',
      'PRODCTRL_WIP_HIGH': 'cilLayers',
      'PRODCTRL_CYCLE_TIME': 'cilClock',
      // Tool Design
      'TOOL_REVISION_RATE': 'cilPencil',
      'TOOL_DELIVERY_DELAY': 'cilClock',
      'TOOL_COST_OVERRUN': 'cilCalculator',
      // Executive
      'EXEC_REVENUE_BELOW_TARGET': 'cilChartLineDown',
      'EXEC_MARGIN_DECLINE': 'cilChartLineDown',
      'EXEC_INVENTORY_TURNS': 'cilLoopCircular',
      'EXEC_EMPLOYEE_SATISFACTION': 'cilPeople',
      'EXEC_CUSTOMER_SATISFACTION': 'cilStar',
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

  get totalPages(): number {
    return Math.ceil(this.totalHistoryCount() / this.historyPageSize);
  }
}
