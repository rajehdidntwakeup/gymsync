package com.gymsync.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymsync.config.TestSecurityConfig;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(TestSecurityConfig.class)
class UserProfileE2EFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        testUser = new User();
        testUser.setName("John Doe");
        testUser.setUsername("johndoe");
        testUser.setEmail("john@example.com");
        testUser.setPassword("password");
        testUser.setFitnessLevel(FitnessLevel.INTERMEDIATE);
        testUser.setGymLocation("McFit Vienna");
        testUser.setWorkoutGoals("Build muscle, lose weight");
        userRepository.save(testUser);
    }

    @Test
    void completeProfileFlow_ShouldWork() throws Exception {
        // Step 1: Get user profile
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("johndoe"))
                .andExpect(jsonPath("$.fitnessLevel").value("INTERMEDIATE"));

        // Step 2: Update profile
        testUser.setName("John Updated");
        testUser.setFitnessLevel(FitnessLevel.ADVANCED);
        testUser.setGymLocation("FitInn Berlin");

        mockMvc.perform(put("/api/users/me")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("John Updated"));

        // Step 3: Verify update
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fitnessLevel").value("ADVANCED"));

        // Step 4: Get fitness level options
        mockMvc.perform(get("/api/users/fitness-levels"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(3)); // BEGINNER, INTERMEDIATE, ADVANCED
    }

    @Test
    void scheduleAvailability_ShouldWork() throws Exception {
        // Step 1: Set available slots
        String slotsRequest = """
            {
                "slots": [
                    {"dayOfWeek": "MONDAY", "startTime": "18:00", "endTime": "20:00"},
                    {"dayOfWeek": "WEDNESDAY", "startTime": "17:00", "endTime": "19:00"},
                    {"dayOfWeek": "FRIDAY", "startTime": "18:00", "endTime": "21:00"}
                ]
            }
            """;

        mockMvc.perform(post("/api/users/schedule")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(slotsRequest))
                .andExpect(status().isOk());

        // Step 2: Get schedule
        mockMvc.perform(get("/api/users/schedule"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(3));

        // Step 3: Update schedule (replace)
        String updatedSlots = """
            {
                "slots": [
                    {"dayOfWeek": "TUESDAY", "startTime": "07:00", "endTime": "09:00"}
                ]
            }
            """;

        mockMvc.perform(post("/api/users/schedule")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatedSlots))
                .andExpect(status().isOk());

        // Step 4: Verify updated
        mockMvc.perform(get("/api/users/schedule"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].dayOfWeek").value("TUESDAY"));
    }

    @Test
    void findGymBuddies_ShouldWork() throws Exception {
        // Create another user with matching schedule
        User buddy = new User();
        buddy.setName("Gym Buddy");
        buddy.setUsername("gymbuddy");
        buddy.setEmail("buddy@test.com");
        buddy.setPassword("password");
        buddy.setFitnessLevel(FitnessLevel.INTERMEDIATE);
        buddy.setGymLocation("McFit Vienna");
        userRepository.save(buddy);

        // Find buddies
        mockMvc.perform(get("/api/users/buddies")
                        .param("gymLocation", "McFit Vienna")
                        .param("fitnessLevel", "INTERMEDIATE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}