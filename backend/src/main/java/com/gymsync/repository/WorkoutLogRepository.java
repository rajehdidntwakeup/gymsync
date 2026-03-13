package com.gymsync.repository;

import com.gymsync.model.User;
import com.gymsync.model.WorkoutLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WorkoutLogRepository extends JpaRepository<WorkoutLog, Long> {
    
    List<WorkoutLog> findByUserOrderByWorkoutDateDesc(User user);
    
    List<WorkoutLog> findByUserAndWorkoutDateBetweenOrderByWorkoutDateDesc(
            User user, LocalDate start, LocalDate end);
    
    @Query("SELECT wl FROM WorkoutLog wl WHERE wl.user = :user AND wl.workoutDate = :date")
    List<WorkoutLog> findByUserAndWorkoutDate(@Param("user") User user, @Param("date") LocalDate date);
    
    @Query("SELECT COUNT(wl) FROM WorkoutLog wl WHERE wl.user = :user AND wl.workoutDate BETWEEN :start AND :end")
    Long countWorkoutsInDateRange(@Param("user") User user, 
                                   @Param("start") LocalDate start, 
                                   @Param("end") LocalDate end);
    
    @Query("SELECT wl FROM WorkoutLog wl LEFT JOIN FETCH wl.exerciseSets WHERE wl.id = :id")
    WorkoutLog findByIdWithExerciseSets(@Param("id") Long id);
}