import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
  AfterViewChecked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ChatbotService, ChatMessage } from '../../../core/services/chatbot.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.scss',
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  @ViewChild('inputField') private inputField!: ElementRef;

  private chatbotService = inject(ChatbotService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private authService = inject(AuthService);

  isOpen = signal(false);
  isLoading = signal(false);
  isConnected = signal(false);
  isConnecting = signal(false);
  connectionError = signal<string | null>(null);

  currentDeptId = signal<string>('sales');
  currentSessionId = signal('');

  private readonly routeToDeptId: Record<string, string> = {
    'sales': 'sales',
    'production': 'production',
    'production-control': 'productioncontrol',
    'marketing': 'marketing',
    'purchasing': 'purchasing',
    'human-resources': 'humanresources',
    'finance': 'finance',
    'quality-assurance': 'qualityassurance',
    'document-control': 'documentcontrol',
    'engineering': 'engineering',
    'tool-design': 'tooldesign',
    'shipping-receiving': 'shippingreceiving',
    'information-services': 'informationservices',
    'facilities': 'facilities',
    'executive': 'sales',
  };

  private readonly roleToDeptId: Record<string, string> = {
    'Sales': 'sales',
    'Production': 'production',
    'Production-Control': 'productioncontrol',
    'Marketing': 'marketing',
    'Purchasing': 'purchasing',
    'HumanResources': 'humanresources',
    'Finance': 'finance',
    'Quality-Assurance': 'qualityassurance',
    'Document-Control': 'documentcontrol',
    'Engineering': 'engineering',
    'Tool-Design': 'tooldesign',
    'Shipping-and-Receiving': 'shippingreceiving',
    'Information-Services': 'informationservices',
    'Facilities-And-Maintenance': 'facilities',
  };

  currentDeptName = computed(() => {
    const deptNames: Record<string, string> = {
      sales: 'Phòng Kinh Doanh',
      production: 'Phòng Sản Xuất',
      productioncontrol: 'Phòng Kiểm Soát Sản Xuất',
      marketing: 'Phòng Marketing',
      purchasing: 'Phòng Mua Hàng',
      humanresources: 'Phòng Nhân Sự',
      finance: 'Phòng Tài Chính',
      qualityassurance: 'Phòng QA',
      documentcontrol: 'Phòng Kiểm Soát Tài Liệu',
      engineering: 'Phòng Kỹ Thuật',
      tooldesign: 'Phòng Thiết Kế Dụng Cụ',
      shippingreceiving: 'Phòng Vận Chuyển & Nhận Hàng',
      informationservices: 'Phòng Dịch Vụ Thông Tin',
      facilities: 'Phòng Cơ Sở Vật Chất',
    };
    return deptNames[this.currentDeptId()] || 'Chatbot';
  });

  suggestedQuestions = computed(() => {
    const questions: Record<string, { text: string; icon: string }[]> = {
      sales: [
        { text: 'Doanh thu tháng này?', icon: 'chart' },
        { text: 'Top 5 sản phẩm bán chạy?', icon: 'star' },
        { text: 'Đơn hàng gần đây?', icon: 'cart' },
        { text: 'Khách hàng tiềm năng?', icon: 'users' },
      ],
      production: [
        { text: 'Tồn kho sản phẩm?', icon: 'box' },
        { text: 'Work orders đang chờ?', icon: 'list' },
        { text: 'Công suất sản xuất?', icon: 'chart' },
      ],
      productioncontrol: [
        { text: 'Work orders đang xử lý?', icon: 'list' },
        { text: 'Tiến độ sản xuất?', icon: 'chart' },
        { text: 'Scrap rate gần đây?', icon: 'warning' },
      ],
      marketing: [
        { text: 'Xu hướng doanh thu?', icon: 'chart' },
        { text: 'Top sản phẩm bán chạy?', icon: 'star' },
        { text: 'Khách hàng theo vùng?', icon: 'map' },
      ],
      purchasing: [
        { text: 'Vendor hàng đầu?', icon: 'star' },
        { text: 'PO gần đây?', icon: 'cart' },
        { text: 'Chi phí mua hàng?', icon: 'chart' },
      ],
      humanresources: [
        { text: 'Nhân viên theo phòng ban?', icon: 'users' },
        { text: 'Các ca làm việc?', icon: 'clock' },
        { text: 'Ứng viên gần đây?', icon: 'person' },
      ],
      finance: [
        { text: 'Doanh thu theo tháng?', icon: 'chart' },
        { text: 'Chi phí mua hàng?', icon: 'cart' },
        { text: 'Tổng kết tài chính?', icon: 'briefcase' },
      ],
      qualityassurance: [
        { text: 'Scrap reason phổ biến?', icon: 'warning' },
        { text: 'Work orders có lỗi?', icon: 'bug' },
        { text: 'Tỷ lệ lỗi theo sản phẩm?', icon: 'chart' },
      ],
      documentcontrol: [
        { text: 'Tài liệu theo sản phẩm?', icon: 'folder' },
        { text: 'Danh sách tài liệu?', icon: 'list' },
      ],
      engineering: [
        { text: 'Bill of Materials?', icon: 'list' },
        { text: 'Sản phẩm theo danh mục?', icon: 'grid' },
      ],
      tooldesign: [
        { text: 'Bill of Materials?', icon: 'list' },
        { text: 'Sản phẩm và cấu trúc?', icon: 'grid' },
      ],
      shippingreceiving: [
        { text: 'Đơn hàng cần ship?', icon: 'truck' },
        { text: 'PO chưa nhận?', icon: 'download' },
        { text: 'Ship method phổ biến?', icon: 'map' },
      ],
      informationservices: [
        { text: 'Nhân sự theo vùng?', icon: 'map' },
        { text: 'Sản phẩm theo danh mục?', icon: 'grid' },
      ],
      facilities: [
        { text: 'Location và tồn kho?', icon: 'map' },
        { text: 'Vendor cung cấp?', icon: 'star' },
      ],
    };
    return questions[this.currentDeptId()] || [];
  });

  messages = signal<ChatMessage[]>([]);
  inputValue = signal('');
  streamingContent = signal('');

  private shouldScrollToBottom = false;
  private currentRoute = '';

  ngOnInit(): void {
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
        this.isLoading.set(false);
        this.addMessage({
          messageId: crypto.randomUUID(),
          sessionId: '',
          role: 'Assistant',
          content: `Lỗi: ${error}`,
          createdAt: new Date(),
        });
      });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        if (event.url !== this.currentRoute) {
          this.currentRoute = event.url;
          this.updateDeptIdFromRoute(event.url);
        }
      });

    this.updateDeptIdFromRoute(this.router.url);
  }

  private async updateDeptIdFromRoute(url: string): Promise<void> {
    const segment = url.split('/').filter(Boolean).pop() || '';
    const deptId = this.routeToDeptId[segment];

    if (deptId) {
      this.currentDeptId.set(deptId);
    } else {
      const roles = await this.authService.getRoles();
      for (const role of roles) {
        const mapped = this.roleToDeptId[role];
        if (mapped) {
          this.currentDeptId.set(mapped);
          break;
        }
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  toggleChat(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.initChat();
    }
  }

  private async initChat(): Promise<void> {
    if (this.isConnecting() || this.isConnected()) return;

    this.isConnecting.set(true);
    this.connectionError.set(null);

    try {
      await this.chatbotService.connect(this.currentDeptId());
      const session = await this.chatbotService.createSession(this.currentDeptId());
      this.currentSessionId.set(session.sessionId);

      if (session.sessionId) {
        const history = await this.chatbotService.getHistory(session.sessionId);
        if (history.length > 0) {
          this.messages.set(history);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      this.connectionError.set(message);
      console.error('Failed to connect chatbot:', err);
    } finally {
      this.isConnecting.set(false);
    }
  }

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.inputValue.set(target.value);
  }

  async sendMessage(): Promise<void> {
    const content = this.inputValue().trim();
    if (!content || this.isLoading() || !this.isConnected()) return;

    this.inputValue.set('');
    this.isLoading.set(true);

    this.addMessage({
      messageId: crypto.randomUUID(),
      sessionId: this.currentSessionId(),
      role: 'User',
      content,
      createdAt: new Date(),
    });

    this.streamingContent.set('');

    try {
      await this.chatbotService.sendMessage(
        this.currentDeptId(),
        this.currentSessionId(),
        content,
      );
    } catch (err) {
      this.isLoading.set(false);
      this.addMessage({
        messageId: crypto.randomUUID(),
        sessionId: this.currentSessionId(),
        role: 'Assistant',
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
        createdAt: new Date(),
      });
    }
  }

  onTokenComplete(): void {
    if (this.streamingContent()) {
      this.addMessage({
        messageId: crypto.randomUUID(),
        sessionId: this.currentSessionId(),
        role: 'Assistant',
        content: this.streamingContent(),
        createdAt: new Date(),
      });
      this.streamingContent.set('');
    }
    this.isLoading.set(false);
    this.shouldScrollToBottom = true;
  }

  suggestedQuestionClick(question: string): void {
    this.inputValue.set(question);
    this.sendMessage();
  }

  clearChat(): void {
    this.messages.set([]);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private addMessage(msg: ChatMessage): void {
    this.messages.update((msgs) => [...msgs, msg]);
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

  isUserMessage(role: string): boolean {
    return role === 'User';
  }

  isAssistantMessage(role: string): boolean {
    return role === 'Assistant';
  }

  isSystemMessage(role: string): boolean {
    return role === 'System';
  }

  retryConnection(): void {
    this.connectionError.set(null);
    this.initChat();
  }
}
