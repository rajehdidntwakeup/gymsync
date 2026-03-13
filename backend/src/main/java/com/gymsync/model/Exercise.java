package com.gymsync.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Entity
@Table(name = "exercises")
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(unique = true)
    private String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    private ExerciseCategory category;

    @NotNull
    @Enumerated(EnumType.STRING)
    private MuscleGroup primaryMuscleGroup;

    @Enumerated(EnumType.STRING)
    private MuscleGroup secondaryMuscleGroup;

    private String description;
    private String videoUrl;
    private String imageUrl;

    @Column(name = "is_custom")
    private boolean isCustom = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public ExerciseCategory getCategory() { return category; }
    public void setCategory(ExerciseCategory category) { this.category = category; }

    public MuscleGroup getPrimaryMuscleGroup() { return primaryMuscleGroup; }
    public void setPrimaryMuscleGroup(MuscleGroup primaryMuscleGroup) { this.primaryMuscleGroup = primaryMuscleGroup; }

    public MuscleGroup getSecondaryMuscleGroup() { return secondaryMuscleGroup; }
    public void setSecondaryMuscleGroup(MuscleGroup secondaryMuscleGroup) { this.secondaryMuscleGroup = secondaryMuscleGroup; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public boolean isCustom() { return isCustom; }
    public void setCustom(boolean custom) { isCustom = custom; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

enum ExerciseCategory {
    STRENGTH, CARDIO, FLEXIBILITY, BALANCE, PLYOMETRIC
}

public enum MuscleGroup {
    CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, FOREARMS,
    ABS, OBLIQUES, LOWER_BACK,
    QUADRICEPS, HAMSTRINGS, GLUTES, CALVES, ADDUCTORS, ABDUCTORS,
    FULL_BODY, CARDIO
}