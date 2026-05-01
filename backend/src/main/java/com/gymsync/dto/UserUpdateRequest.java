package com.gymsync.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public class UserUpdateRequest {
    
    @Size(max = 50)
    private String name;

    @Email
    @Size(max = 100)
    private String email;

    private String fitnessLevel;

    @Size(max = 100)
    private String gymLocation;

    private String workoutGoals;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFitnessLevel() { return fitnessLevel; }
    public void setFitnessLevel(String fitnessLevel) { this.fitnessLevel = fitnessLevel; }
    public String getGymLocation() { return gymLocation; }
    public void setGymLocation(String gymLocation) { this.gymLocation = gymLocation; }
    public String getWorkoutGoals() { return workoutGoals; }
    public void setWorkoutGoals(String workoutGoals) { this.workoutGoals = workoutGoals; }
}