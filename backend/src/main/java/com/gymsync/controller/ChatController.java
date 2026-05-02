package com.gymsync.controller;

import com.gymsync.model.ChatMessage;
import com.gymsync.model.MessageType;
import com.gymsync.service.ChatService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final SimpMessageSendingOperations messagingTemplate;
    private final ChatService chatService;

    public ChatController(SimpMessageSendingOperations messagingTemplate,
                         ChatService chatService) {
        this.messagingTemplate = messagingTemplate;
        this.chatService = chatService;
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageRequest request, Principal principal) {
        ChatMessage saved = chatService.sendMessage(
                principal.getName(),
                request.getReceiverUsername(),
                request.getContent(),
                request.getType()
        );

        // Send to receiver
        messagingTemplate.convertAndSendToUser(
                saved.getReceiver().getUsername(),
                "/queue/messages",
                new ChatMessageResponse(saved)
        );

        // Send confirmation to sender
        messagingTemplate.convertAndSendToUser(
                saved.getSender().getUsername(),
                "/queue/sent",
                Map.of("messageId", saved.getId(), "status", "delivered")
        );
    }

    @MessageMapping("/chat.typing")
    public void sendTypingNotification(@Payload TypingRequest request, Principal principal) {
        messagingTemplate.convertAndSendToUser(
                request.getReceiverUsername(),
                "/queue/typing",
                Map.of("username", principal.getName(), "typing", request.isTyping())
        );
    }

    @GetMapping("/history/{partnerUsername}")
    public List<ChatMessageResponse> getChatHistory(@PathVariable String partnerUsername, Principal principal) {
        return chatService.getConversation(principal.getName(), partnerUsername);
    }

    @GetMapping("/unread")
    public Map<String, Long> getUnreadCount(Principal principal) {
        return chatService.getUnreadCount(principal.getName());
    }

    @PutMapping("/messages/{messageId}/read")
    public void markAsRead(@PathVariable Long messageId, Principal principal) {
        chatService.markAsRead(messageId, principal.getName());
    }

    @PostMapping("/send")
    public void sendMessageRest(@RequestBody ChatMessageRequest request, Principal principal) {
        sendMessage(request, principal);
    }

    @PostMapping("/typing")
    public void sendTypingNotificationRest(@RequestBody TypingRequest request, Principal principal) {
        sendTypingNotification(request, principal);
    }

    @GetMapping("/partners")
    public List<Map<String, Object>> getChatPartners(Principal principal) {
        return chatService.getChatPartners(principal.getName());
    }

    // DTO classes
    public static class ChatMessageRequest {
        private String receiverUsername;
        private String content;
        private MessageType type;

        public String getReceiverUsername() { return receiverUsername; }
        public void setReceiverUsername(String receiverUsername) { this.receiverUsername = receiverUsername; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public MessageType getType() { return type; }
        public void setType(MessageType type) { this.type = type; }
    }

    public static class TypingRequest {
        private String receiverUsername;
        private boolean typing;

        public String getReceiverUsername() { return receiverUsername; }
        public void setReceiverUsername(String receiverUsername) { this.receiverUsername = receiverUsername; }
        public boolean isTyping() { return typing; }
        public void setTyping(boolean typing) { this.typing = typing; }
    }

    public static class ChatMessageResponse {
        private Long id;
        private String senderUsername;
        private String receiverUsername;
        private String content;
        private String timestamp;
        private boolean read;
        private String type;

        public ChatMessageResponse(ChatMessage message) {
            this.id = message.getId();
            this.senderUsername = message.getSender().getUsername();
            this.receiverUsername = message.getReceiver().getUsername();
            this.content = message.getContent();
            this.timestamp = message.getTimestamp().toString();
            this.read = message.isRead();
            this.type = message.getType().name();
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getSenderUsername() { return senderUsername; }
        public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
        public String getReceiverUsername() { return receiverUsername; }
        public void setReceiverUsername(String receiverUsername) { this.receiverUsername = receiverUsername; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
        public boolean isRead() { return read; }
        public void setRead(boolean read) { this.read = read; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
    }
}