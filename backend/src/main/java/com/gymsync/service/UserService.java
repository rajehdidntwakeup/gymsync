package com.gymsync.service;

import com.gymsync.model.User;
import com.gymsync.model.TimeSlot;
import com.gymsync.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    @Transactional
    public User updateProfile(String username, User updateData) {
        User user = getUserByUsername(username);
        user.setName(updateData.getName());
        user.setFitnessLevel(updateData.getFitnessLevel());
        user.setGymLocation(updateData.getGymLocation());
        user.setWorkoutGoals(updateData.getWorkoutGoals());
        return userRepository.save(user);
    }

    @Transactional
    public void setSchedule(String username, Set<TimeSlot> slots) {
        User user = getUserByUsername(username);
        user.getAvailableSlots().clear();
        user.getAvailableSlots().addAll(slots);
        userRepository.save(user);
    }

    public Set<TimeSlot> getSchedule(String username) {
        User user = getUserByUsername(username);
        return user.getAvailableSlots();
    }

    public List<User> findBuddies(String username, String gymLocation, String fitnessLevel) {
        // Simple implementation for now
        return userRepository.findAll().stream()
                .filter(u -> !u.getUsername().equals(username))
                .filter(u -> gymLocation == null || gymLocation.equals(u.getGymLocation()))
                .filter(u -> fitnessLevel == null || fitnessLevel.equals(u.getFitnessLevel().name()))
                .toList();
    }
}
