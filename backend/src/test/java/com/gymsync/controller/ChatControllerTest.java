package com.gymsync.controller;

import com.gymsync.model.ChatMessage;
import com.gymsync.model.MessageType;
import com.gymsync.model.User;
import com.gymsync.service.ChatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessageSendingOperations;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock
    private SimpMessageSendingOperations messagingTemplate;

    @Mock
    private ChatService chatService;

    private Principal principal;

    @InjectMocks
    private ChatController chatController;

    private User sender;
    private User receiver;
    private ChatMessage message;

    @BeforeEach
    void setUp() {
        principal = new Principal() {
            @Override
            public String getName() {
                return "sender";
            }
        };
        sender = new User();
        sender.setId(1L);
        sender.setUsername("sender");
        sender.setName("Sender User");

        receiver = new User();
        receiver.setId(2L);
        receiver.setUsername("receiver");
        receiver.setName("Receiver User");

        message = new ChatMessage();
        message.setId(1L);
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent("Hello!");
        message.setTimestamp(LocalDateTime.now());
    }

    @Test
    void sendMessage_ShouldCallServiceAndNotify() {
        // Given
        when(chatService.sendMessage("sender", "receiver", "Hello!", MessageType.CHAT)).thenReturn(message);

        ChatController.ChatMessageRequest request = new ChatController.ChatMessageRequest();
        request.setReceiverUsername("receiver");
        request.setContent("Hello!");
        request.setType(MessageType.CHAT);

        // When
        chatController.sendMessage(request, principal);

        // Then
        verify(chatService).sendMessage("sender", "receiver", "Hello!", MessageType.CHAT);
        verify(messagingTemplate).convertAndSendToUser(eq("receiver"), eq("/queue/messages"), any());
    }

    @Test
    void sendTypingNotification_ShouldSendNotification() {
        // Given
        ChatController.TypingRequest request = new ChatController.TypingRequest();
        request.setReceiverUsername("receiver");
        request.setTyping(true);

        // When
        chatController.sendTypingNotification(request, principal);

        // Then
        verify(messagingTemplate).convertAndSendToUser(
                eq("receiver"), eq("/queue/typing"), any()
        );
    }

    @Test
    void getChatHistory_ShouldDelegateToService() {
        // Given
        when(chatService.getConversation("sender", "receiver"))
                .thenReturn(java.util.List.of(new ChatController.ChatMessageResponse(message)));

        // When
        var result = chatController.getChatHistory("receiver", principal);

        // Then
        verify(chatService).getConversation("sender", "receiver");
        assert result != null;
        assert result.size() == 1;
    }

    @Test
    void markAsRead_ShouldCallService() {
        // When
        chatController.markAsRead(1L, principal);

        // Then
        verify(chatService).markAsRead(1L, "sender");
    }

    @Test
    void getUnreadCount_ShouldCallService() {
        // Given
        when(chatService.getUnreadCount("sender")).thenReturn(Map.of("count", 5L));

        // When
        var result = chatController.getUnreadCount(principal);

        // Then
        verify(chatService).getUnreadCount("sender");
        assert result.get("count").equals(5L);
    }

    @Test
    void getChatPartners_ShouldCallService() {
        // Given
        when(chatService.getChatPartners("sender")).thenReturn(java.util.List.of());

        // When
        chatController.getChatPartners(principal);

        // Then
        verify(chatService).getChatPartners("sender");
    }
}