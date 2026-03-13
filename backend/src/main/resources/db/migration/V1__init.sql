-- Initial schema for GymSync

-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(120) NOT NULL,
    fitness_level VARCHAR(20),
    gym_location VARCHAR(255),
    workout_goals TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gyms table
CREATE TABLE gyms (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    city VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone VARCHAR(20),
    website VARCHAR(255),
    monthly_price DECIMAL(10, 2),
    student_discount DECIMAL(10, 2),
    opening_hours TEXT,
    has_student_discount BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User schedule availability
CREATE TABLE user_schedule (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL,
    start_time VARCHAR(5) NOT NULL,
    end_time VARCHAR(5) NOT NULL
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_gyms_city ON gyms(city);
CREATE INDEX idx_gyms_discount ON gyms(has_student_discount);
CREATE INDEX idx_schedule_user ON user_schedule(user_id);