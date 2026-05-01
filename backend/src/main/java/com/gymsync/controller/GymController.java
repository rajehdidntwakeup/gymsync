package com.gymsync.controller;

import com.gymsync.model.Gym;
import com.gymsync.repository.GymRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gyms")
public class GymController {

    private final GymRepository gymRepository;

    public GymController(GymRepository gymRepository) {
        this.gymRepository = gymRepository;
    }

    @GetMapping
    public List<Gym> getAllGyms() {
        return gymRepository.findAll();
    }

    @GetMapping("/search")
    public List<Gym> searchByCity(@RequestParam String city) {
        return gymRepository.findByCityContainingIgnoreCase(city);
    }

    @GetMapping("/student-discount")
    public List<Gym> getStudentDiscountGyms() {
        return gymRepository.findByHasStudentDiscountTrue();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Gym> getGym(@PathVariable Long id) {
        return gymRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new RuntimeException("Gym not found"));
    }
}