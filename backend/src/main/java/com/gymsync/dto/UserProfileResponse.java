package com.gymsync.dto;

import com.gymsync.model.FitnessLevel;
import com.gymsync.model.TimeSlot;
import com.gymsync.model.User;

import java.time.LocalDateTime;
import java.util.Set;

public class UserProfileResponse {
    private Long id;
    private String name;
    private String username;
    private String email;
    private FitnessLevel fitnessLevel;
    private String gymLocation;
    private String workoutGoals;
    private Set<TimeSlot> availableSlots;
    private LocalDateTime createdAt;

    public UserProfileResponse() {}

    public UserProfileResponse(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.fitnessLevel = user.getFitnessLevel();
        this.gymLocation = user.getGymLocation();
        this.workoutGoals = user.getWorkoutGoals();
        this.availableSlots = user.getAvailableSlots();
        this.createdAt = user.getCreatedAt();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public FitnessLevel getFitnessLevel() { return fitnessLevel; }
    public void setFitnessLevel(FitnessLevel fitnessLevel) { this.fitnessLevel = fitnessLevel; }
    public String getGymLocation() { return gymLocation; }
    public void setGymLocation(String gymLocation) { this.gymLocation = gymLocation; }
    public String getWorkoutGoals() { return workoutGoals; }
    public void setWorkoutGoals(String workoutGoals) { this.workoutGoals = workoutGoals; }
    public Set<TimeSlot> getAvailableSlots() { return availableSlots; }
    public void setAvailableSlots(Set<TimeSlot> availableSlots) { this.availableSlots = availableSlots; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}