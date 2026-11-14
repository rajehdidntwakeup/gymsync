package com.gymsync.dto;

import com.gymsync.model.User;

public class ChatPartnerResponse {
    private Long id;
    private String username;
    private String name;
    private String fitnessLevel;
    private String lastMessage;
    private java.time.LocalDateTime lastMessageAt;
    private long unreadCount;

    public static ChatPartnerResponse from(User partner) {
        ChatPartnerResponse response = new ChatPartnerResponse();
        response.id = partner.getId();
        response.username = partner.getUsername();
        response.name = partner.getName();
        response.fitnessLevel = partner.getFitnessLevel() == null ? null : partner.getFitnessLevel().name();
        return response;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getFitnessLevel() { return fitnessLevel; }
    public void setFitnessLevel(String fitnessLevel) { this.fitnessLevel = fitnessLevel; }
    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }
    public java.time.LocalDateTime getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(java.time.LocalDateTime lastMessageAt) { this.lastMessageAt = lastMessageAt; }
    public long getUnreadCount() { return unreadCount; }
    public void setUnreadCount(long unreadCount) { this.unreadCount = unreadCount; }
}