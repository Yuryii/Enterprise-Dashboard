import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewChild,
  AfterViewChecked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChartData, ChartOptions } from 'chart.js';
import { getStyle } from '@coreui/utils';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  FormControlDirective,
  FormSelectDirective,
  ModalModule,
  RowComponent,
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';
import {
  Gridster as GridsterComponent,
  GridsterItem as GridsterItemComponent,
} from 'angular-gridster2';
import type { GridsterConfig, GridsterItemConfig } from 'angular-gridster2';
import { AiChartService, SavedChartDto } from './ai-chart.service';
import {
  ChatbotService,
  ChatMessage,
} from '../../../core/services/chatbot.service';

export interface ChartDef {
  id: string;
  label: string;
}

export interface ChartSlot {
  id: string;
  name: string;
  type: string;
  spec: ChartData | null;
  options: ChartOptions | null;
}

@Component({
  selector: 'app-ai-chart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FormControlDirective,
    ButtonDirective,
    ChartjsComponent,
    IconDirective,
    DatePipe,
    GridsterComponent,
    GridsterItemComponent,
    ModalModule,
  ],
  templateUrl: './ai-chart.component.html',
  styleUrl: './ai-chart.component.scss',
})
export class AiChartComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  private readonly aiChartService = inject(AiChartService);
  private readonly chatbotService = inject(ChatbotService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  private readonly primaryColor = getStyle('--cui-primary');
  private readonly infoColor = getStyle('--cui-info');
  private readonly successColor = getStyle('--cui-success');
  private readonly warningColor = getStyle('--cui-warning');

  readonly title = 'AI Chart';
  readonly subtitle = 'Dashboard biểu đồ AI - Phòng Kinh Doanh';

  readonly currentDeptId = 'sales';

  // Connection state
  readonly isGenerating = signal(false);
  readonly isConnected = signal(false);
  readonly isConnecting = signal(false);
  readonly connectionError = signal<string | null>(null);
  readonly chatModalVisible = signal(false);

  // Messages
  readonly messages = signal<ChatMessage[]>([]);
  readonly streamingContent = signal('');

  // Saved charts
  readonly savedCharts = signal<SavedChartDto[]>([]);

  // Edit mode & layout
  readonly isEditMode = signal(false);
  readonly showChartPicker = signal(false);

  readonly gridsterStorageKey = 'ai_chart_grid_layout';
  readonly hiddenChartsStorageKey = 'ai_chart_hidden_charts';

  readonly gridsterOptions = signal<GridsterConfig>({
    draggable: { enabled: false },
    resizable: { enabled: false },
    pushItems: true,
    minCols: 48,
    maxCols: 48,
    minRows: 16,
    fixedRowHeight: 150,
    keepFixedHeightInMobile: false,
    keepFixedWidthInMobile: false,
    mobileBreakpoint: 640,
    itemChangeCallback: () => this.saveLayoutToStorage(),
  });

  readonly gridsterItems = signal<GridsterItemConfig[]>(
    this.loadLayoutFromStorage() ?? this.getDefaultLayout(),
  );

  readonly availableCharts: ChartDef[] = [
    { id: 'chat', label: 'Chat với AI' },
    { id: 'chart-1', label: 'Biểu đồ #1' },
    { id: 'chart-2', label: 'Biểu đồ #2' },
    { id: 'chart-3', label: 'Biểu đồ #3' },
    { id: 'chart-4', label: 'Biểu đồ #4' },
  ];

  readonly hiddenChartIds = signal<Set<string>>(
    this.loadHiddenChartsFromStorage(),
  );

  // Chart slots (multiple charts)
  readonly chartSlots = signal<ChartSlot[]>([
    { id: 'chart-1', name: '', type: 'bar', spec: null, options: null },
    { id: 'chart-2', name: '', type: 'bar', spec: null, options: null },
    { id: 'chart-3', name: '', type: 'bar', spec: null, options: null },
    { id: 'chart-4', name: '', type: 'bar', spec: null, options: null },
  ]);

  readonly inputForm = this.fb.group({
    message: [''],
  });

  readonly suggestedPrompts = [
    'Vẽ biểu đồ doanh thu theo tháng',
    'Vẽ biểu đồ doanh thu theo vùng bán hàng',
    'Vẽ biểu đồ xu hướng tăng trưởng năm 2014',
    'Vẽ biểu đồ top 5 sản phẩm bán chạy',
    'Vẽ biểu đồ phân bố đơn hàng theo trạng thái',
    'Vẽ biểu đồ so sánh doanh thu giữa các quý',
  ];

  private shouldScrollToBottom = false;

  readonly chartTypeLabelMap: Record<string, string> = {
    bar: 'Biểu đồ cột',
    line: 'Biểu đồ đường',
    doughnut: 'Biểu đồ bánh',
    pie: 'Biểu đồ tròn',
    radar: 'Biểu đồ radar',
    polarArea: 'Biểu đồ polar',
    horizontalBar: 'Biểu đồ cột ngang',
  };

  ngOnInit(): void {
    this.connect().catch(() => {});
    this.loadSavedCharts();

    this.chatbotService.tokens$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((token) => {
        this.streamingContent.update((v) => v + token);
      });

    this.chatbotService.connectionStatus$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        this.isConnected.set(status === 'connected');
        if (status === 'connected') {
          this.isConnecting.set(false);
          this.connectionError.set(null);
        }
      });

    this.chatbotService.messageCompleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.onTokenComplete();
      });

    this.chatbotService.errors$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((error) => {
        this.isGenerating.set(false);
        this.addMessage({
          messageId: crypto.randomUUID(),
          sessionId: '',
          role: 'Assistant',
          content: `Lỗi: ${error}`,
          createdAt: new Date(),
        });
      });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  // ---- Connection ----

  async connect(): Promise<void> {
    if (this.isConnecting() || this.isConnected()) return;
    this.isConnecting.set(true);
    this.connectionError.set(null);
    try {
      await this.chatbotService.connect(this.currentDeptId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      this.connectionError.set(message);
    } finally {
      this.isConnecting.set(false);
    }
  }

  // ---- Chat ----

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.inputForm.patchValue({ message: target.value });
  }

  async generateChart(): Promise<void> {
    const message = this.inputForm.value.message?.trim() ?? '';
    if (!message || this.isGenerating() || !this.isConnected()) return;

    this.inputForm.patchValue({ message: '' });
    this.isGenerating.set(true);
    this.chatModalVisible.set(false);

    this.addMessage({
      messageId: crypto.randomUUID(),
      sessionId: '',
      role: 'User',
      content: message,
      createdAt: new Date(),
    });

    this.streamingContent.set('');

    try {
      await this.chatbotService.generateChart(this.currentDeptId, message);
    } catch {
      this.isGenerating.set(false);
      this.addMessage({
        messageId: crypto.randomUUID(),
        sessionId: '',
        role: 'Assistant',
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
        createdAt: new Date(),
      });
    }
  }

  onChartSpecGenerated(specJson: string): void {
    try {
      const spec = JSON.parse(specJson);

      if (!spec.type || !spec.data) {
        this.isGenerating.set(false);
        return;
      }

      // Find first empty slot
      const emptySlot = this.chartSlots().find((s) => !s.spec);
      if (!emptySlot) {
        // All slots full — clear the first one
        this.chartSlots.update((slots) => {
          const updated = [...slots];
          updated[0] = { ...updated[0], spec: null, options: null, name: '' };
          return updated;
        });
      }

      const targetSlotId = emptySlot?.id ?? 'chart-1';
      const chartData: ChartData = {
        labels: spec.data.labels ?? [],
        datasets: (spec.data.datasets ?? []).map((ds: any) => ({
          ...ds,
          backgroundColor: ds.backgroundColor ?? this.primaryColor,
          borderColor: ds.borderColor ?? this.primaryColor,
        })),
      };

      const chartOptions: ChartOptions =
        spec.options ?? this.getDefaultOptions(spec.type);

      this.chartSlots.update((slots) =>
        slots.map((s) =>
          s.id === targetSlotId
            ? {
                ...s,
                name: this.extractChartName(spec.name),
                type: spec.type,
                spec: chartData,
                options: chartOptions,
              }
            : s,
        ),
      );

      this.isGenerating.set(false);
    } catch {
      this.isGenerating.set(false);
    }
  }

  private extractChartName(name: string | undefined): string {
    if (name && name.trim()) return name.trim();
    return '';
  }

  private getDefaultOptions(chartType: string): any {
    if (chartType === 'pie' || chartType === 'doughnut') {
      return {
        responsive: true,
        maintainAspectRatio: false,
        cutout: chartType === 'doughnut' ? '60%' : undefined,
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: { usePointStyle: true, padding: 16 },
          },
        },
      };
    }

    if (chartType === 'bar' || chartType === 'line') {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: '#eeeeee' } },
        },
      };
    }

    return { responsive: true, maintainAspectRatio: false };
  }

  onTokenComplete(): void {
    const content = this.streamingContent();
    if (content) {
      this.addMessage({
        messageId: crypto.randomUUID(),
        sessionId: '',
        role: 'Assistant',
        content,
        createdAt: new Date(),
      });
      this.streamingContent.set('');

      // Parse chart JSON blocks from AI response
      this.parseChartSpecsFromContent(content);
    }
    this.isGenerating.set(false);
    this.shouldScrollToBottom = true;
  }

  private parseChartSpecsFromContent(content: string): void {
    // Match ```json ... ``` blocks
    const jsonBlockRegex = /```json\s*([\s\S]*?)```/g;
    let match;
    while ((match = jsonBlockRegex.exec(content)) !== null) {
      const jsonStr = match[1].trim();
      if (jsonStr) {
        this.onChartSpecGenerated(jsonStr);
      }
    }
    // Also try to parse a top-level chart object if no block found
    if (!jsonBlockRegex.test(content)) {
      try {
        const parsed = JSON.parse(content);
        if (parsed && parsed.type && parsed.data) {
          this.onChartSpecGenerated(content);
        }
      } catch {
        // Not a JSON object
      }
    }
  }

  suggestedPromptClick(prompt: string): void {
    this.inputForm.patchValue({ message: prompt });
    this.generateChart();
  }

  // ---- Chart Slots ----

  removeChartSlot(slotId: string): void {
    this.chartSlots.update((slots) =>
      slots.map((s) =>
        s.id === slotId ? { ...s, spec: null, options: null, name: '' } : s,
      ),
    );
  }

  exportChart(slot: ChartSlot): void {
    if (!slot.spec) return;
    const canvas = document.querySelector(
      `[data-slot-id="${slot.id}"] canvas`,
    ) as HTMLCanvasElement;
    if (!canvas) {
      // Fallback: find by slot id in a more general way
      const allCanvases = document.querySelectorAll(
        '.ai-chart-gridster canvas',
      );
      for (const c of allCanvases) {
        const parent = (c as HTMLElement).closest('c-card-body');
        if (parent) {
          const link = document.createElement('a');
          link.download = `chart-${slot.id}-${Date.now()}.png`;
          link.href = (c as HTMLCanvasElement).toDataURL('image/png');
          link.click();
          return;
        }
      }
      return;
    }
    const link = document.createElement('a');
    link.download = `chart-${slot.id}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  clearAllCharts(): void {
    if (!confirm('Xóa tất cả biểu đồ đang hiển thị?')) return;
    this.chartSlots.update((slots) =>
      slots.map((s) => ({ ...s, spec: null, options: null, name: '' })),
    );
  }

  getChartTypeLabel(type: string): string {
    return this.chartTypeLabelMap[type] ?? type;
  }

  // ---- Save / Load ----

  async saveChart(): Promise<void> {
    const hasAnyChart = this.chartSlots().some((s) => !!s.spec);
    if (!hasAnyChart) {
      alert('Không có biểu đồ nào để lưu.');
      return;
    }

    const slotsWithCharts = this.chartSlots().filter((s) => !!s.spec);
    if (slotsWithCharts.length === 1) {
      await this.saveSingleChart(slotsWithCharts[0]);
    } else {
      const chartName = prompt(
        `Có ${slotsWithCharts.length} biểu đồ. Nhập tên để lưu tất cả:`,
        `Dashboard AI - ${new Date().toLocaleDateString('vi-VN')}`,
      );
      if (!chartName) return;

      // Save all charts as combined JSON
      const specJson = JSON.stringify({
        slots: slotsWithCharts.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          spec: { labels: s.spec?.labels, datasets: s.spec?.datasets },
          options: s.options,
        })),
      });

      try {
        await this.aiChartService
          .saveChart({
            name: chartName,
            chartSpecJson: specJson,
            departmentId: this.currentDeptId,
          })
          .toPromise();
        alert('Đã lưu dashboard thành công!');
        this.loadSavedCharts();
      } catch {
        alert('Không thể lưu. Vui lòng thử lại.');
      }
    }
  }

  private async saveSingleChart(slot: ChartSlot): Promise<void> {
    const chartName = prompt('Nhập tên biểu đồ:', `Biểu đồ ${slot.id}`);
    if (!chartName) return;

    const specJson = JSON.stringify({
      type: slot.type,
      data: { labels: slot.spec?.labels, datasets: slot.spec?.datasets },
      options: slot.options,
    });

    try {
      await this.aiChartService
        .saveChart({
          name: chartName,
          chartSpecJson: specJson,
          departmentId: this.currentDeptId,
        })
        .toPromise();
      alert('Đã lưu biểu đồ!');
      this.loadSavedCharts();
    } catch {
      alert('Không thể lưu. Vui lòng thử lại.');
    }
  }

  loadSavedCharts(): void {
    this.aiChartService.getSavedCharts(this.currentDeptId).subscribe({
      next: (charts) => {
        this.savedCharts.set(charts);
      },
      error: () => {},
    });
  }

  loadSavedChartById(chartId: string): void {
    if (!chartId) return;
    const chart = this.savedCharts().find((c) => c.chartId === chartId);
    if (!chart) return;

    try {
      const spec = JSON.parse(chart.chartSpecJson);

      // Check if it's a multi-slot dashboard
      if (spec.slots && Array.isArray(spec.slots)) {
        this.chartSlots.update((slots) =>
          slots.map((s) => {
            const saved = spec.slots.find((sp: any) => sp.id === s.id);
            if (saved) {
              return {
                ...s,
                name: saved.name || '',
                type: saved.type || 'bar',
                spec: saved.spec as ChartData,
                options: saved.options as ChartOptions,
              };
            }
            return { ...s, spec: null, options: null, name: '' };
          }),
        );
      } else {
        // Single chart
        const emptySlot =
          this.chartSlots().find((s) => !s.spec) ?? this.chartSlots()[0];
        this.chartSlots.update((slots) =>
          slots.map((s) =>
            s.id === emptySlot.id
              ? {
                  ...s,
                  name: chart.name,
                  type: spec.type ?? 'bar',
                  spec: {
                    labels: spec.data?.labels ?? [],
                    datasets: (spec.data?.datasets ?? []).map((ds: any) => ({
                      ...ds,
                      backgroundColor: ds.backgroundColor ?? this.primaryColor,
                      borderColor: ds.borderColor ?? this.primaryColor,
                    })),
                  } as ChartData,
                  options:
                    spec.options ?? this.getDefaultOptions(spec.type ?? 'bar'),
                }
              : s,
          ),
        );
      }
    } catch {
      alert('Không thể tải biểu đồ này.');
    }
  }

  deleteChart(chart: SavedChartDto, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Xóa biểu đồ "${chart.name}"?`)) return;

    this.aiChartService.deleteChart(chart.chartId).subscribe({
      next: () => {
        this.loadSavedCharts();
      },
      error: () => alert('Không thể xóa biểu đồ.'),
    });
  }

  // ---- Gridster / Edit Mode ----

  toggleEditMode(): void {
    const newMode = !this.isEditMode();
    this.isEditMode.set(newMode);
    const config = this.gridsterOptions();
    config.draggable!.enabled = newMode;
    config.resizable!.enabled = newMode;
    this.gridsterOptions.set({ ...config });
    if (!newMode) {
      this.saveHiddenChartsToStorage();
    }
  }

  customizeLayout(): void {
    this.toggleEditMode();
  }

  openChatModal(): void {
    this.chatModalVisible.set(true);
  }

  resetLayout(): void {
    localStorage.removeItem(this.gridsterStorageKey);
    localStorage.removeItem(this.hiddenChartsStorageKey);
    this.gridsterItems.set(this.getDefaultLayout());
    this.hiddenChartIds.set(new Set());
  }

  private getDefaultLayout(): GridsterItemConfig[] {
    return [
      { id: 'chart-1', cols: 24, rows: 8, x: 0,  y: 0 },
      { id: 'chart-2', cols: 24, rows: 8, x: 24, y: 0 },
      { id: 'chart-3', cols: 24, rows: 8, x: 0,  y: 8 },
      { id: 'chart-4', cols: 24, rows: 8, x: 24, y: 8 },
    ];
  }

  getItem(id: string): GridsterItemConfig | undefined {
    return this.gridsterItems().find((item) => item['id'] === id);
  }

  isChartVisible(chartId: string): boolean {
    return !this.hiddenChartIds().has(chartId);
  }

  toggleChartVisibility(chartId: string): void {
    const hidden = new Set(this.hiddenChartIds());
    if (hidden.has(chartId)) {
      hidden.delete(chartId);
    } else {
      hidden.add(chartId);
    }
    this.hiddenChartIds.set(hidden);
  }

  removeChartFromGrid(chartId: string): void {
    this.toggleChartVisibility(chartId);
  }

  addChartToGrid(chartId: string): void {
    this.toggleChartVisibility(chartId);
  }

  toggleChartPicker(event?: Event): void {
    event?.stopPropagation();
    this.showChartPicker.update((v) => !v);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showChartPicker.set(false);
  }

  onPickerClick(event: Event): void {
    event.stopPropagation();
  }

  private saveLayoutToStorage(): void {
    const layout = this.gridsterItems().map((item) => ({
      id: item['id'],
      cols: item.cols,
      rows: item.rows,
      x: item.x,
      y: item.y,
    }));
    localStorage.setItem(this.gridsterStorageKey, JSON.stringify(layout));
  }

  private loadLayoutFromStorage(): GridsterItemConfig[] | null {
    const raw = localStorage.getItem(this.gridsterStorageKey);
    if (!raw) return null;
    try {
      const layout = JSON.parse(raw) as Array<{
        id: string;
        cols: number;
        rows: number;
        x: number;
        y: number;
      }>;
      const defaults = this.getDefaultLayout();
      return defaults.map((item) => {
        const saved = layout.find((l) => l.id === item['id']);
        return saved ? { ...item, ...saved } : item;
      });
    } catch {
      return null;
    }
  }

  private loadHiddenChartsFromStorage(): Set<string> {
    const raw = localStorage.getItem(this.hiddenChartsStorageKey);
    if (!raw) return new Set();
    try {
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch {
      return new Set();
    }
  }

  private saveHiddenChartsToStorage(): void {
    const arr = Array.from(this.hiddenChartIds());
    localStorage.setItem(this.hiddenChartsStorageKey, JSON.stringify(arr));
  }

  // ---- Utilities ----

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.generateChart();
    }
  }

  private addMessage(msg: ChatMessage): void {
    this.messages.update((msgs) => {
      const updated = [...msgs, msg];
      return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
    });
    this.shouldScrollToBottom = true;
  }

  private scrollToBottom(): void {
    if (this.messageContainer?.nativeElement) {
      const el = this.messageContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  trackByMessageId(_: number, msg: ChatMessage): string {
    return msg.messageId;
  }

  trackByChartId(_: number, chart: SavedChartDto): string {
    return chart.chartId;
  }

  formatMessage(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
}
