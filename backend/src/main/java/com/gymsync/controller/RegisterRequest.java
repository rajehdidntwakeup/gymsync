package com.gymsync.controller;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank
    @Size(max = 50)
    private String name;

    @NotBlank
    @Size(max = 50)
    private String username;

    @NotBlank
    @Size(max = 100)
    @Email
    private String email;

    @NotBlank
    @Size(min = 6, max = 120)
    private String password;

    private String fitnessLevel;
    private String gymLocation;
    private String workoutGoals;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFitnessLevel() { return fitnessLevel; }
    public void setFitnessLevel(String fitnessLevel) { this.fitnessLevel = fitnessLevel; }

    public String getGymLocation() { return gymLocation; }
    public void setGymLocation(String gymLocation) { this.gymLocation = gymLocation; }

    public String getWorkoutGoals() { return workoutGoals; }
    public void setWorkoutGoals(String workoutGoals) { this.workoutGoals = workoutGoals; }
}