package com.gymsync.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymsync.config.TestSecurityConfig;
import com.gymsync.model.*;
import com.gymsync.repository.*;
import org.springframework.context.annotation.Import;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;


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
    @WithMockUser
    void searchExercises_ShouldReturnResults() throws Exception {
        mockMvc.perform(get("/api/workouts/exercises/search?q=test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}