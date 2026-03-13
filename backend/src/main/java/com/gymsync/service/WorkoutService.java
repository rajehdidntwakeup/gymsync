package com.gymsync.service;

import com.gymsync.model.*;
import com.gymsync.repository.ExerciseRepository;
import com.gymsync.repository.UserRepository;
import com.gymsync.repository.WorkoutLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class WorkoutService {

    private final WorkoutLogRepository workoutLogRepository;
    private final ExerciseRepository exerciseRepository;
    private final UserRepository userRepository;

    public WorkoutService(WorkoutLogRepository workoutLogRepository,
                         ExerciseRepository exerciseRepository,
                         UserRepository userRepository) {
        this.workoutLogRepository = workoutLogRepository;
        this.exerciseRepository = exerciseRepository;
        this.userRepository = userRepository;
    }

    public List<WorkoutLog> getUserWorkouts(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return workoutLogRepository.findByUserOrderByWorkoutDateDesc(user);
    }

    public WorkoutLog getWorkoutById(Long workoutId) {
        return workoutLogRepository.findByIdWithExerciseSets(workoutId);
    }

    @Transactional
    public WorkoutLog createWorkout(Long userId, WorkoutLog workoutLog) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        workoutLog.setUser(user);
        return workoutLogRepository.save(workoutLog);
    }

    @Transactional
    public WorkoutLog addExerciseSet(Long workoutId, Long exerciseId, ExerciseSet set) {
        WorkoutLog workout = workoutLogRepository.findById(workoutId)
                .orElseThrow(() -> new RuntimeException("Workout not found"));
        
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new RuntimeException("Exercise not found"));
        
        set.setExercise(exercise);
        workout.addExerciseSet(set);
        
        return workoutLogRepository.save(workout);
    }

    @Transactional
    public void deleteWorkout(Long workoutId) {
        workoutLogRepository.deleteById(workoutId);
    }

    public List<Exercise> getAllExercises(Long userId) {
        return exerciseRepository.findAllAvailableForUser(userId);
    }

    public List<Exercise> searchExercises(String query) {
        return exerciseRepository.findByNameContainingIgnoreCase(query);
    }

    @Transactional
    public Exercise createCustomExercise(Long userId, Exercise exercise) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        exercise.setCustom(true);
        exercise.setCreatedBy(user);
        return exerciseRepository.save(exercise);
    }

    public Map<String, Object> getWorkoutStats(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        LocalDate now = LocalDate.now();
        LocalDate weekStart = now.minusDays(7);
        LocalDate monthStart = now.minusDays(30);
        
        Long weekCount = workoutLogRepository.countWorkoutsInDateRange(user, weekStart, now);
        Long monthCount = workoutLogRepository.countWorkoutsInDateRange(user, monthStart, now);
        
        return Map.of(
            "totalWorkouts", workoutLogRepository.findByUserOrderByWorkoutDateDesc(user).size(),
            "thisWeek", weekCount,
            "thisMonth", monthCount
        );
    }
}