package com.gymsync.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymsync.model.User;
import com.gymsync.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthenticationE2ETest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void completeAuthenticationFlow_ShouldWork() throws Exception {
        // Step 1: Register a new user
        User newUser = new User();
        newUser.setName("John Doe");
        newUser.setUsername("johndoe");
        newUser.setEmail("john@example.com");
        newUser.setPassword("password123");
        newUser.setFitnessLevel(com.gymsync.model.FitnessLevel.INTERMEDIATE);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User registered successfully"))
                .andExpect(jsonPath("$.userId").exists());

        // Verify user in database
        assertThat(userRepository.findByUsername("johndoe")).isPresent();
        User savedUser = userRepository.findByUsername("johndoe").get();
        assertThat(savedUser.getEmail()).isEqualTo("john@example.com");
        assertThat(passwordEncoder.matches("password123", savedUser.getPassword())).isTrue();

        // Step 2: Try to register with same username (should fail)
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newUser)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Username already taken"));

        // Step 3: Try to register with same email (should fail)
        User anotherUser = new User();
        anotherUser.setName("Jane Doe");
        anotherUser.setUsername("janedoe");
        anotherUser.setEmail("john@example.com");
        anotherUser.setPassword("password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(anotherUser)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Email already in use"));
    }

    @Test
    void registerUser_WithInvalidData_ShouldFail() throws Exception {
        // Missing required fields
        String invalidUser = "{\"name\": \"John\"}";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidUser))
                .andExpect(status().isBadRequest());
    }
}