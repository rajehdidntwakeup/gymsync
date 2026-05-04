package com.gymsync.security;

import com.gymsync.model.FitnessLevel;
import com.gymsync.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtUtilTest {

    private JwtUtil jwtUtil;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        setField(jwtUtil, "secret", "testSecretKeyForTestingOnly1234567890");
        setField(jwtUtil, "expirationMs", 86400000L);

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setName("Test User");
        testUser.setEmail("test@test.com");
        testUser.setPassword("password");
        testUser.setFitnessLevel(FitnessLevel.INTERMEDIATE);
    }

    @Test
    void generateToken_ShouldReturnValidToken() {
        String token = jwtUtil.generateToken(testUser);

        assertThat(token).isNotBlank();
        assertThat(token.split("\\.")).hasSize(3);
    }

    @Test
    void extractUsername_ShouldReturnCorrectUsername() {
        String token = jwtUtil.generateToken(testUser);

        String username = jwtUtil.extractUsername(token);

        assertThat(username).isEqualTo("testuser");
    }

    @Test
    void extractUserId_ShouldReturnCorrectUserId() {
        String token = jwtUtil.generateToken(testUser);

        Long userId = jwtUtil.extractUserId(token);

        assertThat(userId).isEqualTo(1L);
    }

    @Test
    void isTokenValid_ShouldReturnTrueForValidToken() {
        String token = jwtUtil.generateToken(testUser);

        assertThat(jwtUtil.isTokenValid(token, testUser)).isTrue();
    }

    @Test
    void isTokenValid_ShouldReturnFalseForWrongUser() {
        String token = jwtUtil.generateToken(testUser);

        User otherUser = new User();
        otherUser.setId(2L);
        otherUser.setUsername("otheruser");

        assertThat(jwtUtil.isTokenValid(token, otherUser)).isFalse();
    }

    @Test
    void isTokenValid_ShouldThrowForExpiredToken() {
        JwtUtil shortLived = new JwtUtil();
        setField(shortLived, "secret", "testSecretKeyForTestingOnly1234567890");
        setField(shortLived, "expirationMs", 1L);

        // Sleep briefly to let token expire
        String token = shortLived.generateToken(testUser);

        // JwtUtil.isTokenExpired throws ExpiredJwtException for expired tokens
        assertThatThrownBy(() -> shortLived.isTokenValid(token, testUser))
                .isInstanceOf(Exception.class);
    }

    @Test
    void extractUsername_ShouldThrowForInvalidToken() {
        assertThatThrownBy(() -> jwtUtil.extractUsername("invalid.token.here"))
                .isInstanceOf(Exception.class);
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set field: " + fieldName, e);
        }
    }
}