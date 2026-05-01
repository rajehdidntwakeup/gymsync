package com.gymsync.controller;

import com.gymsync.model.*;
import com.gymsync.repository.UserRepository;
import com.gymsync.service.WorkoutService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkoutControllerTest {

    @Mock
    private WorkoutService workoutService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WorkoutController workoutController;

    private WorkoutLog testWorkout;
    private Exercise testExercise;
    private User testUser;
    private Principal principal;

    @BeforeEach
    void setUp() {
        principal = new Principal() {
            @Override
            public String getName() {
                return "testuser";
            }
        };

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setName("Test User");
        testUser.setFitnessLevel(FitnessLevel.INTERMEDIATE);

        testWorkout = new WorkoutLog();
        testWorkout.setId(1L);
        testWorkout.setWorkoutDate(LocalDate.now());
        testWorkout.setDurationMinutes(60);
        testWorkout.setNotes("Test workout");
        testWorkout.setUser(testUser);

        testExercise = new Exercise();
        testExercise.setId(1L);
        testExercise.setName("Bench Press");
        testExercise.setCategory(ExerciseCategory.STRENGTH);
        testExercise.setPrimaryMuscleGroup(MuscleGroup.CHEST);
    }

    @Test
    void getMyWorkouts_ShouldReturnList() {
        when(workoutService.getUserWorkoutsByUsername("testuser")).thenReturn(Arrays.asList(testWorkout));

        ResponseEntity<List<WorkoutLog>> response = workoutController.getMyWorkouts(principal);
        
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getId()).isEqualTo(1L);
    }

    @Test
    void getWorkout_ShouldReturnWorkout() {
        when(workoutService.getWorkoutById(1L)).thenReturn(testWorkout);

        ResponseEntity<WorkoutLog> response = workoutController.getWorkout(1L, principal);
        
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().getId()).isEqualTo(1L);
    }

    @Test
    void createWorkout_ShouldCreateAndReturnWorkout() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(workoutService.createWorkout(eq(1L), any())).thenReturn(testWorkout);

        ResponseEntity<WorkoutLog> response = workoutController.createWorkout(testWorkout, principal);
        
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().getId()).isEqualTo(1L);
    }

    @Test
    void addExerciseSet_ShouldAddSet() {
        when(workoutService.getWorkoutById(1L)).thenReturn(testWorkout);
        when(workoutService.addExerciseSet(anyLong(), anyLong(), any())).thenReturn(testWorkout);

        WorkoutController.AddSetRequest request = new WorkoutController.AddSetRequest();
        request.setExerciseId(1L);
        request.setSetNumber(1);
        request.setReps(10);
        request.setWeightKg(60.0);

        ResponseEntity<WorkoutLog> response = workoutController.addExerciseSet(1L, request, principal);
        
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    void deleteWorkout_ShouldDelete() {
        when(workoutService.getWorkoutById(1L)).thenReturn(testWorkout);

        ResponseEntity<Void> response = workoutController.deleteWorkout(1L, principal);
        
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(workoutService).deleteWorkout(1L);
    }

    @Test
    void getExercises_ShouldReturnList() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(workoutService.getAllExercises(1L)).thenReturn(Arrays.asList(testExercise));

        ResponseEntity<List<Exercise>> response = workoutController.getExercises(principal);
        
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getName()).isEqualTo("Bench Press");
    }

    @Test
    void searchExercises_ShouldReturnResults() {
        when(workoutService.searchExercises("bench")).thenReturn(Arrays.asList(testExercise));

        ResponseEntity<List<Exercise>> response = workoutController.searchExercises("bench");
        
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().get(0).getName()).isEqualTo("Bench Press");
    }

    @Test
    void createCustomExercise_ShouldCreateExercise() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(workoutService.createCustomExercise(eq(1L), any())).thenReturn(testExercise);

        ResponseEntity<Exercise> response = workoutController.createCustomExercise(testExercise, principal);
        
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().getName()).isEqualTo("Bench Press");
    }

    @Test
    void getStats_ShouldReturnStats() {
        Map<String, Object> stats = Map.of(
                "totalWorkouts", 10,
                "thisWeek", 3,
                "thisMonth", 8
        );
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(workoutService.getWorkoutStats(1L)).thenReturn(stats);

        ResponseEntity<Map<String, Object>> response = workoutController.getStats(principal);
        
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().get("totalWorkouts")).isEqualTo(10);
    }
}