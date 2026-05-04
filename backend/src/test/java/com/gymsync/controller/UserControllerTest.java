package com.gymsync.controller;

import com.gymsync.dto.UserProfileResponse;
import com.gymsync.dto.UserUpdateRequest;
import com.gymsync.model.FitnessLevel;
import com.gymsync.model.User;
import com.gymsync.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    private User testUser;
    private Principal principal;

    @BeforeEach
    void setUp() {
        principal = () -> "johndoe";

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("johndoe");
        testUser.setName("John Doe");
        testUser.setEmail("john@example.com");
        testUser.setFitnessLevel(FitnessLevel.INTERMEDIATE);
        testUser.setGymLocation("McFit Vienna");
        testUser.setWorkoutGoals("Build muscle");
    }

    @Test
    void getMyProfile_ShouldReturnProfile() {
        when(userService.getUserByUsername("johndoe")).thenReturn(testUser);

        ResponseEntity<UserProfileResponse> response = userController.getMyProfile(principal);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getUsername()).isEqualTo("johndoe");
        assertThat(response.getBody().getEmail()).isEqualTo("john@example.com");
    }

    @Test
    void updateProfile_ShouldReturnUpdatedProfile() {
        UserUpdateRequest updateRequest = new UserUpdateRequest();
        updateRequest.setName("John Updated");
        updateRequest.setFitnessLevel("ADVANCED");

        User updatedUser = new User();
        updatedUser.setId(1L);
        updatedUser.setUsername("johndoe");
        updatedUser.setName("John Updated");
        updatedUser.setEmail("john@example.com");
        updatedUser.setFitnessLevel(FitnessLevel.ADVANCED);

        when(userService.updateProfile("johndoe", updateRequest)).thenReturn(updatedUser);

        ResponseEntity<UserProfileResponse> response = userController.updateProfile(updateRequest, principal);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().getName()).isEqualTo("John Updated");
        assertThat(response.getBody().getFitnessLevel()).isEqualTo(FitnessLevel.ADVANCED);
    }

    @Test
    void getFitnessLevels_ShouldReturnThreeLevels() {
        ResponseEntity<List<String>> response = userController.getFitnessLevels();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(3);
        assertThat(response.getBody()).containsExactly("BEGINNER", "INTERMEDIATE", "ADVANCED");
    }

    @Test
    void getSchedule_ShouldReturnSchedule() {
        when(userService.getSchedule("johndoe")).thenReturn(java.util.Collections.emptySet());

        ResponseEntity<?> response = userController.getSchedule(principal);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @SuppressWarnings("unchecked")
    void findBuddies_ShouldReturnBuddies() {
        User buddy = new User();
        buddy.setId(2L);
        buddy.setUsername("buddy");
        buddy.setName("Gym Buddy");

        when(userService.findBuddies("johndoe", "McFit Vienna", "INTERMEDIATE"))
                .thenReturn(Arrays.asList(buddy));

        ResponseEntity<?> response = userController.findBuddies("McFit Vienna", "INTERMEDIATE", principal);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        List<UserProfileResponse> buddies = (List<UserProfileResponse>) response.getBody();
        assertThat(buddies).hasSize(1);
        assertThat(buddies.get(0).getUsername()).isEqualTo("buddy");
    }
}