package com.gymsync.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymsync.model.*;
import com.gymsync.repository.*;
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

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
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
    void completeWorkoutFlow_ShouldPersistCorrectly() throws Exception {
        // Step 1: View available exercises
        mockMvc.perform(get("/api/workouts/exercises"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").exists());

        // Step 2: Search for specific exercise
        mockMvc.perform(get("/api/workouts/exercises/search?q=bench"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Bench Press"));

        // Step 3: Create a new workout
        WorkoutLog workout = new WorkoutLog();
        workout.setWorkoutDate(LocalDate.now());
        workout.setDurationMinutes(75);
        workout.setCaloriesBurned(450);
        workout.setRating(4.5);
        workout.setNotes("Chest and legs day");

        String workoutResponse = mockMvc.perform(post("/api/workouts")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workout)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.durationMinutes").value(75))
                .andExpect(jsonPath("$.notes").value("Chest and legs day"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long workoutId = objectMapper.readTree(workoutResponse).path("id").asLong();

        // Verify workout in database
        WorkoutLog savedWorkout = workoutLogRepository.findById(workoutId).orElseThrow();
        assertThat(savedWorkout.getDurationMinutes()).isEqualTo(75);
        assertThat(savedWorkout.getUser().getUsername()).isEqualTo("testuser");

        // Step 4: Add exercise sets
        String set1Request = createSetRequest(benchPress.getId(), 1, 10, 80.0);
        mockMvc.perform(post("/api/workouts/%d/sets".formatted(workoutId))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(set1Request))
                .andExpect(status().isOk());

        String set2Request = createSetRequest(benchPress.getId(), 2, 8, 82.5);
        mockMvc.perform(post("/api/workouts/%d/sets".formatted(workoutId))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(set2Request))
                .andExpect(status().isOk());

        String set3Request = createSetRequest(squats.getId(), 1, 12, 100.0);
        mockMvc.perform(post("/api/workouts/%d/sets".formatted(workoutId))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(set3Request))
                .andExpect(status().isOk());

        // Verify sets in database
        List<ExerciseSet> sets = exerciseSetRepository.findAll();
        assertThat(sets).hasSize(3);
        assertThat(sets.stream().filter(s -> s.getExercise().getName().equals("Bench Press")).count()).isEqualTo(2);
        assertThat(sets.stream().filter(s -> s.getExercise().getName().equals("Squats")).count()).isEqualTo(1);

        // Step 5: Get workout with sets
        mockMvc.perform(get("/api/workouts/%d".formatted(workoutId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.durationMinutes").value(75));

        // Step 6: Get user's workout list
        mockMvc.perform(get("/api/workouts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1));

        // Step 7: Get workout stats
        mockMvc.perform(get("/api/workouts/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalWorkouts").value(1));

        // Step 8: Create another workout
        WorkoutLog workout2 = new WorkoutLog();
        workout2.setWorkoutDate(LocalDate.now().minusDays(2));
        workout2.setDurationMinutes(45);

        mockMvc.perform(post("/api/workouts")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workout2)))
                .andExpect(status().isOk());

        // Step 9: Verify updated stats
        mockMvc.perform(get("/api/workouts/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalWorkouts").value(2));

        // Step 10: Delete first workout
        mockMvc.perform(delete("/api/workouts/%d".formatted(workoutId))
                        .with(csrf()))
                .andExpect(status().isOk());

        // Verify deletion
        assertThat(workoutLogRepository.findById(workoutId)).isEmpty();
        assertThat(exerciseSetRepository.findAll()).hasSize(0); // Sets cascade deleted
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