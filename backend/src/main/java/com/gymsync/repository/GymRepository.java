package com.gymsync.repository;

import com.gymsync.model.Gym;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GymRepository extends JpaRepository<Gym, Long> {
    List<Gym> findByCityContainingIgnoreCase(String city);
    List<Gym> findByHasStudentDiscountTrue();
}