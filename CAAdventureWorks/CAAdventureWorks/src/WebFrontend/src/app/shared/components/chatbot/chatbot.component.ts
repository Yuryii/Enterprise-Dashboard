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
import { ChatbotService, ChatMessage } from '../../../core/services/chatbot.service';

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

  isOpen = signal(false);
  isLoading = signal(false);
  isConnected = signal(false);
  isConnecting = signal(false);
  connectionError = signal<string | null>(null);

  currentDeptId = signal('sales');
  currentSessionId = signal('');

  currentDeptName = computed(() => {
    const deptNames: Record<string, string> = {
      sales: 'Phòng Kinh Doanh',
      production: 'Phòng Sản Xuất',
      purchasing: 'Phòng Mua Hàng',
      quality: 'Phòng QA',
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
      production: [],
      purchasing: [],
      quality: [],
    };
    return questions[this.currentDeptId()] || [];
  });

  messages = signal<ChatMessage[]>([]);
  inputValue = signal('');
  streamingContent = signal('');

  private shouldScrollToBottom = false;

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
