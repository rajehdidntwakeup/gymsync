package com.gymsync.service;

import com.gymsync.model.*;
import com.gymsync.repository.ExerciseRepository;
import com.gymsync.repository.UserRepository;
import com.gymsync.repository.WorkoutLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkoutServiceTest {

    @Mock
    private WorkoutLogRepository workoutLogRepository;

    @Mock
    private ExerciseRepository exerciseRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WorkoutService workoutService;

    private User testUser;
    private Exercise testExercise;
    private WorkoutLog testWorkout;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setName("Test User");

        testExercise = new Exercise();
        testExercise.setId(1L);
        testExercise.setName("Bench Press");
        testExercise.setCategory(ExerciseCategory.STRENGTH);
        testExercise.setPrimaryMuscleGroup(MuscleGroup.CHEST);

        testWorkout = new WorkoutLog();
        testWorkout.setId(1L);
        testWorkout.setUser(testUser);
        testWorkout.setWorkoutDate(LocalDate.now());
        testWorkout.setDurationMinutes(60);
        testWorkout.setNotes("Great workout!");
    }

    @Test
    void getUserWorkouts_ShouldReturnWorkouts() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(workoutLogRepository.findByUserOrderByWorkoutDateDesc(testUser))
                .thenReturn(Arrays.asList(testWorkout));

        // When
        List<WorkoutLog> result = workoutService.getUserWorkouts(1L);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDurationMinutes()).isEqualTo(60);
        verify(workoutLogRepository).findByUserOrderByWorkoutDateDesc(testUser);
    }

    @Test
    void getUserWorkouts_WhenUserNotFound_ShouldThrowException() {
        // Given
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> workoutService.getUserWorkouts(999L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    void getWorkoutById_ShouldReturnWorkout() {
        // Given
        when(workoutLogRepository.findByIdWithExerciseSets(1L)).thenReturn(testWorkout);

        // When
        WorkoutLog result = workoutService.getWorkoutById(1L);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    void createWorkout_ShouldSaveAndReturnWorkout() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(workoutLogRepository.save(any(WorkoutLog.class))).thenReturn(testWorkout);

        WorkoutLog newWorkout = new WorkoutLog();
        newWorkout.setWorkoutDate(LocalDate.now());
        newWorkout.setDurationMinutes(45);

        // When
        WorkoutLog result = workoutService.createWorkout(1L, newWorkout);

        // Then
        assertThat(result).isNotNull();
        verify(workoutLogRepository).save(argThat(w -> 
            w.getUser().equals(testUser) && w.getDurationMinutes() == 45));
    }

    @Test
    void addExerciseSet_ShouldAddSetToWorkout() {
        // Given
        when(workoutLogRepository.findById(1L)).thenReturn(Optional.of(testWorkout));
        when(exerciseRepository.findById(1L)).thenReturn(Optional.of(testExercise));
        when(workoutLogRepository.save(any(WorkoutLog.class))).thenReturn(testWorkout);

        ExerciseSet newSet = new ExerciseSet();
        newSet.setSetNumber(1);
        newSet.setReps(10);
        newSet.setWeightKg(60.0);

        // When
        WorkoutLog result = workoutService.addExerciseSet(1L, 1L, newSet);

        // Then
        assertThat(result).isNotNull();
        verify(workoutLogRepository).save(testWorkout);
    }

    @Test
    void addExerciseSet_WhenWorkoutNotFound_ShouldThrowException() {
        // Given
        when(workoutLogRepository.findById(999L)).thenReturn(Optional.empty());

        ExerciseSet newSet = new ExerciseSet();

        // When & Then
        assertThatThrownBy(() -> workoutService.addExerciseSet(999L, 1L, newSet))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Workout not found");
    }

    @Test
    void deleteWorkout_ShouldDeleteById() {
        // When
        workoutService.deleteWorkout(1L);

        // Then
        verify(workoutLogRepository).deleteById(1L);
    }

    @Test
    void getAllExercises_ShouldReturnAvailableExercises() {
        // Given
        when(exerciseRepository.findAllAvailableForUser(1L))
                .thenReturn(Arrays.asList(testExercise));

        // When
        List<Exercise> result = workoutService.getAllExercises(1L);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Bench Press");
    }

    @Test
    void searchExercises_ShouldReturnMatchingExercises() {
        // Given
        when(exerciseRepository.findByNameContainingIgnoreCase("bench"))
                .thenReturn(Arrays.asList(testExercise));

        // When
        List<Exercise> result = workoutService.searchExercises("bench");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Bench Press");
    }

    @Test
    void createCustomExercise_ShouldSaveCustomExercise() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(exerciseRepository.save(any(Exercise.class))).thenReturn(testExercise);

        Exercise customExercise = new Exercise();
        customExercise.setName("Custom Exercise");
        customExercise.setCategory(ExerciseCategory.STRENGTH);
        customExercise.setPrimaryMuscleGroup(MuscleGroup.CHEST);

        // When
        Exercise result = workoutService.createCustomExercise(1L, customExercise);

        // Then
        assertThat(result).isNotNull();
        verify(exerciseRepository).save(argThat(e -> {
            assertThat(e.isCustom()).isTrue();
            assertThat(e.getCreatedBy()).isEqualTo(testUser);
            return true;
        }));
    }

    @Test
    void getWorkoutStats_ShouldReturnCorrectStats() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(workoutLogRepository.findByUserOrderByWorkoutDateDesc(testUser))
                .thenReturn(Arrays.asList(testWorkout, testWorkout, testWorkout));
        when(workoutLogRepository.countWorkoutsInDateRange(any(), any(), any()))
                .thenReturn(2L);

        // When
        Map<String, Object> stats = workoutService.getWorkoutStats(1L);

        // Then
        assertThat(stats.get("totalWorkouts")).isEqualTo(3);
        assertThat(stats.get("thisWeek")).isEqualTo(2L);
        assertThat(stats.get("thisMonth")).isEqualTo(2L);
    }
}