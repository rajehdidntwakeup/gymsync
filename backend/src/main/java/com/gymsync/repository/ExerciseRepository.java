package com.gymsync.repository;

import com.gymsync.model.Exercise;
import com.gymsync.model.MuscleGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExerciseRepository extends JpaRepository<Exercise, Long> {
    
    List<Exercise> findByNameContainingIgnoreCase(String name);
    
    List<Exercise> findByPrimaryMuscleGroup(MuscleGroup muscleGroup);
    
    List<Exercise> findByIsCustomFalse();
    
    @Query("SELECT e FROM Exercise e WHERE e.isCustom = true AND e.createdBy.id = :userId")
    List<Exercise> findCustomExercisesByUser(Long userId);
    
    @Query("SELECT e FROM Exercise e WHERE e.isCustom = false OR (e.isCustom = true AND e.createdBy.id = :userId)")
    List<Exercise> findAllAvailableForUser(Long userId);
}