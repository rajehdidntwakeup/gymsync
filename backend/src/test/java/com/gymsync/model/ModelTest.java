package com.gymsync.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class WorkoutLogTest {

    @Test
    void onCreate_ShouldSetTimestamps() {
        // Given
        WorkoutLog log = new WorkoutLog();

        // When
        log.onCreate();

        // Then
        assertThat(log.getCreatedAt()).isNotNull();
        assertThat(log.getUpdatedAt()).isNotNull();
        assertThat(log.getWorkoutDate()).isEqualTo(LocalDate.now());
    }

    @Test
    void addExerciseSet_ShouldAddSet() {
        // Given
        WorkoutLog log = new WorkoutLog();
        ExerciseSet set = new ExerciseSet();
        set.setSetNumber(1);

        // When
        log.addExerciseSet(set);

        // Then
        assertThat(log.getExerciseSets()).hasSize(1);
        assertThat(set.getWorkoutLog()).isEqualTo(log);
    }

    @Test
    void removeExerciseSet_ShouldRemoveSet() {
        // Given
        WorkoutLog log = new WorkoutLog();
        ExerciseSet set = new ExerciseSet();
        log.addExerciseSet(set);

        // When
        log.removeExerciseSet(set);

        // Then
        assertThat(log.getExerciseSets()).isEmpty();
        assertThat(set.getWorkoutLog()).isNull();
    }
}

class UserTest {

    @Test
    void onCreate_ShouldSetTimestamps() {
        // Given
        User user = new User();
        user.setName("Test");
        user.setUsername("test");
        user.setEmail("test@test.com");
        user.setPassword("password");

        // When
        user.onCreate();

        // Then
        assertThat(user.getCreatedAt()).isNotNull();
        assertThat(user.getUpdatedAt()).isEqualTo(user.getCreatedAt());
    }

    @Test
    void onUpdate_ShouldUpdateTimestamp() {
        // Given
        User user = new User();
        user.onCreate();
        LocalDateTime original = user.getUpdatedAt();

        // When
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        user.onUpdate();

        // Then
        assertThat(user.getUpdatedAt()).isAfter(original);
    }
}

class ExerciseTest {

    @Test
    void onCreate_ShouldSetTimestamp() {
        // Given
        Exercise exercise = new Exercise();
        exercise.setName("Bench Press");

        // When
        exercise.onCreate();

        // Then
        assertThat(exercise.getCreatedAt()).isNotNull();
    }
}