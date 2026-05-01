package com.gymsync.service;

import com.gymsync.dto.UserUpdateRequest;
import com.gymsync.model.User;
import com.gymsync.model.TimeSlot;
import com.gymsync.model.FitnessLevel;
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
    public User updateProfile(String username, UserUpdateRequest req) {
        User user = getUserByUsername(username);
        if (req.getName() != null) user.setName(req.getName());
        if (req.getEmail() != null) user.setEmail(req.getEmail());
        if (req.getFitnessLevel() != null) user.setFitnessLevel(FitnessLevel.valueOf(req.getFitnessLevel()));
        if (req.getGymLocation() != null) user.setGymLocation(req.getGymLocation());
        if (req.getWorkoutGoals() != null) user.setWorkoutGoals(req.getWorkoutGoals());
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
        if (gymLocation != null && fitnessLevel != null) {
            FitnessLevel level = FitnessLevel.valueOf(fitnessLevel);
            return userRepository.findByGymLocationAndFitnessLevelAndUsernameNot(gymLocation, level, username);
        } else if (gymLocation != null) {
            return userRepository.findByGymLocationAndUsernameNot(gymLocation, username);
        } else if (fitnessLevel != null) {
            FitnessLevel level = FitnessLevel.valueOf(fitnessLevel);
            return userRepository.findByFitnessLevelAndUsernameNot(level, username);
        }
        return userRepository.findByUsernameNot(username);
    }
}
