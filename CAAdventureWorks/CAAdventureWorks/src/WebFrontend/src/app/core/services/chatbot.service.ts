import { Injectable, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Subject, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export interface ChatMessage {
  messageId: string;
  sessionId: string;
  role: 'System' | 'User' | 'Assistant' | 'Tool';
  content: string;
  createdAt: Date;
}

export interface ChatSession {
  sessionId: string;
  departmentId: string;
  title?: string;
  createdAt: Date;
  lastMessageAt?: Date;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private authService = inject(AuthService);
  private hub: HubConnection | null = null;

  private messageStream$ = new Subject<string>();
  private errorStream$ = new Subject<string>();
  private connectionState$ = new Subject<'connected' | 'disconnected' | 'error'>();
  private messageCompletedSubject$ = new Subject<void>();

  readonly tokens$ = this.messageStream$.asObservable();
  readonly errors$ = this.errorStream$.asObservable();
  readonly connectionStatus$ = this.connectionState$.asObservable();
  readonly messageCompleted$ = this.messageCompletedSubject$.asObservable();

  private async getAccessToken(): Promise<string> {
    try {
      return await firstValueFrom(this.authService.accessToken$);
    } catch {
      return '';
    }
  }

  async connect(deptId: string): Promise<void> {
    // Teardown any existing connection
    if (this.hub) {
      try { await this.hub.stop(); } catch { /* ignore */ }
      this.hub = null;
    }

    const apiUrl = this.getApiUrl();

    this.hub = new HubConnectionBuilder()
      .withUrl(`${apiUrl}/hubs/chatbot`, {
        accessTokenFactory: () => this.getAccessToken(),
      })
      .withAutomaticReconnect()
      .build();

    this.hub.on('ReceiveToken', (token: string) => {
      this.messageStream$.next(token);
    });

    this.hub.on('MessageStarted', (_messageId: string) => {
      // Stream started
    });

    this.hub.on('MessageCompleted', () => {
      this.messageCompletedSubject$.next();
    });

    this.hub.on('Error', (error: string) => {
      this.errorStream$.next(error);
    });

    this.hub.onreconnecting(() => {
      this.connectionState$.next('disconnected');
    });

    this.hub.onreconnected(() => {
      this.connectionState$.next('connected');
    });

    this.hub.onclose((err) => {
      this.connectionState$.next('disconnected');
      if (err) {
        this.errorStream$.next(`Mat ket noi: ${err.message}`);
      }
    });

    try {
      await this.hub.start();
      this.connectionState$.next('connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Khong the ket noi den may chu';
      this.errorStream$.next(`Loi ket noi: ${message}`);
      this.connectionState$.next('error');
      throw err;
    }
  }

  async createSession(deptId: string): Promise<ChatSession> {
    if (!this.hub || this.hub.state !== HubConnectionState.Connected) {
      throw new Error('Hub not connected');
    }
    return await this.hub.invoke<ChatSession>('CreateSession', deptId);
  }

  async sendMessage(deptId: string, sessionId: string, content: string): Promise<void> {
    if (!this.hub || this.hub.state !== HubConnectionState.Connected) {
      throw new Error('Hub not connected');
    }
    await this.hub.invoke('SendMessage', deptId, sessionId, content);
  }

  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    if (!this.hub || this.hub.state !== HubConnectionState.Connected || !sessionId) {
      return [];
    }
    const messages = await this.hub.invoke<any[]>('GetHistory', sessionId);
    return messages.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt) }));
  }

  async getSessions(deptId: string): Promise<ChatSession[]> {
    if (!this.hub || this.hub.state !== HubConnectionState.Connected) {
      return [];
    }
    const sessions = await this.hub.invoke<any[]>('GetSessions', deptId);
    return sessions.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      lastMessageAt: s.lastMessageAt ? new Date(s.lastMessageAt) : undefined,
    }));
  }

  async disconnect(): Promise<void> {
    if (this.hub) {
      try { await this.hub.stop(); } catch { /* ignore */ }
      this.hub = null;
      this.connectionState$.next('disconnected');
    }
  }

  get isConnected(): boolean {
    return this.hub?.state === HubConnectionState.Connected;
  }

  private getApiUrl(): string {
    const env = (window as any).__env__;
    if (env?.API_URL) return env.API_URL;
    return 'http://localhost:5001';
  }
}
