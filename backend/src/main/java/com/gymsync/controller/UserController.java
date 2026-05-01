package com.gymsync.controller;

import com.gymsync.dto.UserProfileResponse;
import com.gymsync.dto.UserUpdateRequest;
import com.gymsync.model.TimeSlot;
import com.gymsync.model.User;
import com.gymsync.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    private String getUsername(Principal principal) {
        return principal != null ? principal.getName() : "anonymous";
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(Principal principal) {
        String username = getUsername(principal);
        User user = userService.getUserByUsername(username);
        return ResponseEntity.ok(new UserProfileResponse(user));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @Valid @RequestBody UserUpdateRequest req, Principal principal) {
        String username = getUsername(principal);
        User updated = userService.updateProfile(username, req);
        return ResponseEntity.ok(new UserProfileResponse(updated));
    }

    @GetMapping("/fitness-levels")
    public ResponseEntity<List<String>> getFitnessLevels() {
        return ResponseEntity.ok(List.of("BEGINNER", "INTERMEDIATE", "ADVANCED"));
    }

    @PostMapping("/schedule")
    public ResponseEntity<?> setSchedule(@RequestBody Map<String, List<Map<String, String>>> request, Principal principal) {
        String username = getUsername(principal);
        List<Map<String, String>> slotsData = request.get("slots");
        Set<TimeSlot> slots = new java.util.HashSet<>();
        if (slotsData != null) {
            for (Map<String, String> slotMap : slotsData) {
                slots.add(new TimeSlot(
                    slotMap.get("dayOfWeek"),
                    slotMap.get("startTime"),
                    slotMap.get("endTime")
                ));
            }
        }
        userService.setSchedule(username, slots);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/schedule")
    public ResponseEntity<?> getSchedule(Principal principal) {
        String username = getUsername(principal);
        return ResponseEntity.ok(userService.getSchedule(username));
    }

    @GetMapping("/buddies")
    public ResponseEntity<?> findBuddies(
            @RequestParam(required = false) String gymLocation,
            @RequestParam(required = false) String fitnessLevel,
            Principal principal) {
        String username = getUsername(principal);
        List<User> buddies = userService.findBuddies(username, gymLocation, fitnessLevel);
        List<UserProfileResponse> dtos = buddies.stream()
                .map(UserProfileResponse::new)
                .toList();
        return ResponseEntity.ok(dtos);
    }
}