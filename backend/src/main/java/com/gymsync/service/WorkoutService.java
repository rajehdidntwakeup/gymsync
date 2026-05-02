package com.gymsync.service;

import com.gymsync.model.*;
import java.util.List;
import java.util.Map;

public interface WorkoutService {
    List<WorkoutLog> getUserWorkouts(Long userId);
    List<WorkoutLog> getUserWorkoutsByUsername(String username);
    WorkoutLog getWorkoutById(Long workoutId);
    WorkoutLog createWorkout(Long userId, WorkoutLog workoutLog);
    WorkoutLog addExerciseSet(Long workoutId, Long exerciseId, ExerciseSet set);
    void deleteWorkout(Long workoutId);
    List<Exercise> getAllExercises(Long userId);
    List<Exercise> searchExercises(String query);
    Exercise createCustomExercise(Long userId, Exercise exercise);
    WorkoutLog updateWorkout(WorkoutLog workoutLog);
    Map<String, Object> getWorkoutStats(Long userId);
}
