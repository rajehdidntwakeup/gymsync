package com.gymsync.service;

import com.gymsync.controller.ChatController.ChatMessageResponse;
import com.gymsync.dto.ChatPartnerResponse;
import com.gymsync.exception.ForbiddenException;
import com.gymsync.exception.ResourceNotFoundException;
import com.gymsync.model.ChatMessage;
import com.gymsync.model.MessageType;
import com.gymsync.model.User;
import com.gymsync.repository.ChatMessageRepository;
import com.gymsync.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    public ChatService(ChatMessageRepository chatMessageRepository,
                       UserRepository userRepository) {
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
    }

    public List<ChatMessageResponse> getConversation(String username, String partnerUsername) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User partner = userRepository.findByUsername(partnerUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Partner not found"));

        return chatMessageRepository.findConversation(user, partner)
                .stream()
                .map(ChatMessageResponse::new)
                .toList();
    }

    @Transactional
    public ChatMessage sendMessage(String senderUsername, String receiverUsername, String content, MessageType type) {
        User sender = userRepository.findByUsername(senderUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Sender not found"));

        User receiver = userRepository.findByUsername(receiverUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Receiver not found"));

        ChatMessage message = new ChatMessage();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(content);
        message.setType(type != null ? type : MessageType.CHAT);

        return chatMessageRepository.save(message);
    }

    @Transactional
    public void markAsRead(Long messageId, String username) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!message.getReceiver().getId().equals(user.getId())) {
            throw new ForbiddenException("You can only mark messages addressed to you as read");
        }

        message.setRead(true);
        chatMessageRepository.save(message);
    }

    public Map<String, Long> getUnreadCount(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return Map.of("count", chatMessageRepository.countUnreadMessages(user));
    }

    public List<ChatPartnerResponse> getChatPartners(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return chatMessageRepository.findChatPartners(user)
                .stream()
                .map(ChatPartnerResponse::from)
                .toList();
    }
}
