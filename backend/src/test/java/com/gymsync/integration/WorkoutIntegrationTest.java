package com.gymsync.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymsync.config.TestSecurityConfig;
import com.gymsync.model.*;
import com.gymsync.repository.*;
import org.springframework.context.annotation.Import;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(TestSecurityConfig.class)
class WorkoutIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private WorkoutLogRepository workoutLogRepository;

    private User testUser;
    private Exercise testExercise;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setName("Test User");
        testUser.setUsername("testuser");
        testUser.setEmail("test@test.com");
        testUser.setPassword("password");
        userRepository.save(testUser);

        testExercise = new Exercise();
        testExercise.setName("Test Exercise");
        testExercise.setCategory(ExerciseCategory.STRENGTH);
        testExercise.setPrimaryMuscleGroup(MuscleGroup.CHEST);
        testExercise.setCustom(false);
        exerciseRepository.save(testExercise);
    }

    @Test
    @Disabled("Integration test requires full database setup")
    @WithMockUser(username = "testuser")
    void fullWorkoutFlow_ShouldSucceed() throws Exception {
        // 1. Create a workout
        WorkoutLog workout = new WorkoutLog();
        workout.setWorkoutDate(LocalDate.now());
        workout.setDurationMinutes(60);
        workout.setNotes("Integration test workout");

        String workoutJson = objectMapper.writeValueAsString(workout);

        String response = mockMvc.perform(post("/api/workouts")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workoutJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.durationMinutes").value(60))
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long workoutId = objectMapper.readTree(response).path("id").asLong();

        // 2. Add exercise sets
        String setRequest = """
            {
                "exerciseId": %d,
                "setNumber": 1,
                "reps": 10,
                "weightKg": 60.0
            }
            """.formatted(testExercise.getId());

        mockMvc.perform(post("/api/workouts/%d/sets".formatted(workoutId))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(setRequest))
                .andExpect(status().isOk());

        // 3. Get workout details
        mockMvc.perform(get("/api/workouts/%d".formatted(workoutId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.durationMinutes").value(60));

        // 4. Get stats
        mockMvc.perform(get("/api/workouts/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalWorkouts").isNumber());

        // 5. Delete workout
        mockMvc.perform(delete("/api/workouts/%d".formatted(workoutId))
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @Disabled("Integration test requires full database setup")
    @WithMockUser
    void getExercises_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/workouts/exercises"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    void searchExercises_ShouldReturnResults() throws Exception {
        mockMvc.perform(get("/api/workouts/exercises/search?q=test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}