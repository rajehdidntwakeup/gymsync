package com.gymsync.model;

import jakarta.persistence.Embeddable;

@Embeddable
public class TimeSlot {
    private String dayOfWeek;
    private String startTime;
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