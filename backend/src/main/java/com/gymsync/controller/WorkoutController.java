package com.gymsync.controller;

import com.gymsync.model.*;
import com.gymsync.repository.UserRepository;
import com.gymsync.service.WorkoutService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workouts")
public class WorkoutController {

    private final WorkoutService workoutService;
    private final UserRepository userRepository;

    public WorkoutController(WorkoutService workoutService, UserRepository userRepository) {
        this.workoutService = workoutService;
        this.userRepository = userRepository;
    }

    private String requireUsername(Principal principal) {
        return principal.getName();
    }

    private void verifyOwnership(WorkoutLog workout, String username) {
        if (!workout.getUser().getUsername().equals(username)) {
            throw new RuntimeException("You can only access your own workouts");
        }
    }

    @GetMapping
    public ResponseEntity<List<WorkoutLog>> getMyWorkouts(Principal principal) {
        String username = requireUsername(principal);
        return ResponseEntity.ok(workoutService.getUserWorkoutsByUsername(username));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkoutLog> getWorkout(@PathVariable Long id, Principal principal) {
        WorkoutLog workout = workoutService.getWorkoutById(id);
        verifyOwnership(workout, requireUsername(principal));
        return ResponseEntity.ok(workout);
    }

    @PostMapping
    public ResponseEntity<WorkoutLog> createWorkout(
            @Valid @RequestBody WorkoutLog workoutLog,
            Principal principal) {
        String username = requireUsername(principal);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return ResponseEntity.ok(workoutService.createWorkout(user.getId(), workoutLog));
    }

    @PostMapping("/{workoutId}/sets")
    public ResponseEntity<WorkoutLog> addExerciseSet(
            @PathVariable Long workoutId,
            @Valid @RequestBody AddSetRequest request,
            Principal principal) {
        WorkoutLog workout = workoutService.getWorkoutById(workoutId);
        verifyOwnership(workout, requireUsername(principal));

        ExerciseSet set = new ExerciseSet();
        set.setSetNumber(request.getSetNumber());
        set.setReps(request.getReps());
        set.setWeightKg(request.getWeightKg());
        set.setNotes(request.getNotes());

        return ResponseEntity.ok(
            workoutService.addExerciseSet(workoutId, request.getExerciseId(), set)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkout(@PathVariable Long id, Principal principal) {
        WorkoutLog workout = workoutService.getWorkoutById(id);
        verifyOwnership(workout, requireUsername(principal));
        workoutService.deleteWorkout(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/exercises")
    public ResponseEntity<List<Exercise>> getExercises(Principal principal) {
        String username = requireUsername(principal);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return ResponseEntity.ok(workoutService.getAllExercises(user.getId()));
    }

    @GetMapping("/exercises/search")
    public ResponseEntity<List<Exercise>> searchExercises(@RequestParam String q) {
        return ResponseEntity.ok(workoutService.searchExercises(q));
    }

    @PostMapping("/exercises")
    public ResponseEntity<Exercise> createCustomExercise(
            @Valid @RequestBody Exercise exercise,
            Principal principal) {
        String username = requireUsername(principal);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return ResponseEntity.ok(workoutService.createCustomExercise(user.getId(), exercise));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(Principal principal) {
        String username = requireUsername(principal);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return ResponseEntity.ok(workoutService.getWorkoutStats(user.getId()));
    }

    // DTO
    public static class AddSetRequest {
        @NotNull
        private Long exerciseId;
        @NotNull @Positive
        private Integer setNumber;
        private Integer reps;
        private Double weightKg;
        private String notes;

        public Long getExerciseId() { return exerciseId; }
        public void setExerciseId(Long exerciseId) { this.exerciseId = exerciseId; }
        public Integer getSetNumber() { return setNumber; }
        public void setSetNumber(Integer setNumber) { this.setNumber = setNumber; }
        public Integer getReps() { return reps; }
        public void setReps(Integer reps) { this.reps = reps; }
        public Double getWeightKg() { return weightKg; }
        public void setWeightKg(Double weightKg) { this.weightKg = weightKg; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }
}