import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { ChatMessage, TypingNotification } from '../types';

const WS_URL = 'ws://localhost:8080/ws/chat';

class ChatWebSocketService {
  private client: Client | null = null;
  private subscriptions: StompSubscription[] = [];
  
  private callbacks = {
    onMessage: null as ((msg: ChatMessage) => void) | null,
    onTyping: null as ((notif: TypingNotification) => void) | null,
    onSent: null as ((data: any) => void) | null,
  };

  async connect(
    token: string,
    onMessage: (msg: ChatMessage) => void,
    onTyping: (notif: TypingNotification) => void,
    onSent: (data: any) => void
  ) {
    this.callbacks = { onMessage, onTyping, onSent };

    this.client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      console.log('WebSocket connected');
      
      this.subscriptions.push(
        this.client!.subscribe('/user/queue/messages', (msg: IMessage) => 
          onMessage(JSON.parse(msg.body)))
      );
      
      this.subscriptions.push(
        this.client!.subscribe('/user/queue/typing', (msg: IMessage) => 
          onTyping(JSON.parse(msg.body)))
      );
      
      this.subscriptions.push(
        this.client!.subscribe('/user/queue/sent', (msg: IMessage) => 
          onSent(JSON.parse(msg.body)))
      );
    };

    this.client.activate();
  }

  sendMessage(receiver: string, content: string) {
    this.client?.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ receiverUsername: receiver, content, type: 'CHAT' }),
    });
  }

  sendTyping(receiver: string, typing: boolean) {
    this.client?.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({ receiverUsername: receiver, typing }),
    });
  }

  disconnect() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    this.client?.deactivate();
  }
}

export default new ChatWebSocketService();