-- Add exercise library and workout logging tables

-- Exercise library
CREATE TABLE exercises (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(20) NOT NULL,
    primary_muscle_group VARCHAR(20) NOT NULL,
    secondary_muscle_group VARCHAR(20),
    description TEXT,
    video_url VARCHAR(255),
    image_url VARCHAR(255),
    is_custom BOOLEAN DEFAULT FALSE,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workout logs
CREATE TABLE workout_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_date DATE NOT NULL,
    notes TEXT,
    duration_minutes INTEGER,
    calories_burned INTEGER,
    rating DECIMAL(2,1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual sets within a workout
CREATE TABLE exercise_sets (
    id BIGSERIAL PRIMARY KEY,
    workout_log_id BIGINT NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
    exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    reps INTEGER,
    weight_kg DECIMAL(8, 2),
    duration_seconds INTEGER,
    notes TEXT,
    completed BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_exercises_muscle ON exercises(primary_muscle_group);
CREATE INDEX idx_exercises_custom ON exercises(is_custom, created_by);
CREATE INDEX idx_workouts_user ON workout_logs(user_id);
CREATE INDEX idx_workouts_date ON workout_logs(workout_date);
CREATE INDEX idx_sets_workout ON exercise_sets(workout_log_id);
CREATE INDEX idx_sets_exercise ON exercise_sets(exercise_id);

-- Seed exercises (common exercises)
INSERT INTO exercises (name, category, primary_muscle_group, is_custom) VALUES
-- Chest
('Bench Press', 'STRENGTH', 'CHEST', FALSE),
('Incline Bench Press', 'STRENGTH', 'CHEST', FALSE),
('Dumbbell Flyes', 'STRENGTH', 'CHEST', FALSE),
('Push-ups', 'STRENGTH', 'CHEST', FALSE),
-- Back
('Deadlift', 'STRENGTH', 'BACK', FALSE),
('Pull-ups', 'STRENGTH', 'BACK', FALSE),
('Barbell Row', 'STRENGTH', 'BACK', FALSE),
('Lat Pulldown', 'STRENGTH', 'BACK', FALSE),
-- Shoulders
('Overhead Press', 'STRENGTH', 'SHOULDERS', FALSE),
('Lateral Raises', 'STRENGTH', 'SHOULDERS', FALSE),
('Front Raises', 'STRENGTH', 'SHOULDERS', FALSE),
-- Arms
('Bicep Curls', 'STRENGTH', 'BICEPS', FALSE),
('Tricep Extensions', 'STRENGTH', 'TRICEPS', FALSE),
('Hammer Curls', 'STRENGTH', 'BICEPS', FALSE),
-- Legs
('Squats', 'STRENGTH', 'QUADRICEPS', FALSE),
('Leg Press', 'STRENGTH', 'QUADRICEPS', FALSE),
('Romanian Deadlift', 'STRENGTH', 'HAMSTRINGS', FALSE),
('Leg Curls', 'STRENGTH', 'HAMSTRINGS', FALSE),
('Calf Raises', 'STRENGTH', 'CALVES', FALSE),
('Lunges', 'STRENGTH', 'QUADRICEPS', FALSE),
-- Core
('Plank', 'STRENGTH', 'ABS', FALSE),
('Crunches', 'STRENGTH', 'ABS', FALSE),
('Russian Twists', 'STRENGTH', 'OBLIQUES', FALSE),
('Leg Raises', 'STRENGTH', 'ABS', FALSE),
-- Cardio
('Treadmill Running', 'CARDIO', 'CARDIO', FALSE),
('Stationary Bike', 'CARDIO', 'CARDIO', FALSE),
('Rowing Machine', 'CARDIO', 'BACK', FALSE),
('Elliptical', 'CARDIO', 'CARDIO', FALSE);