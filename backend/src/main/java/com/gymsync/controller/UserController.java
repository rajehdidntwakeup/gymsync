package com.gymsync.controller;

import com.gymsync.model.User;
import com.gymsync.model.TimeSlot;
import com.gymsync.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    private String getUsername(Principal principal) {
        return principal != null ? principal.getName() : "anonymous";
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(Principal principal) {
        String username = getUsername(principal);
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(@RequestBody User user, Principal principal) {
        String username = getUsername(principal);
        return ResponseEntity.ok(userService.updateProfile(username, user));
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
        return ResponseEntity.ok(userService.findBuddies(username, gymLocation, fitnessLevel));
    }
}