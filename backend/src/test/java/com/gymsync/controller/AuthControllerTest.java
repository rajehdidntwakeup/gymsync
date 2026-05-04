package com.gymsync.controller;

import com.gymsync.model.FitnessLevel;
import com.gymsync.model.User;
import com.gymsync.repository.UserRepository;
import com.gymsync.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthController authController;

    private RegisterRequest validRegisterRequest;
    private User testUser;

    @BeforeEach
    void setUp() {
        validRegisterRequest = new RegisterRequest();
        validRegisterRequest.setName("John Doe");
        validRegisterRequest.setUsername("johndoe");
        validRegisterRequest.setEmail("john@example.com");
        validRegisterRequest.setPassword("password123");
        validRegisterRequest.setFitnessLevel("INTERMEDIATE");
        validRegisterRequest.setGymLocation("McFit Vienna");
        validRegisterRequest.setWorkoutGoals("Build muscle");

        testUser = new User();
        testUser.setId(1L);
        testUser.setName("John Doe");
        testUser.setUsername("johndoe");
        testUser.setEmail("john@example.com");
        testUser.setPassword("encodedPassword");
        testUser.setFitnessLevel(FitnessLevel.INTERMEDIATE);
    }

    // --- Register Tests ---

    @Test
    void register_Success() {
        when(userRepository.existsByUsername("johndoe")).thenReturn(false);
        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        ResponseEntity<?> response = authController.register(validRegisterRequest);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_DuplicateUsername_ShouldReturn400() {
        when(userRepository.existsByUsername("johndoe")).thenReturn(true);

        ResponseEntity<?> response = authController.register(validRegisterRequest);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isEqualTo("Username already taken");
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_DuplicateEmail_ShouldReturn400() {
        when(userRepository.existsByUsername("johndoe")).thenReturn(false);
        when(userRepository.existsByEmail("john@example.com")).thenReturn(true);

        ResponseEntity<?> response = authController.register(validRegisterRequest);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isEqualTo("Email already in use");
        verify(userRepository, never()).save(any());
    }

    // --- Login Tests ---

    @Test
    void login_Success() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("johndoe");
        loginRequest.setPassword("password123");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByUsername("johndoe")).thenReturn(Optional.of(testUser));
        when(jwtUtil.generateToken(testUser)).thenReturn("jwt-token");

        ResponseEntity<?> response = authController.login(loginRequest);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void login_WrongPassword_ShouldThrow() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("johndoe");
        loginRequest.setPassword("wrongpassword");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatExceptionOfType(BadCredentialsException.class)
                .isThrownBy(() -> authController.login(loginRequest));
    }

    @Test
    void login_UserNotFound_ShouldThrow() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("nonexistent");
        loginRequest.setPassword("password123");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        assertThatExceptionOfType(RuntimeException.class)
                .isThrownBy(() -> authController.login(loginRequest))
                .withMessageContaining("User not found");
    }
}