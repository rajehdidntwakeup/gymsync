package com.gymsync.controller;

import com.gymsync.model.User;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(Principal principal) {
        // TODO: Implement
        return ResponseEntity.ok(Map.of(
            "username", principal.getName(),
            "name", "Test User",
            "fitnessLevel", "INTERMEDIATE"
        ));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(@RequestBody User user, Principal principal) {
        // TODO: Implement
        return ResponseEntity.ok(user);
    }

    @GetMapping("/fitness-levels")
    public ResponseEntity<List<String>> getFitnessLevels() {
        return ResponseEntity.ok(List.of("BEGINNER", "INTERMEDIATE", "ADVANCED"));
    }

    @PostMapping("/schedule")
    public ResponseEntity<?> setSchedule(@RequestBody Map<String, Object> request, Principal principal) {
        // TODO: Implement
        return ResponseEntity.ok(request);
    }

    @GetMapping("/schedule")
    public ResponseEntity<?> getSchedule(Principal principal) {
        // TODO: Implement
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/buddies")
    public ResponseEntity<?> findBuddies(
            @RequestParam String gymLocation,
            @RequestParam String fitnessLevel,
            Principal principal) {
        // TODO: Implement
        return ResponseEntity.ok(List.of());
    }
}