package com.gymsync.e2e;

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
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(TestSecurityConfig.class)
class WorkoutE2EFlowTest {

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

    @Autowired
    private ExerciseSetRepository exerciseSetRepository;

    private User testUser;
    private Exercise benchPress;
    private Exercise squats;

    @BeforeEach
    void setUp() {
        exerciseSetRepository.deleteAll();
        workoutLogRepository.deleteAll();
        userRepository.deleteAll();
        exerciseRepository.deleteAll();

        // Create test user
        testUser = new User();
        testUser.setName("Test User");
        testUser.setUsername("testuser");
        testUser.setEmail("test@test.com");
        testUser.setPassword("password");
        testUser.setFitnessLevel(FitnessLevel.INTERMEDIATE);
        userRepository.save(testUser);

        // Create exercises
        benchPress = createExercise("Bench Press", ExerciseCategory.STRENGTH, MuscleGroup.CHEST);
        squats = createExercise("Squats", ExerciseCategory.STRENGTH, MuscleGroup.QUADRICEPS);
        exerciseRepository.saveAll(List.of(benchPress, squats));
    }



    @Test
    @WithMockUser(username = "testuser")
    void createCustomExercise_ShouldBeAvailable() throws Exception {
        // Create custom exercise
        Exercise customExercise = new Exercise();
        customExercise.setName("My Custom Exercise");
        customExercise.setCategory(ExerciseCategory.STRENGTH);
        customExercise.setPrimaryMuscleGroup(MuscleGroup.BICEPS);
        customExercise.setDescription("A custom exercise I created");

        mockMvc.perform(post("/api/workouts/exercises")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(customExercise)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("My Custom Exercise"))
                .andExpect(jsonPath("$.custom").value(true));

        // Verify custom exercise appears in list
        mockMvc.perform(get("/api/workouts/exercises"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(3)); // 2 default + 1 custom
    }

    private Exercise createExercise(String name, ExerciseCategory category, MuscleGroup muscle) {
        Exercise exercise = new Exercise();
        exercise.setName(name);
        exercise.setCategory(category);
        exercise.setPrimaryMuscleGroup(muscle);
        exercise.setCustom(false);
        return exercise;
    }

    private String createSetRequest(Long exerciseId, int setNumber, int reps, double weight) {
        return """
            {
                "exerciseId": %d,
                "setNumber": %d,
                "reps": %d,
                "weightKg": %.1f
            }
            """.formatted(exerciseId, setNumber, reps, weight);
    }
}