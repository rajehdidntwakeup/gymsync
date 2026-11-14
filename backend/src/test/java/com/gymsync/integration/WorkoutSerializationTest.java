package com.gymsync.integration;

import com.gymsync.config.TestSecurityConfig;
import com.gymsync.model.Exercise;
import com.gymsync.model.ExerciseCategory;
import com.gymsync.model.ExerciseSet;
import com.gymsync.model.MuscleGroup;
import com.gymsync.model.User;
import com.gymsync.model.WorkoutLog;
import com.gymsync.repository.ExerciseRepository;
import com.gymsync.repository.ExerciseSetRepository;
import com.gymsync.repository.UserRepository;
import com.gymsync.repository.WorkoutLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(TestSecurityConfig.class)
class WorkoutSerializationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private WorkoutLogRepository workoutLogRepository;

    @Autowired
    private ExerciseSetRepository exerciseSetRepository;

    private User testUser;
    private Exercise testExercise;
    private WorkoutLog workoutLog;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setName("Test User");
        testUser.setUsername("testuser");
        testUser.setEmail("test@test.com");
        testUser.setPassword("password");
        userRepository.save(testUser);

        testExercise = new Exercise();
        testExercise.setName("Bench Press");
        testExercise.setCategory(ExerciseCategory.STRENGTH);
        testExercise.setPrimaryMuscleGroup(MuscleGroup.CHEST);
        testExercise.setCustom(false);
        exerciseRepository.save(testExercise);

        workoutLog = new WorkoutLog();
        workoutLog.setUser(testUser);
        workoutLog.setWorkoutDate(LocalDate.now());
        workoutLogRepository.save(workoutLog);

        ExerciseSet set = new ExerciseSet();
        set.setWorkoutLog(workoutLog);
        set.setExercise(testExercise);
        set.setSetNumber(1);
        set.setReps(10);
        set.setWeightKg(60.0);
        exerciseSetRepository.save(set);
    }

    @Test
    @WithMockUser(username = "testuser")
    void getWorkouts_WithExerciseSets_ShouldNotRecurse() throws Exception {
        mockMvc.perform(get("/api/workouts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].exerciseSets[0].workoutLog").doesNotExist());
    }
}