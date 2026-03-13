package com.gymsync.controller;

import com.gymsync.model.*;
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

    public WorkoutController(WorkoutService workoutService) {
        this.workoutService = workoutService;
    }

    @GetMapping
    public ResponseEntity<List<WorkoutLog>> getMyWorkouts(Principal principal) {
        // TODO: Get userId from principal
        Long userId = 1L; // Placeholder
        return ResponseEntity.ok(workoutService.getUserWorkouts(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkoutLog> getWorkout(@PathVariable Long id) {
        return ResponseEntity.ok(workoutService.getWorkoutById(id));
    }

    @PostMapping
    public ResponseEntity<WorkoutLog> createWorkout(
            @RequestBody WorkoutLog workoutLog,
            Principal principal) {
        Long userId = 1L; // Placeholder
        return ResponseEntity.ok(workoutService.createWorkout(userId, workoutLog));
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
        Long userId = 1L; // Placeholder
        return ResponseEntity.ok(workoutService.getAllExercises(userId));
    }

    @GetMapping("/exercises/search")
    public ResponseEntity<List<Exercise>> searchExercises(@RequestParam String q) {
        return ResponseEntity.ok(workoutService.searchExercises(q));
    }

    @PostMapping("/exercises")
    public ResponseEntity<Exercise> createCustomExercise(
            @RequestBody Exercise exercise,
            Principal principal) {
        Long userId = 1L; // Placeholder
        return ResponseEntity.ok(workoutService.createCustomExercise(userId, exercise));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(Principal principal) {
        Long userId = 1L; // Placeholder
        return ResponseEntity.ok(workoutService.getWorkoutStats(userId));
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