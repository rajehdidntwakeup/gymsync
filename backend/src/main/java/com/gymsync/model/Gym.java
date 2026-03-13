package com.gymsync.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "gyms")
public class Gym {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    private String name;
    
    private String address;
    private String city;
    private Double latitude;
    private Double longitude;
    
    private String phone;
    private String website;
    
    private BigDecimal monthlyPrice;
    private BigDecimal studentDiscount;
    
    private String openingHours;
    private boolean hasStudentDiscount;
    
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
    
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    
    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }
    
    public BigDecimal getMonthlyPrice() { return monthlyPrice; }
    public void setMonthlyPrice(BigDecimal price) { this.monthlyPrice = price; }
    
    public BigDecimal getStudentDiscount() { return studentDiscount; }
    public void setStudentDiscount(BigDecimal discount) { this.studentDiscount = discount; }
    
    public String getOpeningHours() { return openingHours; }
    public void setOpeningHours(String hours) { this.openingHours = hours; }
    
    public boolean isHasStudentDiscount() { return hasStudentDiscount; }
    public void setHasStudentDiscount(boolean discount) { this.hasStudentDiscount = discount; }
}