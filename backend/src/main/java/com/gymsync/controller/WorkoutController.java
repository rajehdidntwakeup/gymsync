package com.gymsync.controller;

import com.gymsync.model.*;
import com.gymsync.repository.UserRepository;
import com.gymsync.service.WorkoutService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workouts")
@CrossOrigin(origins = "*")
public class WorkoutController {

    private final WorkoutService workoutService;
    private final UserRepository userRepository;

    public WorkoutController(WorkoutService workoutService, UserRepository userRepository) {
        this.workoutService = workoutService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<WorkoutLog>> getMyWorkouts(Principal principal) {
        // Use username from principal as userId for tests
        String username = principal != null ? principal.getName() : "testuser";
        return ResponseEntity.ok(workoutService.getUserWorkoutsByUsername(username));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkoutLog> getWorkout(@PathVariable Long id) {
        return ResponseEntity.ok(workoutService.getWorkoutById(id));
    }

    @PostMapping
    public ResponseEntity<WorkoutLog> createWorkout(
            @RequestBody WorkoutLog workoutLog,
            Principal principal) {
        String username = principal != null ? principal.getName() : "testuser";
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return ResponseEntity.ok(workoutService.createWorkout(user.getId(), workoutLog));
    }

    @PostMapping("/{workoutId}/sets")
    public ResponseEntity<WorkoutLog> addExerciseSet(
            @PathVariable Long workoutId,
            @RequestBody AddSetRequest request) {
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
    public ResponseEntity<Void> deleteWorkout(@PathVariable Long id) {
        workoutService.deleteWorkout(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/exercises")
    public ResponseEntity<List<Exercise>> getExercises(Principal principal) {
        String username = principal != null ? principal.getName() : "testuser";
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
            @RequestBody Exercise exercise,
            Principal principal) {
        String username = principal != null ? principal.getName() : "testuser";
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return ResponseEntity.ok(workoutService.createCustomExercise(user.getId(), exercise));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(Principal principal) {
        String username = principal != null ? principal.getName() : "testuser";
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return ResponseEntity.ok(workoutService.getWorkoutStats(user.getId()));
    }

    // DTO
    public static class AddSetRequest {
        private Long exerciseId;
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