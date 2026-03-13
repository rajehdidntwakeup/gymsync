package com.gymsync.repository;

import com.gymsync.model.ChatMessage;
import com.gymsync.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
class ChatMessageRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Test
    void findConversation_ShouldReturnMessagesInOrder() {
        // Given
        User user1 = createUser("user1", "user1@test.com");
        User user2 = createUser("user2", "user2@test.com");

        entityManager.persist(user1);
        entityManager.persist(user2);

        ChatMessage msg1 = createMessage(user1, user2, "Hello");
        ChatMessage msg2 = createMessage(user2, user1, "Hi there");
        entityManager.persist(msg1);
        entityManager.persist(msg2);
        entityManager.flush();

        // When
        List<ChatMessage> conversation = chatMessageRepository.findConversation(user1, user2);

        // Then
        assertThat(conversation).hasSize(2);
        assertThat(conversation.get(0).getContent()).isEqualTo("Hello");
    }

    @Test
    void findUnreadMessages_ShouldReturnUnread() {
        // Given
        User sender = createUser("sender", "sender@test.com");
        User receiver = createUser("receiver", "receiver@test.com");
        entityManager.persist(sender);
        entityManager.persist(receiver);

        ChatMessage read = createMessage(sender, receiver, "Read message");
        read.setRead(true);
        ChatMessage unread = createMessage(sender, receiver, "Unread message");
        unread.setRead(false);
        entityManager.persist(read);
        entityManager.persist(unread);
        entityManager.flush();

        // When
        List<ChatMessage> unreadMessages = chatMessageRepository.findUnreadMessages(receiver);

        // Then
        assertThat(unreadMessages).hasSize(1);
        assertThat(unreadMessages.get(0).getContent()).isEqualTo("Unread message");
    }

    @Test
    void countUnreadMessages_ShouldReturnCount() {
        // Given
        User sender = createUser("sender", "sender@test.com");
        User receiver = createUser("receiver", "receiver@test.com");
        entityManager.persist(sender);
        entityManager.persist(receiver);

        entityManager.persist(createMessage(sender, receiver, "Msg 1"));
        entityManager.persist(createMessage(sender, receiver, "Msg 2"));
        entityManager.flush();

        // When
        long count = chatMessageRepository.countUnreadMessages(receiver);

        // Then
        assertThat(count).isEqualTo(2);
    }

    private User createUser(String username, String email) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setName("Test User");
        user.setPassword("password");
        return user;
    }

    private ChatMessage createMessage(User sender, User receiver, String content) {
        ChatMessage msg = new ChatMessage();
        msg.setSender(sender);
        msg.setReceiver(receiver);
        msg.setContent(content);
        msg.setTimestamp(LocalDateTime.now());
        return msg;
    }
}