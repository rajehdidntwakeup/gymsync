package com.gymsync.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymsync.config.TestSecurityConfig;
import com.gymsync.controller.ChatController.*;
import com.gymsync.model.*;
import com.gymsync.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;


import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(TestSecurityConfig.class)
public class ChatE2EFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    private User user1;
    private User user2;

    @BeforeEach
    void setUp() {
        chatMessageRepository.deleteAll();
        userRepository.deleteAll();

        user1 = new User();
        user1.setName("User One");
        user1.setUsername("user1");
        user1.setEmail("user1@test.com");
        user1.setPassword("password");
        userRepository.save(user1);

        user2 = new User();
        user2.setName("User Two");
        user2.setUsername("user2");
        user2.setEmail("user2@test.com");
        user2.setPassword("password");
        userRepository.save(user2);
    }

    @Test
    @WithMockUser(username = "user1")
    void sendTypingNotification_ShouldWork() throws Exception {
        TypingRequest request = new TypingRequest();
        request.setReceiverUsername("user2");
        request.setTyping(true);

        mockMvc.perform(post("/api/chat/typing")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    private com.gymsync.controller.ChatController.ChatMessageRequest createRequest(String receiver, String content, com.gymsync.model.MessageType type) {
        com.gymsync.controller.ChatController.ChatMessageRequest request = new com.gymsync.controller.ChatController.ChatMessageRequest();
        request.setReceiverUsername(receiver);
        request.setContent(content);
        request.setType(type);
        return request;
    }
}