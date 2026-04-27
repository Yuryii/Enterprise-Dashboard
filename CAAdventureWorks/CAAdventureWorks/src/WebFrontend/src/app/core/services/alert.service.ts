import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { interval, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface AlertDefinitionDto {
  id: number;
  code: string;
  name: string;
  description: string;
  departmentCode: string;
  defaultThreshold: number | null;
  thresholdUnit: string;
  requiresParameters: boolean;
}

export interface AlertConfigurationDto {
  id: number;
  alertDefinitionId: number;
  userId: string;
  departmentCode: string;
  isEnabled: boolean;
  thresholdValue: number | null;
  scanIntervalDays: number;
  scanIntervalSeconds: number | null;
  extraParameters: string | null;
  lastTriggeredAt: string | null;
  createdAt: string;
  alertDefinition: AlertDefinitionDto | null;
}

export interface AlertHistoryDto {
  id: number;
  alertConfigurationId: number;
  alertDefinitionId: number;
  alertName: string;
  alertCode: string;
  triggeredAt: string;
  thresholdValue: number;
  actualValue: number;
  message: string;
  isRead: boolean;
  isDismissed: boolean;
}

export interface AlertHistoryListDto {
  items: AlertHistoryDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface CreateAlertConfigDto {
  alertDefinitionId: number;
  thresholdValue: number | null;
  scanIntervalDays: number;
  scanIntervalSeconds: number | null;
  extraParameters: string | null;
}

export interface UpdateAlertConfigDto {
  id: number;
  isEnabled: boolean;
  thresholdValue: number | null;
  scanIntervalDays: number;
  scanIntervalSeconds: number | null;
  extraParameters: string | null;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/api/alerts`;

  readonly unreadCount = signal<number>(0);
  readonly unreadAlerts = signal<AlertHistoryDto[]>([]);

  private pollIntervalMs = 30000;
  private pollingActive = false;

  private readonly departmentMap: Record<string, string> = {
    // Sales
    'Sales': 'Sales',
    'Sales-and-Marketing': 'Sales',
    // Human Resources
    'HumanResources': 'HumanResources',
    'Executive-General-And-Administration-Manager': 'HumanResources',
    // Finance
    'Finance': 'Finance',
    // Production
    'Production': 'Production',
    'Manufacturing': 'Production',
    // Production Control
    'Production-Control': 'ProductionControl',
    // Purchasing
    'Purchasing': 'Purchasing',
    // Marketing
    'Marketing': 'Marketing',
    // Quality Assurance
    'Quality-Assurance': 'QualityAssurance',
    'Quality-Assurance-Manager': 'QualityAssurance',
    // Document Control
    'Document-Control': 'DocumentControl',
    // Engineering
    'Engineering': 'Engineering',
    // Tool Design
    'Tool-Design': 'ToolDesign',
    // Shipping and Receiving
    'Shipping-and-Receiving': 'ShippingAndReceiving',
    // Facilities
    'Facilities': 'Facilities',
    'Facilities-And-Maintenance': 'Facilities',
    // Information Services
    'Information-Services': 'InformationServices',
    // Research and Development
    'Research-and-Development': 'Engineering',
    // Executive
    'Executive': 'Executive',
  };

  private userDepartment: string | null = null;

  constructor() {
    this.initUserDepartment();
    this.startPolling();
  }

  private initUserDepartment(): void {
    try {
      const roles = this.authService.getRoles();
      if (Array.isArray(roles)) {
        for (const role of roles) {
          const dept = this.departmentMap[role];
          if (dept) {
            this.userDepartment = dept;
            break;
          }
        }
      }
    } catch {
      this.userDepartment = null;
    }
  }

  getCurrentDepartment(): string | null {
    return this.userDepartment;
  }

  private startPolling(): void {
    if (this.pollingActive) return;
    this.pollingActive = true;

    this.refreshUnreadCount();
    this.getUnreadAlerts(5).subscribe({
      next: (alerts) => this.unreadAlerts.set(alerts),
      error: () => this.unreadAlerts.set([])
    });

    interval(this.pollIntervalMs).subscribe(() => {
      this.refreshUnreadCount();
    });
  }

  refreshUnreadCount(): void {
    this.http.get<number>(`${this.baseUrl}/unread-count`).subscribe({
      next: (count) => this.unreadCount.set(count),
      error: () => this.unreadCount.set(0)
    });
    this.getUnreadAlerts(5).subscribe({
      next: (alerts) => this.unreadAlerts.set(alerts),
      error: () => {}
    });
  }

  /**
   * Get alert definitions filtered by current user's department.
   */
  getAlertDefinitions(): Observable<AlertDefinitionDto[]> {
    const dept = this.userDepartment;
    let params = new HttpParams();
    if (dept) {
      params = params.set('departmentCode', dept);
    }
    return this.http.get<AlertDefinitionDto[]>(`${this.baseUrl}/definitions`, { params });
  }

  /**
   * Get alert definitions for a specific department.
   */
  getAlertDefinitionsByDepartment(departmentCode: string): Observable<AlertDefinitionDto[]> {
    const params = new HttpParams().set('departmentCode', departmentCode);
    return this.http.get<AlertDefinitionDto[]>(`${this.baseUrl}/definitions`, { params });
  }

  getConfigurations(): Observable<AlertConfigurationDto[]> {
    return this.http.get<AlertConfigurationDto[]>(`${this.baseUrl}/configurations`);
  }

  createConfiguration(config: CreateAlertConfigDto): Observable<AlertConfigurationDto> {
    return this.http.post<AlertConfigurationDto>(`${this.baseUrl}/configurations`, config);
  }

  updateConfiguration(config: UpdateAlertConfigDto): Observable<AlertConfigurationDto> {
    return this.http.put<AlertConfigurationDto>(`${this.baseUrl}/configurations/${config.id}`, config);
  }

  deleteConfiguration(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/configurations/${id}`);
  }

  activateNow(id: number): Observable<AlertHistoryDto> {
    return this.http.post<AlertHistoryDto>(`${this.baseUrl}/configurations/${id}/activate`, {});
  }

  getHistory(page: number = 1, pageSize: number = 20): Observable<AlertHistoryListDto> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<AlertHistoryListDto>(`${this.baseUrl}/history`, { params });
  }

  getUnreadAlerts(maxCount: number = 10): Observable<AlertHistoryDto[]> {
    const params = new HttpParams().set('maxCount', maxCount.toString());
    return this.http.get<AlertHistoryDto[]>(`${this.baseUrl}/unread`, { params });
  }

  dismissAlert(id: number, isRead: boolean | null = null): Observable<void> {
    let params = new HttpParams();
    if (isRead !== null) {
      params = params.set('isRead', isRead.toString());
    }
    return this.http.put<void>(`${this.baseUrl}/history/${id}/dismiss`, {}, { params });
  }

  markAllRead(): void {
    const alerts = this.unreadAlerts();
    if (alerts.length === 0) return;

    alerts.forEach(alert => {
      this.dismissAlert(alert.id, true).subscribe();
    });

    this.unreadCount.set(0);
  }
}
