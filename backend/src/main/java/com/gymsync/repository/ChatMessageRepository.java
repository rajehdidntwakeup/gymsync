package com.gymsync.repository;

import com.gymsync.model.ChatMessage;
import com.gymsync.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m WHERE " +
           "(m.sender = :user1 AND m.receiver = :user2) OR " +
           "(m.sender = :user2 AND m.receiver = :user1) " +
           "ORDER BY m.timestamp ASC")
    List<ChatMessage> findConversation(
        @Param("user1") User user1,
        @Param("user2") User user2
    );

    @Query("SELECT m FROM ChatMessage m WHERE m.receiver = :user AND m.read = false")
    List<ChatMessage> findUnreadMessages(@Param("user") User user);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.receiver = :user AND m.read = false")
    long countUnreadMessages(@Param("user") User user);

    @Query("SELECT DISTINCT u FROM User u WHERE u IN (SELECT m.receiver FROM ChatMessage m WHERE m.sender = :user) OR u IN (SELECT m.sender FROM ChatMessage m WHERE m.receiver = :user)")
    List<User> findChatPartners(@Param("user") User user);
}