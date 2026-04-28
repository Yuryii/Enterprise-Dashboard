import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, timer } from 'rxjs';
import * as XLSX from 'xlsx';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  FormControlDirective,
  FormLabelDirective,
  FormSelectDirective,
  TableDirective,
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import {
  SalesDataManagementService,
  SalesOrderDto,
  SalesOrderImportStatusDto,
  SalesOrderListItemDto,
  SalesOrderLookupsDto,
  UpsertSalesOrderRequest,
} from './sales-data-management.service';

interface ImportPreviewRow {
  orderDate: string;
  dueDate: string;
  shipDate: string;
  status: string;
  onlineOrderFlag: string;
  purchaseOrderNumber: string;
  accountNumber: string;
  customerName: string;
  employeeName: string;
  territoryName: string;
  billToAddress: string;
  shipToAddress: string;
  shipMethod: string;
  tax: string;
  freight: string;
  note: string;
  productName: string;
  specialOfferName: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  totalDue: string;
}

@Component({
  selector: 'app-data-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    ButtonDirective,
    FormControlDirective,
    FormLabelDirective,
    FormSelectDirective,
    TableDirective,
    IconDirective,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
  ],
  template: `
    <div class="container-fluid data-management-page">
      @if (!showEditor()) {
      <c-card class="mb-3 border-0 shadow-sm">
        <c-card-header class="bg-body d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div class="text-uppercase text-body-secondary small fw-semibold">Phòng ban kinh doanh</div>
            <h5 class="mb-0 page-title-compact">Quản lý dữ liệu đơn bán</h5>
          </div>
          <div class="header-action-buttons">
            <div class="export-menu-wrap">
              <button class="data-action-btn data-action-export" type="button" [disabled]="exporting()" (click)="toggleExportMenu($event)">
                <svg class="data-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3v10m0 0 4-4m-4 4-4-4" />
                  <path d="M4 14v5h16v-5" />
                </svg>
                {{ exporting() ? 'Đang xuất...' : 'Xuất tất cả' }}
              </button>
              @if (showExportMenu()) {
                <div class="export-menu" (click)="$event.stopPropagation()">
                  <button class="export-menu-item" type="button" (click)="exportCurrentPage(); closeExportMenu()">
                    <span>Xuất trang hiện tại</span>
                    <small>{{ orders().length }} dòng đang hiển thị</small>
                  </button>
                  <button class="export-menu-item" type="button" (click)="exportAllOrders(); closeExportMenu()">
                    <span>Xuất tất cả</span>
                    <small>Tất cả đơn bán theo bộ lọc hiện tại</small>
                  </button>
                </div>
              }
            </div>
            <button class="data-action-btn data-action-import" type="button" (click)="openImportModal()">
              <svg class="data-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 14V4m0 0 4 4m-4-4-4 4" />
                <path d="M4 14v5h16v-5" />
              </svg>
              Nhập
            </button>
            <button class="data-action-btn data-action-create" type="button" (click)="startCreate()">
              <svg class="data-action-icon data-action-plus" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Tạo mới
            </button>
            <input #importFileInput class="d-none" type="file" accept=".csv,.xlsx,.xls" (change)="handleImportFile($event)" />
          </div>
        </c-card-header>

        <c-card-body>
          <div class="search-toolbar mb-3">
            <button class="global-search-trigger" type="button" (click)="openSearchBox()">
              <span class="search-trigger-icon">⌕</span>
              <span class="search-trigger-text">
                {{ searchForm.controls.search.value || 'Tìm kiếm mã đơn, PO, khách hàng...' }}
              </span>
              <span class="search-trigger-shortcut">Ctrl+K</span>
            </button>
            <div class="text-body-secondary small text-nowrap">
              Tổng: <strong>{{ totalCount() | number }}</strong> đơn bán
            </div>
          </div>

          @if (importJobStatus() && !showImportModal()) {
            <button class="import-status-banner" type="button" (click)="reopenImportModal()">
              <div class="import-status-banner-main">
                <span class="import-status-dot" [class.import-status-dot-done]="!importing()"></span>
                <span class="import-status-text">
                  <strong>{{ importJobStatus()?.status }}</strong>
                  <small>{{ importJobStatus()?.message || 'Đang xử lý file nhập dữ liệu...' }}</small>
                </span>
              </div>
              <div class="import-status-banner-progress">
                <span>{{ importJobStatus()?.processedRows | number }}/{{ importJobStatus()?.totalRows | number }} dòng</span>
                <div class="import-progress import-progress-banner"><span [style.width.%]="importProgress()"></span></div>
              </div>
            </button>
          }

          @if (showImportModal()) {
            <div class="import-modal-backdrop" (click)="closeImportModal()">
              <div class="import-modal" role="dialog" aria-modal="true" aria-label="Nhập dữ liệu đơn bán từ Excel" (click)="$event.stopPropagation()">
                <button class="import-modal-close" type="button" aria-label="Đóng nhập Excel" (click)="closeImportModal()">×</button>
                <h5>Nhập đơn bán từ Excel</h5>
                <button class="import-template-btn" type="button" (click)="downloadImportTemplate()">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10m0 0 4-4m-4 4-4-4"/><path d="M4 14v5h16v-5"/></svg>
                  Tải file mẫu
                </button>
                <label class="import-label">Chọn file Excel (.xls, .xlsx)</label>
                <div class="import-file-row">
                  <button class="import-file-btn" type="button" (click)="importFileInput.click()">Chọn file</button>
                  <span>{{ importFileName() || 'Chưa chọn file' }}</span>
                </div>
                @if (importPreviewRows().length > 0) {
                  <div class="import-preview-box">
                    <div class="import-preview-title">Xem trước dữ liệu</div>
                    <div class="import-preview-scroll border rounded">
                      <table class="table table-sm mb-0 import-preview-table">
                        <thead>
                          <tr>
                            @for (header of importPreviewHeaders; track header.key) {
                              <th>{{ header.label }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of importPreviewRows(); track $index) {
                            <tr>
                              @for (header of importPreviewHeaders; track header.key) {
                                <td>{{ row[header.key] }}</td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }
                @if (importJobStatus()) {
                  <div class="import-job-box">
                    <div class="d-flex justify-content-between gap-3">
                      <strong>{{ importJobStatus()?.status }}</strong>
                      <span>{{ importJobStatus()?.processedRows | number }}/{{ importJobStatus()?.totalRows | number }} dòng</span>
                    </div>
                    <div class="import-progress"><span [style.width.%]="importProgress()"></span></div>
                    <small>{{ importJobStatus()?.message }}</small>
                  </div>
                }
                <div class="import-modal-actions">
                  <button class="import-cancel-btn" type="button" (click)="closeImportModal()">Đóng</button>
                  <button class="import-preview-btn" type="button" [disabled]="!importFileName()" (click)="previewImportFile()">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.3-4.3"/><circle cx="11" cy="11" r="7"/></svg>
                    Xem trước
                  </button>
                  <button class="import-submit-btn" type="button" [disabled]="!importFileName() || importing()" (click)="submitImportFile()">
                    {{ importing() ? 'Đang nhập...' : 'Nhập dữ liệu' }}
                  </button>
                </div>
              </div>
            </div>
          }

          @if (pendingDeleteOrder()) {
            <div class="delete-confirm-backdrop" (click)="cancelDeleteOrder()">
              <div class="delete-confirm-modal" role="dialog" aria-modal="true" aria-label="Xác nhận xóa đơn bán" (click)="$event.stopPropagation()">
                <div class="delete-confirm-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 8v5" />
                    <path d="M12 17h.01" />
                    <path d="M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </div>
                <h5>Xác nhận xóa đơn bán</h5>
                <p>
                  Bạn có chắc muốn xóa đơn <strong>{{ pendingDeleteOrder()?.salesOrderNumber }}</strong>
                  của khách hàng <strong>{{ pendingDeleteOrder()?.customerName }}</strong> không?
                </p>
                <div class="delete-confirm-actions">
                  <button class="delete-confirm-cancel" type="button" (click)="cancelDeleteOrder()">Hủy</button>
                  <button class="delete-confirm-submit" type="button" [disabled]="deleting()" (click)="confirmDeleteOrder()">
                    {{ deleting() ? 'Đang xóa...' : 'Xác nhận xóa' }}
                  </button>
                </div>
              </div>
            </div>
          }

          @if (showSearchBox()) {
            <div class="global-search-backdrop" (click)="closeSearchBox()">
              <div class="global-search-modal" role="dialog" aria-modal="true" aria-label="Tìm kiếm đơn bán" (click)="$event.stopPropagation()">
                <button class="global-search-close" type="button" aria-label="Đóng tìm kiếm" (click)="closeSearchBox()">×</button>
                <h5 class="global-search-title">Tìm kiếm toàn cục</h5>
                <div class="global-search-input-wrap">
                  <input
                    #globalSearchInput
                    class="global-search-input"
                    type="search"
                    [value]="searchKeyword()"
                    placeholder="Tìm khách hàng, sản phẩm, đơn bán, mã PO..."
                    (input)="onSearchInput($event)"
                    (keydown.enter)="closeSearchBox()"
                    (keydown.escape)="closeSearchBox()"
                  />
                  @if (hasSearchKeyword()) {
                    <button class="global-search-clear" type="button" aria-label="Xóa từ khóa" (click)="resetSearchBox()">×</button>
                  }
                </div>
                <div class="global-search-meta">
                  <span></span>
                  <span>Mở từ thanh tìm kiếm hoặc Ctrl+K</span>
                </div>
                <div class="global-search-results">
                  @if (!hasSearchKeyword() || searchKeyword().trim().length < 2) {
                    <div class="global-search-empty">Nhập ít nhất 2 ký tự.</div>
                  } @else {
                    @if (searchLoading() && searchResults().length === 0) {
                      <div class="global-search-empty">Đang tìm kiếm...</div>
                    } @else if (searchResults().length === 0) {
                      <div class="global-search-empty">Không tìm thấy dữ liệu phù hợp.</div>
                    } @else {
                      @for (order of searchPreviewOrders(); track order.salesOrderId) {
                        <button class="global-search-result" type="button" (click)="selectSearchResult(order)">
                          <span class="result-icon">SO</span>
                          <span class="result-content">
                            <strong>{{ order.salesOrderNumber }}</strong>
                            <small>{{ order.customerName }}</small>
                          </span>
                          <span class="result-amount">{{ order.totalDue | currency:'USD':'symbol':'1.0-0' }}</span>
                          <span class="result-chevron">›</span>
                        </button>
                      }
                    }
                  }
                </div>
              </div>
            </div>
          }

          @if (errorMessage()) {
            <div class="alert alert-danger py-2">{{ errorMessage() }}</div>
          }

          <div class="table-responsive border rounded">
            <table cTable hover class="mb-0 align-middle data-table">
              <thead class="table-light">
                <tr>
                  <th>Mã đơn</th>
                  <th>Ngày đặt</th>
                  <th>Khách hàng</th>
                  <th>Nhân viên</th>
                  <th class="text-center">Trạng thái</th>
                  <th class="text-center">Sản phẩm trong đơn</th>
                  <th class="text-end">Tổng tiền</th>
                  <th class="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @if (loading() && orders().length === 0) {
                  <tr>
                    <td colspan="8" class="text-center text-body-secondary py-5">Đang tải dữ liệu...</td>
                  </tr>
                } @else if (orders().length === 0) {
                  <tr>
                    <td colspan="8" class="text-center text-body-secondary py-5">Không có dữ liệu đơn bán.</td>
                  </tr>
                } @else {
                  @for (order of orders(); track order.salesOrderId) {
                    <tr [class.table-active]="selectedOrder()?.salesOrderId === order.salesOrderId">
                      <td>
                        <button class="btn btn-link p-0 fw-semibold text-decoration-none" type="button" (click)="selectOrder(order)">
                          {{ order.salesOrderNumber }}
                        </button>
                        <div class="small text-body-secondary">#{{ order.salesOrderId }}</div>
                      </td>
                      <td>
                        {{ order.orderDate | date:'dd/MM/yyyy' }}
                        <div class="small text-body-secondary">Hạn: {{ order.dueDate | date:'dd/MM/yyyy' }}</div>
                      </td>
                      <td class="text-truncate customer-cell" [title]="order.customerName">{{ order.customerName }}</td>
                      <td>{{ order.salesPersonName || '—' }}</td>
                      <td class="text-center">
                        <span class="status-pill" [ngClass]="statusClass(order.status)">{{ statusLabel(order.status) }}</span>
                        <div class="small text-body-secondary">{{ order.onlineOrderFlag ? 'Online' : 'Offline' }}</div>
                      </td>
                      <td class="text-center">
                        <span class="detail-count-pill">{{ order.detailCount }} sản phẩm</span>
                      </td>
                      <td class="text-end fw-semibold">{{ order.totalDue | currency:'USD':'symbol':'1.0-0' }}</td>
                      <td class="text-center action-cell">
                        <button class="action-menu-trigger" type="button" (click)="toggleActionMenu(order.salesOrderId, $event)" aria-label="Mở thao tác">
                          ⋮
                        </button>
                        @if (openActionOrderId() === order.salesOrderId) {
                          <div class="action-menu" (click)="$event.stopPropagation()">
                            <button class="action-menu-item" type="button" (click)="editOrder(order); closeActionMenu()">
                              <span class="action-icon">✎</span>
                              <span>Sửa</span>
                            </button>
                            <button class="action-menu-item action-menu-item-danger" type="button" (click)="requestDeleteOrder(order); closeActionMenu()">
                              <span class="action-icon">🗑</span>
                              <span>Xóa</span>
                            </button>
                          </div>
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          <div class="pagination-toolbar px-1 py-3">
            <div class="text-body-secondary small">
              Trang {{ page() }} / {{ totalPages() || 1 }} · Tổng {{ totalCount() | number }} đơn
            </div>

            <div class="d-flex flex-wrap align-items-center gap-2">
              <label class="text-body-secondary small mb-0" for="pageSizeSelect">Số dòng</label>
              <select id="pageSizeSelect" class="form-select form-select-sm page-size-select" [value]="pageSize()" (change)="onPageSizeChange($event)">
                @for (size of pageSizeOptions; track size) {
                  <option [value]="size">{{ size }}</option>
                }
              </select>

              <div class="btn-group btn-group-sm page-number-group">
                <button class="btn btn-outline-secondary" type="button" [disabled]="page() <= 1 || loading()" (click)="loadOrders(page() - 1)">Trước</button>
                @for (pageNumber of visiblePages(); track pageNumber) {
                  <button
                    class="btn"
                    type="button"
                    [class.btn-primary]="pageNumber === page()"
                    [class.btn-outline-secondary]="pageNumber !== page()"
                    [disabled]="loading()"
                    (click)="loadOrders(pageNumber)">
                    {{ pageNumber }}
                  </button>
                }
                <button class="btn btn-outline-secondary" type="button" [disabled]="page() >= totalPages() || loading()" (click)="loadOrders(page() + 1)">Sau</button>
              </div>
            </div>
          </div>
        </c-card-body>
      </c-card>
      }

      @if (showEditor()) {
      <c-card class="border-0 shadow-sm">
        <c-card-header class="bg-body d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div class="text-uppercase text-body-secondary small fw-semibold">{{ editingId() ? 'Trang chỉnh sửa' : 'Trang tạo mới' }}</div>
            <h5 class="mb-0">{{ editingId() ? 'Cập nhật đơn bán' : 'Tạo đơn bán mới' }}</h5>
          </div>
          <div class="d-flex align-items-center gap-2">
            @if (selectedOrder()) {
              <span class="badge bg-info-subtle text-info-emphasis">Đang sửa {{ selectedOrder()?.salesOrderNumber }}</span>
            }
            <button class="data-action-btn data-action-back" type="button" (click)="backToList()">
              <svg class="data-action-icon data-action-back-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H6" />
                <path d="M11 7 6 12l5 5" />
              </svg>
              Danh sách
            </button>
          </div>
        </c-card-header>

        <c-card-body>
          <form [formGroup]="orderForm" (ngSubmit)="saveOrder()">
            <div class="row g-3">
              <div class="col-md-3">
                <label cLabel>Ngày đặt</label>
                <input cFormControl type="date" formControlName="orderDate" />
              </div>
              <div class="col-md-3">
                <label cLabel>Ngày đến hạn</label>
                <input cFormControl type="date" formControlName="dueDate" />
              </div>
              <div class="col-md-3">
                <label cLabel>Ngày giao</label>
                <input cFormControl type="date" formControlName="shipDate" />
              </div>
              <div class="col-md-3">
                <label cLabel>Trạng thái</label>
                <select cSelect formControlName="status">
                  @for (status of statuses; track status.id) {
                    <option [ngValue]="status.id">{{ status.name }}</option>
                  }
                </select>
              </div>

              <div class="col-md-4">
                <label cLabel>Khách hàng</label>
                <select cSelect formControlName="customerId" (change)="syncCustomerDefaults()">
                  <option [ngValue]="null">Chọn khách hàng</option>
                  @for (customer of lookups()?.customers ?? []; track customer.id) {
                    <option [ngValue]="customer.id">{{ customer.name }}</option>
                  }
                </select>
              </div>
              <div class="col-md-4">
                <label cLabel>Nhân viên bán hàng</label>
                <select cSelect formControlName="salesPersonId">
                  <option [ngValue]="null">Không chọn</option>
                  @for (person of lookups()?.salesPeople ?? []; track person.id) {
                    <option [ngValue]="person.id">{{ person.name }}</option>
                  }
                </select>
              </div>
              <div class="col-md-4">
                <label cLabel>Khu vực</label>
                <select cSelect formControlName="territoryId">
                  <option [ngValue]="null">Không chọn</option>
                  @for (territory of lookups()?.territories ?? []; track territory.id) {
                    <option [ngValue]="territory.id">{{ territory.name }}</option>
                  }
                </select>
              </div>

              <div class="col-md-4">
                <label cLabel>Địa chỉ thanh toán</label>
                <select cSelect formControlName="billToAddressId">
                  <option [ngValue]="null">Chọn địa chỉ</option>
                  @for (address of lookups()?.addresses ?? []; track address.id) {
                    <option [ngValue]="address.id">{{ address.name }}</option>
                  }
                </select>
              </div>
              <div class="col-md-4">
                <label cLabel>Địa chỉ giao hàng</label>
                <select cSelect formControlName="shipToAddressId">
                  <option [ngValue]="null">Chọn địa chỉ</option>
                  @for (address of lookups()?.addresses ?? []; track address.id) {
                    <option [ngValue]="address.id">{{ address.name }}</option>
                  }
                </select>
              </div>
              <div class="col-md-4">
                <label cLabel>Phương thức giao hàng</label>
                <select cSelect formControlName="shipMethodId">
                  <option [ngValue]="null">Chọn phương thức</option>
                  @for (method of lookups()?.shipMethods ?? []; track method.id) {
                    <option [ngValue]="method.id">{{ method.name }}</option>
                  }
                </select>
              </div>

              <div class="col-md-3">
                <label cLabel>Thuế</label>
                <input cFormControl type="number" min="0" step="0.01" formControlName="taxAmt" />
              </div>
              <div class="col-md-3">
                <label cLabel>Phí vận chuyển</label>
                <input cFormControl type="number" min="0" step="0.01" formControlName="freight" />
              </div>
              <div class="col-md-3">
                <label cLabel>PO Number</label>
                <input cFormControl type="text" formControlName="purchaseOrderNumber" />
              </div>
              <div class="col-md-3">
                <label class="d-block mb-2">Kênh bán</label>
                <div class="form-check form-switch pt-1">
                  <input class="form-check-input" id="onlineOrderFlag" type="checkbox" formControlName="onlineOrderFlag" />
                  <label class="form-check-label" for="onlineOrderFlag">Đơn online</label>
                </div>
              </div>

              <div class="col-12">
                <label cLabel>Ghi chú</label>
                <textarea cFormControl class="note-textarea" rows="4" formControlName="comment" placeholder="Nhập ghi chú chi tiết cho đơn bán..."></textarea>
              </div>
            </div>

            <div class="d-flex align-items-center justify-content-between mt-4 mb-2">
              <h6 class="mb-0">Chi tiết sản phẩm</h6>
              <button class="btn btn-outline-primary btn-sm" type="button" (click)="addDetail()">Thêm dòng</button>
            </div>

            <div class="table-responsive border rounded" formArrayName="details">
              <table class="table table-sm align-middle mb-0 detail-table">
                <thead class="table-light">
                  <tr>
                    <th style="min-width: 220px;">Sản phẩm</th>
                    <th style="width: 190px;">Khuyến mãi</th>
                    <th style="width: 110px;">SL</th>
                    <th style="width: 140px;">Đơn giá</th>
                    <th style="width: 120px;">Giảm (%)</th>
                    <th class="text-end" style="width: 140px;">Thành tiền</th>
                    <th class="text-center" style="width: 80px;">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  @for (detail of details.controls; track $index; let i = $index) {
                    <tr [formGroupName]="i">
                      <td>
                        <select class="form-select form-select-sm" formControlName="productId">
                          <option [ngValue]="null">Chọn sản phẩm</option>
                          @for (product of lookups()?.products ?? []; track product.id) {
                            <option [ngValue]="product.id">{{ product.name }}</option>
                          }
                        </select>
                      </td>
                      <td>
                        <select class="form-select form-select-sm" formControlName="specialOfferId">
                          @for (offer of lookups()?.specialOffers ?? []; track offer.id) {
                            <option [ngValue]="offer.id">{{ offer.name }}</option>
                          }
                        </select>
                      </td>
                      <td><input class="form-control form-control-sm" type="number" min="1" formControlName="orderQty" /></td>
                      <td><input class="form-control form-control-sm" type="number" min="0" step="0.01" formControlName="unitPrice" /></td>
                      <td><input class="form-control form-control-sm" type="number" min="0" max="100" step="0.01" formControlName="unitPriceDiscount" /></td>
                      <td class="text-end fw-semibold">{{ detailLineTotal(i) | currency:'USD':'symbol':'1.2-2' }}</td>
                      <td class="text-center">
                        <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="details.length <= 1" (click)="removeDetail(i)">×</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-3">
              <div class="text-body-secondary">
                Tổng tiền: <strong>{{ formTotalDue() | currency:'USD':'symbol':'1.2-2' }}</strong>
              </div>
              <div class="d-flex gap-2">
                <button cButton color="secondary" variant="outline" type="button" (click)="startCreate()">Làm mới</button>
                <button cButton color="primary" type="submit" [disabled]="saving()">
                  {{ saving() ? 'Đang lưu...' : (editingId() ? 'Cập nhật' : 'Tạo mới') }}
                </button>
              </div>
            </div>
          </form>
        </c-card-body>
      </c-card>
      }
    </div>
  `,
  styles: [`
    .data-management-page { padding-bottom: 1.5rem; font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-weight: 400; letter-spacing: -.01em; }
    .data-management-page h4, .data-management-page h5, .data-management-page h6 { font-weight: 600; letter-spacing: -.025em; }
    .page-title-compact { font-size: 1.08rem; line-height: 1.25; }
    .data-management-page label, .data-management-page th { font-weight: 500; }
    .data-management-page strong, .data-management-page .fw-semibold { font-weight: 600 !important; }
    .data-management-page .small { font-weight: 400; }
    .header-action-buttons { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .data-action-btn { height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 6px; color: #fff; padding: 0 15px; font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: .94rem; font-weight: 600; line-height: 1; letter-spacing: -.01em; box-shadow: 0 6px 14px rgba(15, 23, 42, .11); transition: transform .16s ease, box-shadow .16s ease, filter .16s ease; }
    .data-action-btn:disabled { opacity: .76; cursor: wait; transform: none; }
    .data-action-btn:hover { transform: translateY(-1px); box-shadow: 0 9px 18px rgba(15, 23, 42, .14); filter: saturate(1.04) brightness(1.02); }
    .data-action-btn:active { transform: translateY(0); box-shadow: 0 4px 10px rgba(15, 23, 42, .10); }
    .export-menu-wrap { position: relative; }
    .data-action-export { background: linear-gradient(180deg, #62de38 0%, #4fd12a 100%); }
    .data-action-import { background: linear-gradient(180deg, #16c7e8 0%, #08b6dc 100%); }
    .data-action-create { background: linear-gradient(180deg, #6b68ff 0%, #5d5af5 100%); padding-inline: 17px; }
    .data-action-back { background: linear-gradient(180deg, #38bdf8 0%, #0ea5e9 100%); padding-inline: 14px 16px; box-shadow: 0 6px 14px rgba(14, 165, 233, .18); }
    .data-action-icon { width: 18px; height: 18px; display: block; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; opacity: .96; }
    .data-action-plus { width: 17px; height: 17px; stroke-width: 2; }
    .data-action-back-icon { width: 18px; height: 18px; stroke-width: 2; }
    .export-menu { position: absolute; top: calc(100% + 8px); left: 0; z-index: 1200; width: 230px; border: 1px solid var(--cui-border-color); border-radius: 10px; background: var(--cui-card-bg); box-shadow: 0 18px 38px rgba(15, 23, 42, .16); padding: .45rem; }
    .export-menu-item { width: 100%; border: 0; border-radius: 8px; background: transparent; color: var(--cui-body-color); display: flex; flex-direction: column; align-items: flex-start; gap: .12rem; padding: .58rem .72rem; text-align: left; }
    .export-menu-item:hover { background: var(--cui-tertiary-bg); }
    .export-menu-item span { font-weight: 500; font-size: .86rem; letter-spacing: -.01em; }
    .export-menu-item small { color: var(--cui-secondary-color); font-size: .72rem; font-weight: 400; line-height: 1.35; }
    .import-helper-text { margin: -.45rem 0 .85rem; color: var(--cui-secondary-color); font-size: .84rem; line-height: 1.45; }
    .import-modal-backdrop { position: fixed; inset: 0; z-index: 1095; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgba(15, 23, 42, .42); backdrop-filter: blur(2px); }
    .import-modal { position: relative; width: min(560px, 100%); border-radius: 13px; background: var(--cui-card-bg); color: var(--cui-body-color); box-shadow: 0 24px 60px rgba(15, 23, 42, .22); padding: 1.35rem; }
    .import-modal-close { position: absolute; top: .65rem; right: .75rem; width: 30px; height: 30px; border: 0; border-radius: 8px; background: transparent; color: var(--cui-secondary-color); font-size: 1.35rem; line-height: 1; }
    .import-modal-close:hover { background: var(--cui-tertiary-bg); color: var(--cui-body-color); }
    .import-modal h5 { margin: 0 2rem 1rem 0; font-size: 1.06rem; font-weight: 600; letter-spacing: -.02em; }
    .import-template-btn { height: 38px; display: inline-flex; align-items: center; gap: .5rem; border: 0; border-radius: 8px; background: #5f63ff; color: #fff; padding: 0 .9rem; font-size: .9rem; font-weight: 500; box-shadow: 0 8px 16px rgba(95, 99, 255, .18); }
    .import-template-btn svg, .import-preview-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .import-label { display: block; margin: 1rem 0 .45rem; color: var(--cui-body-color); font-size: .9rem; font-weight: 500; }
    .import-file-row { display: flex; align-items: center; gap: .7rem; min-height: 42px; border: 1px solid var(--cui-border-color); border-radius: 8px; background: var(--cui-body-bg); padding: .35rem .45rem; }
    .import-file-btn { height: 31px; border: 1px solid var(--cui-border-color); border-radius: 6px; background: var(--cui-tertiary-bg); color: var(--cui-body-color); padding: 0 .75rem; font-size: .84rem; font-weight: 500; }
    .import-file-row span { color: var(--cui-secondary-color); font-size: .86rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .import-preview-box { margin-top: 1rem; }
    .import-preview-title { margin-bottom: .45rem; color: var(--cui-secondary-color); font-size: .84rem; font-weight: 500; }
    .import-preview-box th { font-size: .76rem; font-weight: 500; color: var(--cui-secondary-color); }
    .import-preview-box td { font-size: .84rem; }
    .import-status-banner { width: 100%; border: 1px solid rgba(22, 199, 232, .35); border-radius: 12px; background: linear-gradient(180deg, rgba(22, 199, 232, .12), rgba(95, 99, 255, .08)); color: var(--cui-body-color); display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: 0 0 1rem; padding: .78rem .9rem; text-align: left; box-shadow: 0 8px 18px rgba(15, 23, 42, .06); }
    .import-status-banner:hover { border-color: rgba(22, 199, 232, .65); box-shadow: 0 10px 22px rgba(15, 23, 42, .1); }
    .import-status-banner-main { display: flex; align-items: center; gap: .7rem; min-width: 0; }
    .import-status-dot { width: 10px; height: 10px; border-radius: 999px; background: #16c7e8; box-shadow: 0 0 0 5px rgba(22, 199, 232, .15); flex: 0 0 auto; }
    .import-status-dot-done { background: #62de38; box-shadow: 0 0 0 5px rgba(98, 222, 56, .15); }
    .import-status-text { display: flex; flex-direction: column; gap: .1rem; min-width: 0; }
    .import-status-text strong { font-size: .9rem; }
    .import-status-text small { color: var(--cui-secondary-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .import-status-banner-progress { width: min(260px, 38%); display: flex; flex-direction: column; gap: .22rem; color: var(--cui-secondary-color); font-size: .78rem; }
    .import-progress-banner { margin: 0; height: 6px; }
    .import-modal-actions { display: flex; justify-content: flex-end; gap: .6rem; margin-top: 1.1rem; }
    .import-job-box { margin-top: 1rem; border: 1px solid var(--cui-border-color); border-radius: 10px; background: var(--cui-tertiary-bg); padding: .8rem; color: var(--cui-body-color); font-size: .84rem; }
    .import-progress { height: 7px; border-radius: 999px; background: rgba(99, 102, 241, .16); overflow: hidden; margin: .55rem 0 .35rem; }
    .import-progress span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #5f63ff, #16c7e8); transition: width .25s ease; }
    .import-cancel-btn, .import-preview-btn, .import-submit-btn { height: 38px; border: 0; border-radius: 8px; padding: 0 1rem; font-size: .9rem; font-weight: 500; }
    .import-cancel-btn { background: var(--cui-tertiary-bg); color: var(--cui-body-color); }
    .import-preview-btn { display: inline-flex; align-items: center; gap: .45rem; background: #5f63ff; color: #fff; box-shadow: 0 8px 16px rgba(95, 99, 255, .18); }
    .import-submit-btn { background: linear-gradient(180deg, #16c7e8 0%, #08b6dc 100%); color: #fff; box-shadow: 0 8px 16px rgba(8, 182, 220, .18); }
    .import-preview-btn:disabled, .import-submit-btn:disabled { opacity: .58; cursor: not-allowed; box-shadow: none; }
    .delete-confirm-backdrop { position: fixed; inset: 0; z-index: 1090; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgba(15, 23, 42, .42); backdrop-filter: blur(2px); }
    .delete-confirm-modal { width: min(410px, 100%); border-radius: 14px; background: var(--cui-card-bg); color: var(--cui-body-color); box-shadow: 0 24px 60px rgba(15, 23, 42, .22); padding: 1.35rem; text-align: center; }
    .delete-confirm-icon { width: 48px; height: 48px; margin: 0 auto .85rem; border-radius: 999px; display: flex; align-items: center; justify-content: center; background: #fee2e2; color: #dc2626; }
    .delete-confirm-icon svg { width: 26px; height: 26px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .delete-confirm-modal h5 { margin: 0 0 .45rem; font-weight: 750; letter-spacing: -.02em; }
    .delete-confirm-modal p { margin: 0; color: var(--cui-secondary-color); line-height: 1.5; }
    .delete-confirm-actions { display: flex; justify-content: center; gap: .6rem; margin-top: 1.2rem; }
    .delete-confirm-cancel, .delete-confirm-submit { height: 38px; border: 0; border-radius: 8px; padding: 0 1rem; font-weight: 700; letter-spacing: -.01em; }
    .delete-confirm-cancel { background: var(--cui-tertiary-bg); color: var(--cui-body-color); }
    .delete-confirm-submit { background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%); color: #fff; box-shadow: 0 8px 16px rgba(220, 38, 38, .18); }
    .delete-confirm-submit:disabled { opacity: .72; cursor: not-allowed; }
    .search-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .global-search-trigger { flex: 1; min-height: 44px; display: flex; align-items: center; gap: .75rem; border: 1px solid var(--cui-border-color); border-radius: 12px; background: var(--cui-body-bg); color: var(--cui-body-color); padding: .55rem .85rem; text-align: left; box-shadow: 0 1px 2px rgba(15, 23, 42, .04); }
    .global-search-trigger:hover { border-color: var(--cui-primary); box-shadow: 0 0 0 .2rem rgba(59, 130, 246, .12); }
    .search-trigger-icon { color: var(--cui-secondary-color); font-size: 1.1rem; }
    .search-trigger-text { flex: 1; color: var(--cui-secondary-color); }
    .search-trigger-shortcut { border: 1px solid var(--cui-border-color); border-radius: 8px; color: var(--cui-secondary-color); font-size: .78rem; padding: .15rem .45rem; }
    .global-search-backdrop { position: fixed; inset: 0; z-index: 1080; background: rgba(15, 23, 42, .38); display: flex; align-items: center; justify-content: center; padding: 1.5rem .75rem; }
    .global-search-modal { position: relative; width: min(760px, calc(100% - 2rem)); border-radius: 10px; background: #fff; color: #374151; box-shadow: 0 14px 36px rgba(15, 23, 42, .18); padding: 1.25rem 1.35rem 1.35rem; }
    .global-search-close { position: absolute; top: -10px; right: -10px; width: 32px; height: 32px; border: 0; border-radius: 8px; background: #fff; color: #9ca3af; font-size: 1.35rem; font-weight: 700; line-height: 1; box-shadow: 0 8px 18px rgba(15, 23, 42, .12); }
    .global-search-close:hover { color: #6b7280; }
    .global-search-title { margin: 0 0 .55rem; color: #374151; font-size: 1.12rem; font-weight: 600; letter-spacing: -.02em; }
    .global-search-input-wrap { position: relative; display: flex; align-items: center; border: 2px solid #6366ff; border-radius: 8px; background: #fff; box-shadow: 0 0 0 .14rem rgba(99, 102, 255, .14), 0 5px 12px rgba(99, 102, 255, .1); }
    .global-search-input { width: 100%; height: 46px; border: 0; background: transparent; color: #374151; font-size: 1.02rem; padding: .55rem 2.7rem .55rem 1rem; outline: none; }
    .global-search-input::placeholder { color: #9ca3af; }
    .global-search-clear { position: absolute; right: .45rem; width: 26px; height: 26px; border: 0; border-radius: 999px; background: transparent; color: #9ca3af; font-size: 1.15rem; line-height: 1; }
    .global-search-clear:hover { color: #6b7280; background: #f3f4f6; }
    .global-search-meta { display: flex; justify-content: space-between; gap: 1rem; margin: .45rem 0 .4rem; color: #6b7280; font-size: .82rem; }
    .global-search-results { border: 1px solid #dfe3ea; border-radius: 7px; overflow: hidden; min-height: 58px; max-height: 240px; overflow-y: auto; background: #fff; }
    .global-search-results-hidden { display: none; }
    .global-search-section { display: none; }
    .global-search-result { width: 100%; min-height: 44px; border: 0; border-top: 1px solid #e5e7eb; background: #fff; color: #1f2937; display: grid; grid-template-columns: 1fr auto 16px; align-items: center; gap: .6rem; padding: .4rem .9rem; text-align: left; transition: background .16s ease; }
    .global-search-result:first-of-type { border-top: 0; }
    .global-search-result:hover { background: #f9fafb; }
    .result-icon { display: none; }
    .result-content { min-width: 0; line-height: 1.2; }
    .result-content strong { display: block; color: #111827; font-size: .88rem; font-weight: 600; }
    .result-content small { display: block; margin-top: .08rem; color: #64748b; font-size: .74rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .result-amount { color: #64748b; font-size: .78rem; font-weight: 500; white-space: nowrap; }
    .result-chevron { color: #64748b; font-size: 1.15rem; line-height: 1; }
    .global-search-empty { min-height: 56px; display: flex; align-items: center; justify-content: center; padding: .75rem; color: #374151; font-size: .86rem; text-align: center; }
    .status-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 58px; border-radius: 5px; padding: .22rem .5rem; font-size: .82rem; font-weight: 700; line-height: 1.1; }
    .status-success { background: #dcf8d2; color: #55d628; }
    .status-primary { background: #dbeafe; color: #2563eb; }
    .status-warning { background: #fef3c7; color: #d97706; }
    .status-danger { background: #fee2e2; color: #ff3b30; }
    .data-table tbody { min-height: 540px; }
    .data-table tr { height: 64px; }
    .note-textarea { min-height: 112px; resize: vertical; line-height: 1.5; }
    .detail-count-pill { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--cui-tertiary-bg); color: var(--cui-body-color); padding: .25rem .65rem; font-size: .82rem; font-weight: 600; white-space: nowrap; }
    .action-cell { position: relative; }
    .action-menu-trigger { width: 32px; height: 32px; border: 0; border-radius: 8px; background: transparent; color: var(--cui-secondary-color); font-size: 1.35rem; line-height: 1; }
    .action-menu-trigger:hover { background: var(--cui-tertiary-bg); color: var(--cui-body-color); }
    .action-menu { position: absolute; right: .75rem; top: 2.35rem; z-index: 20; min-width: 156px; border: 1px solid var(--cui-border-color); border-radius: 8px; background: var(--cui-card-bg); box-shadow: 0 16px 34px rgba(15, 23, 42, .16); padding: .45rem 0; text-align: left; }
    .action-menu-item { width: 100%; display: flex; align-items: center; gap: .75rem; border: 0; background: transparent; color: var(--cui-body-color); padding: .65rem .9rem; font-size: .95rem; }
    .action-menu-item:hover { background: var(--cui-tertiary-bg); }
    .action-menu-item-danger { color: var(--cui-danger); }
    .action-icon { width: 18px; text-align: center; }
    .pagination-toolbar { display: flex; align-items: center; justify-content: space-between; gap: .75rem; flex-wrap: wrap; }
    .page-size-select { width: 82px; }
    .page-number-group .btn-primary { color: #fff; }
    .data-table th { white-space: nowrap; font-size: .78rem; font-weight: 500; text-transform: uppercase; letter-spacing: .02em; color: var(--cui-secondary-color); }
    .data-table td { vertical-align: middle; }
    .customer-cell { max-width: 240px; }
    .detail-table th { white-space: nowrap; font-size: .78rem; font-weight: 500; text-transform: uppercase; color: var(--cui-secondary-color); }
    .table-responsive { background: var(--cui-card-bg); }
    .import-preview-scroll { max-width: 100%; overflow-x: auto; overflow-y: hidden; background: var(--cui-card-bg); }
    .import-preview-table { min-width: 1180px; white-space: nowrap; }
    .import-preview-table th { font-size: .76rem; font-weight: 700; color: var(--cui-secondary-color); background: var(--cui-tertiary-bg); }
    .import-preview-table td { font-size: .82rem; vertical-align: middle; }
    :host-context([data-coreui-theme='dark']) .table-light,
    :host-context([data-bs-theme='dark']) .table-light,
    :host-context(.dark-theme) .table-light {
      --cui-table-bg: rgba(255, 255, 255, 0.04);
      --cui-table-color: var(--cui-body-color);
    }
  `],
})
export class DataManagementComponent implements OnInit {
  @ViewChild('globalSearchInput') private readonly globalSearchInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SalesDataManagementService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);

  readonly pageSizeOptions = [10, 20, 50, 100];
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly orders = signal<SalesOrderListItemDto[]>([]);
  readonly selectedOrder = signal<SalesOrderDto | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly showEditor = signal(false);
  readonly lookups = signal<SalesOrderLookupsDto | null>(null);
  readonly page = signal(1);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly errorMessage = signal<string | null>(null);
  readonly showSearchBox = signal(false);
  readonly searchLoading = signal(false);
  readonly searchResults = signal<SalesOrderListItemDto[]>([]);
  readonly searchKeyword = signal('');
  readonly openActionOrderId = signal<number | null>(null);
  readonly pendingDeleteOrder = signal<SalesOrderListItemDto | null>(null);
  readonly deleting = signal(false);
  readonly exporting = signal(false);
  readonly showExportMenu = signal(false);
  readonly showImportModal = signal(false);
  readonly importing = signal(false);
  readonly importFileName = signal('');
  readonly importJobStatus = signal<SalesOrderImportStatusDto | null>(null);
  readonly importPreviewHeaders: Array<{ key: keyof ImportPreviewRow; label: string }> = [
    { key: 'orderDate', label: 'Ngày đặt' },
    { key: 'dueDate', label: 'Ngày đến hạn' },
    { key: 'shipDate', label: 'Ngày giao' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'customerName', label: 'CustomerID' },
    { key: 'employeeName', label: 'SalesPersonID' },
    { key: 'territoryName', label: 'TerritoryID' },
    { key: 'billToAddress', label: 'BillToAddressID' },
    { key: 'shipToAddress', label: 'ShipToAddressID' },
    { key: 'shipMethod', label: 'ShipMethodID' },
    { key: 'tax', label: 'Thuế' },
    { key: 'freight', label: 'Phí vận chuyển' },
    { key: 'purchaseOrderNumber', label: 'PO Number' },
    { key: 'onlineOrderFlag', label: 'OnlineOrderFlag' },
    { key: 'note', label: 'Ghi chú' },
    { key: 'productName', label: 'ProductID' },
    { key: 'specialOfferName', label: 'SpecialOfferID' },
    { key: 'quantity', label: 'SL' },
    { key: 'unitPrice', label: 'Đơn giá' },
    { key: 'discountPercent', label: 'Giảm (%)' },
  ];
  readonly importPreviewRows = signal<ImportPreviewRow[]>([]);
  readonly importProgress = computed(() => {
    const status = this.importJobStatus();
    if (!status?.totalRows) return status ? 3 : 0;
    return Math.min(100, Math.round((status.processedRows / status.totalRows) * 100));
  });
  private selectedImportFile: File | null = null;
  readonly hasSearchKeyword = computed(() => !!this.searchKeyword().trim());
  readonly searchPreviewOrders = computed(() => this.searchResults().slice(0, 8));
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 0) return [];

    const start = Math.max(1, Math.min(current - 2, total - 4));
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  readonly statuses = [
    { id: 1, name: 'Đang xử lý' },
    { id: 2, name: 'Đã duyệt' },
    { id: 3, name: 'Tồn kho sau' },
    { id: 4, name: 'Bị từ chối' },
    { id: 5, name: 'Đã giao' },
    { id: 6, name: 'Đã hủy' },
  ];

  readonly searchForm = this.fb.group({
    search: [''],
  });

  readonly orderForm = this.fb.group({
    orderDate: [this.toDateInput(new Date()), Validators.required],
    dueDate: [this.toDateInput(this.addDays(new Date(), 7)), Validators.required],
    shipDate: [''],
    status: [1, Validators.required],
    onlineOrderFlag: [true],
    purchaseOrderNumber: [''],
    accountNumber: [''],
    customerId: [null as number | null, Validators.required],
    salesPersonId: [null as number | null],
    territoryId: [null as number | null],
    billToAddressId: [null as number | null, Validators.required],
    shipToAddressId: [null as number | null, Validators.required],
    shipMethodId: [null as number | null, Validators.required],
    taxAmt: [0, [Validators.required, Validators.min(0)]],
    freight: [0, [Validators.required, Validators.min(0)]],
    comment: [''],
    details: this.fb.array([this.createDetailGroup()]),
  });

  formSubTotal(): number {
    return this.details.controls.reduce((sum, _, index) => sum + this.detailLineTotal(index), 0);
  }

  formTotalDue(): number {
    const tax = Number(this.orderForm.controls.taxAmt.value ?? 0);
    const freight = Number(this.orderForm.controls.freight.value ?? 0);
    return this.formSubTotal() + tax + freight;
  }

  get details(): FormArray {
    return this.orderForm.controls.details;
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadOrders(1);
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openSearchBox();
    }

    if (event.key === 'Escape') {
      if (this.showImportModal()) {
        this.closeImportModal();
      }
      this.closeActionMenu();
    }
  }

  @HostListener('document:click')
  closeActionMenu(): void {
    this.openActionOrderId.set(null);
    this.showExportMenu.set(false);
  }

  toggleActionMenu(orderId: number, event: Event): void {
    event.stopPropagation();
    this.openActionOrderId.update(current => current === orderId ? null : orderId);
  }

  toggleExportMenu(event: Event): void {
    event.stopPropagation();
    if (this.exporting()) return;
    this.showExportMenu.update(current => !current);
  }

  closeExportMenu(): void {
    this.showExportMenu.set(false);
  }

  openImportModal(): void {
    this.closeExportMenu();
    this.showImportModal.set(true);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);

    if (this.importJobStatus()) {
      return;
    }

    this.importFileName.set('');
    this.importPreviewRows.set([]);
    this.importing.set(false);
    this.selectedImportFile = null;
  }

  reopenImportModal(): void {
    this.showImportModal.set(true);
  }

  downloadImportTemplate(): void {
    const headerCells = ['Ngày đặt', 'Ngày đến hạn', 'Ngày giao', 'Trạng thái', 'CustomerID', 'SalesPersonID', 'TerritoryID', 'BillToAddressID', 'ShipToAddressID', 'ShipMethodID', 'Thuế', 'Phí vận chuyển', 'PO Number', 'OnlineOrderFlag (1=Online, 0=Offline)', 'Ghi chú', 'ProductID', 'SpecialOfferID', 'SL', 'Đơn giá', 'Giảm (%)'];
    const sampleRows = [
      [this.toDateInput(new Date()), this.toDateInput(this.addDays(new Date(), 7)), '', 'Đang xử lý', '11000', '', '', '1', '1', '1', '15.00', '5.00', 'PO-MAU-001', '1', 'Ghi chú mẫu', '707', '1', '2', '150.00', '0'],
      [this.toDateInput(new Date()), this.toDateInput(this.addDays(new Date(), 10)), '', 'Đã duyệt', '11001', '', '', '2', '2', '2', '24.00', '8.00', 'PO-MAU-002', '0', 'Dòng mẫu thứ hai', '708', '1', '1', '240.00', '5'],
    ];
    const worksheet = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Mẫu nhập đơn bán</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; }
            th { background: #5f63ff; color: #ffffff; font-weight: 700; border: 1px solid #d9d9e3; padding: 8px; }
            td { border: 1px solid #d9d9e3; padding: 7px; mso-number-format: "\\@"; }
            .note { color: #666666; font-style: italic; }
          </style>
        </head>
        <body>
          <table>
            <thead><tr>${headerCells.map(cell => `<th>${this.escapeExcelValue(cell)}</th>`).join('')}</tr></thead>
            <tbody>
              ${sampleRows.map(row => `<tr>${row.map(cell => `<td>${this.escapeExcelValue(cell)}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
          <br />
          <div class="note">File mẫu dùng đúng thuộc tính của màn Tạo đơn bán mới. Các ô chọn dạng combobox phải nhập ID tương ứng: CustomerID, SalesPersonID, TerritoryID, BillToAddressID, ShipToAddressID, ShipMethodID, ProductID, SpecialOfferID. OnlineOrderFlag nhập 1 nếu là đơn online, nhập 0 nếu là đơn offline/bán trực tiếp. SalesOrderID không cần nhập vì database tự tăng.</div>
        </body>
      </html>`;
    const blob = new Blob([worksheet], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mau-nhap-don-ban.xls';
    link.click();
    URL.revokeObjectURL(url);
  }

  previewImportFile(): void {
    if (!this.selectedImportFile) {
      this.messageService.add({ severity: 'warn', summary: 'Chưa chọn file', detail: 'Vui lòng chọn file Excel trước khi xem trước.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = this.extractImportRows(reader.result, this.selectedImportFile?.name).slice(0, 8);
        this.importPreviewRows.set(rows);
        this.messageService.add({
          severity: rows.length > 0 ? 'info' : 'warn',
          summary: 'Xem trước dữ liệu',
          detail: rows.length > 0
            ? `Đã đọc trước ${rows.length} dòng từ ${this.selectedImportFile?.name}.`
            : 'File không có dòng dữ liệu hợp lệ để xem trước.'
        });
      } catch {
        this.importPreviewRows.set([]);
        this.messageService.add({ severity: 'error', summary: 'Lỗi xem trước', detail: 'Không thể đọc nội dung file Excel. Vui lòng kiểm tra lại định dạng file.' });
      }
    };
    reader.onerror = () => this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể đọc file Excel để xem trước.' });
    reader.readAsArrayBuffer(this.selectedImportFile);
  }

  submitImportFile(): void {
    if (!this.selectedImportFile || this.importing()) return;

    this.importing.set(true);
    this.service.importOrders(this.selectedImportFile)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.importJobStatus.set(status);
          this.messageService.add({ severity: 'success', summary: 'Đã đưa vào hàng đợi', detail: 'File Excel đang được xử lý nền bằng Hangfire.' });
          this.pollImportStatus(status.jobId);
        },
        error: (err) => {
          this.importing.set(false);
          this.messageService.add({ severity: 'error', summary: 'Lỗi nhập Excel', detail: err?.error?.detail || err?.error?.title || 'Không thể đưa file vào hàng đợi nhập.' });
        }
      });
  }

  private pollImportStatus(jobId: string): void {
    timer(800, 1500)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.importing()) return;
        this.service.getImportStatus(jobId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (status) => {
              this.importJobStatus.set(status);
              if (status.status === 'Completed' || status.status === 'Failed') {
                this.importing.set(false);
                if (status.status === 'Completed') {
                  this.clearSearchState();
                  this.page.set(1);
                  this.loadOrders(1);
                  this.messageService.add({ severity: 'success', summary: 'Nhập hoàn tất', detail: `Đã nhập ${status.insertedRows} dòng. Danh sách đã được làm mới.` });
                }
              }
            },
            error: () => this.importing.set(false)
          });
      });
  }

  requestDeleteOrder(order: SalesOrderListItemDto): void {
    this.pendingDeleteOrder.set(order);
  }

  cancelDeleteOrder(): void {
    if (this.deleting()) return;
    this.pendingDeleteOrder.set(null);
  }

  confirmDeleteOrder(): void {
    const order = this.pendingDeleteOrder();
    if (!order) return;

    this.deleting.set(true);
    this.service.deleteOrder(order.salesOrderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteOrder.set(null);
          this.messageService.add({ severity: 'success', summary: 'Đã xóa', detail: 'Đã xóa đơn bán.' });
          if (this.editingId() === order.salesOrderId) {
            this.startCreate();
          }
          this.loadOrders(this.page());
        },
        error: () => {
          this.deleting.set(false);
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xóa đơn bán.' });
        }
      });
  }

  loadOrders(page: number = 1): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.getOrders(page, this.pageSize(), this.searchForm.controls.search.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.orders.set(result.items);
          this.page.set(result.page);
          this.totalCount.set(result.totalCount);
          this.totalPages.set(result.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Không thể tải danh sách đơn bán.');
        }
      });
  }

  loadLookups(): void {
    this.service.getLookups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lookups) => {
          this.lookups.set(lookups);
          this.patchDefaultLookups();
        },
        error: () => this.errorMessage.set('Không thể tải dữ liệu chọn nhanh.')
      });
  }

  onPageSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSize.set(value);
    this.loadOrders(1);
  }

  openSearchBox(): void {
    this.showSearchBox.set(true);
    this.searchKeyword.set('');
    this.searchResults.set([]);
    this.searchLoading.set(false);
    this.searchForm.patchValue({ search: '' }, { emitEvent: false });
    setTimeout(() => this.globalSearchInput?.nativeElement.focus());
  }

  closeSearchBox(): void {
    this.showSearchBox.set(false);
    this.clearSearchState();
  }

  onSearchInput(event: Event): void {
    const keyword = (event.target as HTMLInputElement).value;
    this.searchKeyword.set(keyword);
    this.searchForm.patchValue({ search: keyword }, { emitEvent: false });

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    if (keyword.trim().length < 2) {
      this.searchResults.set([]);
      this.searchLoading.set(false);
      return;
    }

    this.searchTimer = setTimeout(() => this.loadSearchResults(keyword), 450);
  }

  loadSearchResults(keyword: string): void {
    this.searchLoading.set(true);
    this.service.getOrders(1, 8, keyword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (this.searchKeyword().trim() === keyword.trim()) {
            this.searchResults.set(result.items);
          }
          this.searchLoading.set(false);
        },
        error: () => {
          this.searchResults.set([]);
          this.searchLoading.set(false);
        }
      });
  }

  selectSearchResult(order: SalesOrderListItemDto): void {
    this.closeSearchBox();
    this.editOrder(order);
  }

  resetSearch(): void {
    this.clearSearchState();
    this.loadOrders(1);
  }

  resetSearchBox(): void {
    this.clearSearchState();
    setTimeout(() => this.globalSearchInput?.nativeElement.focus());
  }

  exportOrders(): void {
    this.exportAllOrders();
  }

  exportCurrentPage(): void {
    const rows = this.orders();
    if (rows.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Không có dữ liệu', detail: 'Không có đơn bán nào để xuất.' });
      return;
    }

    this.downloadOrdersExcel(rows, `don-ban-trang-${this.page()}.xls`);
  }

  exportAllOrders(): void {
    if (this.exporting()) return;

    this.exporting.set(true);
    const pageSize = 1000;
    const keyword = this.searchForm.controls.search.value || null;

    this.service.getOrders(1, pageSize, keyword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (firstPage) => {
          if (firstPage.totalCount === 0) {
            this.exporting.set(false);
            this.messageService.add({ severity: 'warn', summary: 'Không có dữ liệu', detail: 'Không có đơn bán nào để xuất.' });
            return;
          }

          const pageRequests = Array.from({ length: Math.max(firstPage.totalPages - 1, 0) }, (_, index) =>
            this.service.getOrders(index + 2, pageSize, keyword)
          );

          if (pageRequests.length === 0) {
            this.exporting.set(false);
            this.downloadOrdersExcel(firstPage.items);
            return;
          }

          forkJoin(pageRequests)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (pages) => {
                const allRows = [firstPage.items, ...pages.map(page => page.items)].flat();
                this.exporting.set(false);
                this.downloadOrdersExcel(allRows);
              },
              error: () => {
                this.exporting.set(false);
                this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xuất dữ liệu đơn bán.' });
              }
            });
        },
        error: () => {
          this.exporting.set(false);
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xuất dữ liệu đơn bán.' });
        }
      });
  }

  private downloadOrdersExcel(rows: SalesOrderListItemDto[], fileName = `tat-ca-don-ban-${new Date().toISOString().slice(0, 10)}.xls`): void {
    const headerCells = ['Mã đơn', 'Ngày đặt', 'Khách hàng', 'Nhân viên', 'Trạng thái', 'Sản phẩm trong đơn', 'Tổng tiền'];
    const bodyRows = rows.map(order => [
      order.salesOrderNumber,
      this.formatExportDate(order.orderDate),
      order.customerName,
      order.salesPersonName || '—',
      this.statusLabel(order.status),
      `${order.detailCount} sản phẩm`,
      order.totalDue,
    ]);
    const worksheet = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Đơn bán</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; }
            th { background: #615eff; color: #ffffff; font-weight: 700; border: 1px solid #d9d9e3; padding: 8px; }
            td { border: 1px solid #d9d9e3; padding: 7px; mso-number-format: "\\@"; }
            .money { mso-number-format: "#,##0.00"; text-align: right; }
          </style>
        </head>
        <body>
          <table>
            <thead><tr>${headerCells.map(cell => `<th>${this.escapeExcelValue(cell)}</th>`).join('')}</tr></thead>
            <tbody>
              ${bodyRows.map(row => `
                <tr>
                  ${row.map((cell, index) => `<td${index === 6 ? ' class="money"' : ''}>${this.escapeExcelValue(cell)}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>`;
    const blob = new Blob([worksheet], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  handleImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedImportFile = file;
      this.importFileName.set(file.name);
      this.importPreviewRows.set([]);
      this.messageService.add({ severity: 'info', summary: 'Đã chọn file', detail: `Sẵn sàng xem trước file ${file.name}.` });
    }
    input.value = '';
  }

  private clearSearchState(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }

    this.searchKeyword.set('');
    this.searchResults.set([]);
    this.searchLoading.set(false);
    this.searchForm.reset({ search: '' });
  }

  private formatExportDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN');
  }

  private escapeExcelValue(value: string | number): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private extractImportRows(content: string | ArrayBuffer | null, fileName?: string): ImportPreviewRow[] {
    if (!content) return [];

    const extension = (fileName ?? '').toLowerCase();
    const rows = content instanceof ArrayBuffer && (extension.endsWith('.xlsx') || extension.endsWith('.xls'))
      ? this.extractWorkbookRows(content)
      : this.extractTextImportRows(typeof content === 'string' ? content : new TextDecoder('utf-8').decode(content));

    return rows
      .filter(cells => cells.length >= 12 && cells.some(cell => cell.trim().length > 0))
      .map(cells => {
        const hasOrderNumber = this.looksLikeImportOrderNumber(cells[0]);
        const offset = hasOrderNumber ? 1 : 0;
        const isCreateOrderTemplate = cells.length >= offset + 20;
        const qtyIndex = isCreateOrderTemplate ? offset + 17 : offset + 6;
        const priceIndex = isCreateOrderTemplate ? offset + 18 : offset + 7;
        const discountIndex = isCreateOrderTemplate ? offset + 19 : offset + 8;
        const taxIndex = isCreateOrderTemplate ? offset + 10 : offset + 9;
        const freightIndex = isCreateOrderTemplate ? offset + 11 : offset + 10;
        const qty = this.toImportNumber(cells[qtyIndex]);
        const price = this.toImportNumber(cells[priceIndex]);
        const discount = this.toImportNumber(cells[discountIndex]) / 100;
        const tax = this.toImportNumber(cells[taxIndex]);
        const freight = this.toImportNumber(cells[freightIndex]);
        const total = (qty * price * (1 - discount)) + tax + freight;

        if (isCreateOrderTemplate) {
          return {
            orderDate: cells[offset] || '—',
            dueDate: cells[offset + 1] || '—',
            shipDate: cells[offset + 2] || '—',
            status: cells[offset + 3] || 'Đang xử lý',
            onlineOrderFlag: this.formatImportOnlineFlag(cells[offset + 13]),
            purchaseOrderNumber: cells[offset + 12] || '—',
            accountNumber: '—',
            customerName: cells[offset + 4] || '—',
            employeeName: cells[offset + 5] || '—',
            territoryName: cells[offset + 6] || '—',
            billToAddress: cells[offset + 7] || '—',
            shipToAddress: cells[offset + 8] || '—',
            shipMethod: cells[offset + 9] || '—',
            tax: cells[offset + 10] || '0',
            freight: cells[offset + 11] || '0',
            note: cells[offset + 14] || '—',
            productName: cells[offset + 15] || '—',
            specialOfferName: cells[offset + 16] || '—',
            quantity: cells[offset + 17] || '0',
            unitPrice: cells[offset + 18] || '0',
            discountPercent: cells[offset + 19] || '0',
            totalDue: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'USD' }).format(Number.isFinite(total) ? total : 0),
          };
        }

        return {
          orderDate: cells[offset] || '—',
          dueDate: cells[offset + 1] || '—',
          shipDate: '—',
          status: cells[offset + 4] || 'Đang xử lý',
          onlineOrderFlag: 'Online',
          purchaseOrderNumber: '—',
          accountNumber: '—',
          customerName: cells[offset + 2] || '—',
          employeeName: cells[offset + 3] || '—',
          territoryName: '—',
          billToAddress: '—',
          shipToAddress: '—',
          shipMethod: '—',
          tax: cells[offset + 9] || '0',
          freight: cells[offset + 10] || '0',
          note: cells[offset + 11] || '—',
          productName: cells[offset + 5] || '—',
          specialOfferName: '—',
          quantity: cells[offset + 6] || '0',
          unitPrice: cells[offset + 7] || '0',
          discountPercent: cells[offset + 8] || '0',
          totalDue: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'USD' }).format(Number.isFinite(total) ? total : 0),
        };
      });
  }

  private extractWorkbookRows(content: ArrayBuffer): string[][] {
    const workbook = XLSX.read(content, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const sheet = workbook.Sheets[firstSheetName];
    const values = XLSX.utils.sheet_to_json<Array<string | number | Date | null>>(sheet, { header: 1, defval: '' });
    return values
      .slice(1)
      .map(row => row.map(cell => cell instanceof Date ? this.toDateInput(cell) : String(cell ?? '').trim()));
  }

  private extractTextImportRows(content: string): string[][] {
    const htmlRows = Array.from(content.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis))
      .slice(1)
      .map(match => Array.from(match[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gis))
        .map(cell => this.decodeImportCell(cell[1])));

    if (htmlRows.length > 0) return htmlRows;

    return content
      .split('\n')
      .slice(1)
      .map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
  }

  private formatImportOnlineFlag(value: string): string {
    const normalized = value.trim().toLowerCase();
    return normalized === '0' || normalized === 'o' || normalized === 'false' || normalized === 'offline' || normalized === 'không' || normalized === 'khong'
      ? 'Offline'
      : 'Online';
  }

  private looksLikeImportOrderNumber(value: string): boolean {
    return /^SO[-\w]*\d+$/i.test(value.trim());
  }

  private toImportNumber(value: string): number {
    const normalized = value.replace(/,/g, '').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private decodeImportCell(value: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value.replace(/<.*?>/g, '');
    return textarea.value.trim();
  }

  selectOrder(order: SalesOrderListItemDto): void {
    this.service.getOrder(order.salesOrderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => this.selectedOrder.set(detail),
        error: () => this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải chi tiết đơn bán.' })
      });
  }

  editOrder(order: SalesOrderListItemDto): void {
    this.service.getOrder(order.salesOrderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.selectedOrder.set(detail);
          this.editingId.set(detail.salesOrderId);
          this.fillForm(detail);
          this.showEditor.set(true);
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu để sửa.' })
      });
  }

  startCreate(): void {
    this.showEditor.set(true);
    this.editingId.set(null);
    this.selectedOrder.set(null);
    this.details.clear();
    this.details.push(this.createDetailGroup());
    this.orderForm.reset({
      orderDate: this.toDateInput(new Date()),
      dueDate: this.toDateInput(this.addDays(new Date(), 7)),
      shipDate: '',
      status: 1,
      onlineOrderFlag: true,
      purchaseOrderNumber: '',
      accountNumber: '',
      customerId: null,
      salesPersonId: null,
      territoryId: null,
      billToAddressId: null,
      shipToAddressId: null,
      shipMethodId: null,
      taxAmt: 0,
      freight: 0,
      comment: '',
    });
    this.patchDefaultLookups();
  }

  backToList(): void {
    this.showEditor.set(false);
    this.loadOrders(this.page());
  }

  saveOrder(): void {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      const missingFields = [
        this.orderForm.controls.customerId.invalid ? 'khách hàng' : null,
        this.orderForm.controls.billToAddressId.invalid ? 'địa chỉ thanh toán' : null,
        this.orderForm.controls.shipToAddressId.invalid ? 'địa chỉ giao hàng' : null,
        this.orderForm.controls.shipMethodId.invalid ? 'phương thức giao hàng' : null,
        this.details.controls.some(detail => detail.get('productId')?.invalid) ? 'sản phẩm trong chi tiết đơn' : null,
        this.details.controls.some(detail => detail.get('orderQty')?.invalid) ? 'số lượng phải lớn hơn 0' : null,
        this.details.controls.some(detail => detail.get('unitPrice')?.invalid) ? 'đơn giá không hợp lệ' : null,
        this.details.controls.some(detail => detail.get('unitPriceDiscount')?.invalid) ? 'giảm giá phải từ 0% đến 100%' : null,
      ].filter(Boolean).join(', ');
      this.messageService.add({
        severity: 'warn',
        summary: 'Thiếu dữ liệu',
        detail: missingFields ? `Vui lòng chọn ${missingFields}.` : 'Vui lòng kiểm tra lại số lượng, đơn giá hoặc giảm giá.'
      });
      return;
    }

    const request = this.buildRequest();
    const id = this.editingId();
    this.saving.set(true);
    const operation = id ? this.service.updateOrder(id, request) : this.service.createOrder(request);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (order) => {
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: id ? 'Đã cập nhật đơn bán.' : 'Đã tạo đơn bán.' });
        this.selectedOrder.set(order);
        this.editingId.set(order.salesOrderId);
        this.fillForm(order);
        this.showEditor.set(false);
        this.loadOrders(1);
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: err?.error?.detail || err?.error?.title || 'Không thể lưu đơn bán.',
        });
      }
    });
  }

  addDetail(): void {
    this.details.push(this.createDetailGroup());
  }

  removeDetail(index: number): void {
    if (this.details.length > 1) {
      this.details.removeAt(index);
    }
  }

  detailLineTotal(index: number): number {
    const detail = this.details.at(index).value;
    const qty = Number(detail.orderQty ?? 0);
    const price = Number(detail.unitPrice ?? 0);
    const discount = Number(detail.unitPriceDiscount ?? 0);
    return qty * price * (1 - (discount / 100));
  }

  syncCustomerDefaults(): void {
    const customerId = this.orderForm.controls.customerId.value;
    if (customerId && !this.orderForm.controls.accountNumber.value) {
      this.orderForm.patchValue({ accountNumber: `10-${customerId}` });
    }
  }

  statusLabel(status: number): string {
    return this.statuses.find(item => item.id === status)?.name ?? `#${status}`;
  }

  statusClass(status: number): string {
    if (status === 5) return 'status-success';
    if (status === 6 || status === 4) return 'status-danger';
    if (status === 3) return 'status-warning';
    return 'status-primary';
  }

  private createDetailGroup() {
    return this.fb.group({
      salesOrderDetailId: [null as number | null],
      orderQty: [1, [Validators.required, Validators.min(1)]],
      productId: [null as number | null, Validators.required],
      specialOfferId: [1, Validators.required],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      unitPriceDiscount: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
  }

  private fillForm(order: SalesOrderDto): void {
    this.details.clear();
    for (const detail of order.details) {
      this.details.push(this.fb.group({
        salesOrderDetailId: [detail.salesOrderDetailId],
        orderQty: [detail.orderQty, [Validators.required, Validators.min(1)]],
        productId: [detail.productId, Validators.required],
        specialOfferId: [detail.specialOfferId, Validators.required],
        unitPrice: [detail.unitPrice, [Validators.required, Validators.min(0)]],
        unitPriceDiscount: [detail.unitPriceDiscount > 1 ? detail.unitPriceDiscount : detail.unitPriceDiscount * 100, [Validators.required, Validators.min(0), Validators.max(100)]],
      }));
    }

    if (this.details.length === 0) {
      this.details.push(this.createDetailGroup());
    }

    this.orderForm.patchValue({
      orderDate: this.toDateInput(order.orderDate),
      dueDate: this.toDateInput(order.dueDate),
      shipDate: order.shipDate ? this.toDateInput(order.shipDate) : '',
      status: order.status,
      onlineOrderFlag: order.onlineOrderFlag,
      purchaseOrderNumber: order.purchaseOrderNumber ?? '',
      accountNumber: order.accountNumber ?? '',
      customerId: order.customerId,
      salesPersonId: order.salesPersonId ?? null,
      territoryId: order.territoryId ?? null,
      billToAddressId: order.billToAddressId,
      shipToAddressId: order.shipToAddressId,
      shipMethodId: order.shipMethodId,
      taxAmt: order.taxAmt,
      freight: order.freight,
      comment: order.comment ?? '',
    });
  }

  private buildRequest(): UpsertSalesOrderRequest {
    const value = this.orderForm.getRawValue();
    return {
      orderDate: value.orderDate!,
      dueDate: value.dueDate!,
      shipDate: value.shipDate || null,
      status: Number(value.status),
      onlineOrderFlag: Boolean(value.onlineOrderFlag),
      purchaseOrderNumber: value.purchaseOrderNumber || null,
      accountNumber: value.accountNumber || null,
      customerId: Number(value.customerId),
      salesPersonId: value.salesPersonId == null ? null : Number(value.salesPersonId),
      territoryId: value.territoryId == null ? null : Number(value.territoryId),
      billToAddressId: Number(value.billToAddressId),
      shipToAddressId: Number(value.shipToAddressId),
      shipMethodId: Number(value.shipMethodId),
      taxAmt: Number(value.taxAmt ?? 0),
      freight: Number(value.freight ?? 0),
      comment: value.comment || null,
      details: value.details.map(detail => ({
        salesOrderDetailId: detail.salesOrderDetailId ?? null,
        orderQty: Number(detail.orderQty),
        productId: Number(detail.productId),
        specialOfferId: Number(detail.specialOfferId),
        unitPrice: Number(detail.unitPrice),
        unitPriceDiscount: Number(detail.unitPriceDiscount) / 100,
      })),
    };
  }

  private patchDefaultLookups(): void {
    const lookups = this.lookups();
    if (!lookups) return;

    this.orderForm.patchValue({
      billToAddressId: this.orderForm.controls.billToAddressId.value ?? lookups.addresses[0]?.id ?? null,
      shipToAddressId: this.orderForm.controls.shipToAddressId.value ?? lookups.addresses[0]?.id ?? null,
      shipMethodId: this.orderForm.controls.shipMethodId.value ?? lookups.shipMethods[0]?.id ?? null,
    });

    for (const control of this.details.controls) {
      control.patchValue({
        productId: control.value.productId ?? lookups.products[0]?.id ?? null,
        specialOfferId: control.value.specialOfferId ?? lookups.specialOffers[0]?.id ?? 1,
      });
    }
  }

  private toDateInput(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().slice(0, 10);
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }
}
