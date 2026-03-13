package com.gymsync.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymsync.model.*;
import com.gymsync.service.WorkoutService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WorkoutController.class)
@WithMockUser
class WorkoutControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WorkoutService workoutService;

    @Autowired
    private ObjectMapper objectMapper;

    private WorkoutLog testWorkout;
    private Exercise testExercise;

    @BeforeEach
    void setUp() {
        testWorkout = new WorkoutLog();
        testWorkout.setId(1L);
        testWorkout.setWorkoutDate(LocalDate.now());
        testWorkout.setDurationMinutes(60);
        testWorkout.setNotes("Test workout");

        testExercise = new Exercise();
        testExercise.setId(1L);
        testExercise.setName("Bench Press");
        testExercise.setCategory(ExerciseCategory.STRENGTH);
    }

    @Test
    void getMyWorkouts_ShouldReturnList() throws Exception {
        // Given
        when(workoutService.getUserWorkouts(any())).thenReturn(Arrays.asList(testWorkout));

        // When & Then
        mockMvc.perform(get("/api/workouts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].durationMinutes").value(60));
    }

    @Test
    void getWorkout_ShouldReturnWorkout() throws Exception {
        // Given
        when(workoutService.getWorkoutById(1L)).thenReturn(testWorkout);

        // When & Then
        mockMvc.perform(get("/api/workouts/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void createWorkout_ShouldCreateAndReturnWorkout() throws Exception {
        // Given
        when(workoutService.createWorkout(any(), any())).thenReturn(testWorkout);

        // When & Then
        mockMvc.perform(post("/api/workouts")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testWorkout)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void addExerciseSet_ShouldAddSet() throws Exception {
        // Given
        when(workoutService.addExerciseSet(anyLong(), anyLong(), any())).thenReturn(testWorkout);

        String requestBody = """
            {
                "exerciseId": 1,
                "setNumber": 1,
                "reps": 10,
                "weightKg": 60.0
            }
            """;

        // When & Then
        mockMvc.perform(post("/api/workouts/1/sets")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk());
    }

    @Test
    void deleteWorkout_ShouldDelete() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/workouts/1").with(csrf()))
                .andExpect(status().isOk());

        verify(workoutService).deleteWorkout(1L);
    }

    @Test
    void getExercises_ShouldReturnList() throws Exception {
        // Given
        when(workoutService.getAllExercises(any())).thenReturn(Arrays.asList(testExercise));

        // When & Then
        mockMvc.perform(get("/api/workouts/exercises"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Bench Press"));
    }

    @Test
    void searchExercises_ShouldReturnResults() throws Exception {
        // Given
        when(workoutService.searchExercises("bench")).thenReturn(Arrays.asList(testExercise));

        // When & Then
        mockMvc.perform(get("/api/workouts/exercises/search?q=bench"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Bench Press"));
    }

    @Test
    void createCustomExercise_ShouldCreateExercise() throws Exception {
        // Given
        when(workoutService.createCustomExercise(any(), any())).thenReturn(testExercise);

        // When & Then
        mockMvc.perform(post("/api/workouts/exercises")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testExercise)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Bench Press"));
    }

    @Test
    void getStats_ShouldReturnStats() throws Exception {
        // Given
        Map<String, Object> stats = Map.of(
                "totalWorkouts", 10,
                "thisWeek", 3,
                "thisMonth", 8
        );
        when(workoutService.getWorkoutStats(any())).thenReturn(stats);

        // When & Then
        mockMvc.perform(get("/api/workouts/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalWorkouts").value(10))
                .andExpect(jsonPath("$.thisWeek").value(3));
    }
}