package com.gymsync.controller;

import com.gymsync.model.ChatMessage;
import com.gymsync.model.User;
import com.gymsync.repository.ChatMessageRepository;
import com.gymsync.repository.UserRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@Controller
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    public ChatController(SimpMessagingTemplate messagingTemplate,
                         ChatMessageRepository chatMessageRepository,
                         UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageRequest request, Principal principal) {
        String senderUsername = principal.getName();

        User sender = userRepository.findByUsername(senderUsername)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        User receiver = userRepository.findByUsername(request.getReceiverUsername())
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        ChatMessage message = new ChatMessage();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(request.getContent());
        message.setType(request.getType() != null ? request.getType() : com.gymsync.model.MessageType.CHAT);

        ChatMessage saved = chatMessageRepository.save(message);

        // Send to receiver
        messagingTemplate.convertAndSendToUser(
                receiver.getUsername(),
                "/queue/messages",
                new ChatMessageResponse(saved)
        );

        // Send confirmation to sender
        messagingTemplate.convertAndSendToUser(
                sender.getUsername(),
                "/queue/sent",
                Map.of("messageId", saved.getId(), "status", "delivered")
        );
    }

    @MessageMapping("/chat.typing")
    public void sendTypingNotification(@Payload TypingRequest request, Principal principal) {
        User sender = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        messagingTemplate.convertAndSendToUser(
                request.getReceiverUsername(),
                "/queue/typing",
                Map.of("username", sender.getUsername(), "typing", request.isTyping())
        );
    }

    @GetMapping("/history/{partnerUsername}")
    public List<ChatMessageResponse> getChatHistory(@PathVariable String partnerUsername, Principal principal) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        User partner = userRepository.findByUsername(partnerUsername)
                .orElseThrow(() -> new RuntimeException("Partner not found"));

        return chatMessageRepository.findConversation(user, partner)
                .stream()
                .map(ChatMessageResponse::new)
                .toList();
    }

    @GetMapping("/unread")
    public Map<String, Long> getUnreadCount(Principal principal) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return Map.of("count", chatMessageRepository.countUnreadMessages(user));
    }

    @GetMapping("/partners")
    public List<Map<String, Object>> getChatPartners(Principal principal) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return chatMessageRepository.findChatPartners(user)
                .stream()
                .map(partner -> Map.<String, Object>of(
                        "id", partner.getId(),
                        "username", partner.getUsername(),
                        "name", partner.getName(),
                        "fitnessLevel", partner.getFitnessLevel()
                ))
                .toList();
    }

    // DTO classes
    public static class ChatMessageRequest {
        private String receiverUsername;
        private String content;
        private ChatMessage.MessageType type;

        public String getReceiverUsername() { return receiverUsername; }
        public void setReceiverUsername(String receiverUsername) { this.receiverUsername = receiverUsername; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public ChatMessage.MessageType getType() { return type; }
        public void setType(ChatMessage.MessageType type) { this.type = type; }
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