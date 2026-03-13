package com.gymsync.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Size(max = 50)
    private String name;
    
    @NotBlank
    @Size(max = 50)
    private String username;
    
    @NotBlank
    @Size(max = 100)
    @jakarta.validation.constraints.Email
    private String email;
    
    @NotBlank
    @Size(max = 120)
    private String password;
    
    @Enumerated(EnumType.STRING)
    private FitnessLevel fitnessLevel;
    
    private String gymLocation;
    private String workoutGoals;
    
    @ElementCollection
    @CollectionTable(name = "user_schedule", joinColumns = @JoinColumn(name = "user_id"))
    private Set<TimeSlot> availableSlots = new HashSet<>();
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    public FitnessLevel getFitnessLevel() { return fitnessLevel; }
    public void setFitnessLevel(FitnessLevel fitnessLevel) { this.fitnessLevel = fitnessLevel; }
    
    public String getGymLocation() { return gymLocation; }
    public void setGymLocation(String gymLocation) { this.gymLocation = gymLocation; }
    
    public String getWorkoutGoals() { return workoutGoals; }
    public void setWorkoutGoals(String workoutGoals) { this.workoutGoals = workoutGoals; }
    
    public Set<TimeSlot> getAvailableSlots() { return availableSlots; }
    public void setAvailableSlots(Set<TimeSlot> slots) { this.availableSlots = slots; }
}