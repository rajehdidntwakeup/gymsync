package com.gymsync.model;

import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.Pattern;

@Embeddable
public class TimeSlot {
    @Pattern(regexp = "MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY",
             message = "dayOfWeek must be a valid day name")
    private String dayOfWeek;

    @Pattern(regexp = "\\d{2}:\\d{2}", message = "startTime must be in HH:mm format")
    private String startTime;

    @Pattern(regexp = "\\d{2}:\\d{2}", message = "endTime must be in HH:mm format")
    private String endTime;

    public TimeSlot() {}

    public TimeSlot(String dayOfWeek, String startTime, String endTime) {
        this.dayOfWeek = dayOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TimeSlot timeSlot = (TimeSlot) o;
        return java.util.Objects.equals(dayOfWeek, timeSlot.dayOfWeek) &&
               java.util.Objects.equals(startTime, timeSlot.startTime) &&
               java.util.Objects.equals(endTime, timeSlot.endTime);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(dayOfWeek, startTime, endTime);
    }

    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }
    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }
    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
}