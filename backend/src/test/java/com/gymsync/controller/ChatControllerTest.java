package com.gymsync.controller;

import com.gymsync.model.ChatMessage;
import com.gymsync.model.MessageType;
import com.gymsync.model.User;
import com.gymsync.repository.ChatMessageRepository;
import com.gymsync.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessageSendingOperations;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock
    private SimpMessageSendingOperations messagingTemplate;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private UserRepository userRepository;

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

        chatController = new ChatController(messagingTemplate, chatMessageRepository, userRepository);
    }

    @Test
    void sendMessage_ShouldSaveAndSendMessage() {
        // Given
        when(userRepository.findByUsername("sender")).thenReturn(Optional.of(sender));
        when(userRepository.findByUsername("receiver")).thenReturn(Optional.of(receiver));
        when(chatMessageRepository.save(any())).thenReturn(message);

        ChatController.ChatMessageRequest request = new ChatController.ChatMessageRequest();
        request.setReceiverUsername("receiver");
        request.setContent("Hello!");
        request.setType(MessageType.CHAT);

        // When
        chatController.sendMessage(request, principal);

        // Then
        verify(chatMessageRepository).save(any(ChatMessage.class));
        verify(messagingTemplate).convertAndSendToUser(eq("receiver"), eq("/queue/messages"), any());
    }

    @Test
    void sendMessage_WhenSenderNotFound_ShouldThrowException() {
        // Given
        Principal unknownPrincipal = () -> "unknown";
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        ChatController.ChatMessageRequest request = new ChatController.ChatMessageRequest();
        request.setReceiverUsername("receiver");
        request.setContent("Hello!");

        // When & Then
        assertThatThrownBy(() -> chatController.sendMessage(request, unknownPrincipal))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Sender not found");
    }

    @Test
    void sendTypingNotification_ShouldSendNotification() {
        // Given
        when(userRepository.findByUsername("sender")).thenReturn(Optional.of(sender));

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
    void getChatHistory_ShouldReturnMessages() {
        // Given
        when(userRepository.findByUsername("sender")).thenReturn(Optional.of(sender));
        when(userRepository.findByUsername("receiver")).thenReturn(Optional.of(receiver));
        when(chatMessageRepository.findConversation(sender, receiver))
                .thenReturn(Arrays.asList(message));

        // When
        var result = chatController.getChatHistory("receiver", principal);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
    }
}