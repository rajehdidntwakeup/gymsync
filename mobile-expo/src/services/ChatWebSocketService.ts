import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WS_URL = 'http://localhost:8080/ws/chat';

export interface ChatMessage {
  id?: number;
  senderUsername: string;
  receiverUsername: string;
  content: string;
  timestamp?: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE' | 'TYPING';
  read?: boolean;
}

export interface TypingNotification {
  username: string;
  typing: boolean;
}

class ChatWebSocketService {
  private client: Client | null = null;
  private messageSubscription: StompSubscription | null = null;
  private typingSubscription: StompSubscription | null = null;
  private sentSubscription: StompSubscription | null = null;
  
  private onMessageCallback: ((message: ChatMessage) => void) | null = null;
  private onTypingCallback: ((notification: TypingNotification) => void) | null = null;
  private onSentCallback: ((data: { messageId: number; status: string }) => void) | null = null;

  async connect(
    onMessage: (message: ChatMessage) => void,
    onTyping: (notification: TypingNotification) => void,
    onSent: (data: { messageId: number; status: string }) => void
  ) {
    this.onMessageCallback = onMessage;
    this.onTypingCallback = onTyping;
    this.onSentCallback = onSent;

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token');
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        console.log('STOMP:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      console.log('WebSocket connected');
      
      // Subscribe to personal message queue
      this.messageSubscription = this.client!.subscribe(
        '/user/queue/messages',
        (message: IMessage) => {
          if (this.onMessageCallback) {
            const body = JSON.parse(message.body);
            this.onMessageCallback(body);
          }
        }
      );

      // Subscribe to typing notifications
      this.typingSubscription = this.client!.subscribe(
        '/user/queue/typing',
        (message: IMessage) => {
          if (this.onTypingCallback) {
            const body = JSON.parse(message.body);
            this.onTypingCallback(body);
          }
        }
      );

      // Subscribe to sent confirmation
      this.sentSubscription = this.client!.subscribe(
        '/user/queue/sent',
        (message: IMessage) => {
          if (this.onSentCallback) {
            const body = JSON.parse(message.body);
            this.onSentCallback(body);
          }
        }
      );
    };

    this.client.onStompError = (frame) => {
      console.error('STOMP error:', frame.headers['message']);
    };

    this.client.activate();
  }

  sendMessage(receiverUsername: string, content: string, type: ChatMessage['type'] = 'CHAT') {
    if (!this.client || !this.client.connected) {
      console.error('WebSocket not connected');
      return;
    }

    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({
        receiverUsername,
        content,
        type,
      }),
    });
  }

  sendTypingNotification(receiverUsername: string, typing: boolean) {
    if (!this.client || !this.client.connected) {
      return;
    }

    this.client.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({
        receiverUsername,
        typing,
      }),
    });
  }

  disconnect() {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
      this.messageSubscription = null;
    }
    if (this.typingSubscription) {
      this.typingSubscription.unsubscribe();
      this.typingSubscription = null;
    }
    if (this.sentSubscription) {
      this.sentSubscription.unsubscribe();
      this.sentSubscription = null;
    }

    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }

    this.onMessageCallback = null;
    this.onTypingCallback = null;
    this.onSentCallback = null;
  }

  isConnected(): boolean {
    return this.client?.connected || false;
  }
}

export default new ChatWebSocketService();