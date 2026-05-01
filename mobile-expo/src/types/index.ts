// User types
export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  fitnessLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  gymLocation?: string;
  workoutGoals?: string;
  availableSlots?: TimeSlot[];
}

export interface TimeSlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

// Gym types
export interface Gym {
  id: number;
  name: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  monthlyPrice?: number;
  studentDiscount?: number;
  openingHours?: string;
  hasStudentDiscount: boolean;
}

// Auth types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  name: string;
  username: string;
  email: string;
  password: string;
  fitnessLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  gymLocation?: string;
  workoutGoals?: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  userId: number;
  username: string;
}

// Workout types
export interface Exercise {
  id: number;
  name: string;
  category: string;            // ExerciseCategory enum as string
  primaryMuscleGroup: string;  // MuscleGroup enum as string
  secondaryMuscleGroup?: string;
  description?: string;
  isCustom: boolean;
}

export interface ExerciseSet {
  id: number;
  exerciseId: number;
  exerciseName?: string;  // populated from exercise.name via join
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  notes: string | null;
  completed: boolean;
}

export interface WorkoutLog {
  id: number;
  workoutDate: string;
  notes: string | null;
  durationMinutes: number | null;
  caloriesBurned: number | null;
  rating: number | null;
  exerciseSets: ExerciseSet[];
  createdAt: string;
}

// Chat types
export interface ChatMessage {
  id: number;
  senderUsername: string;
  receiverUsername: string;
  content: string;
  timestamp: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE' | 'TYPING';
  read: boolean;
}

export interface TypingNotification {
  username: string;
  typing: boolean;
}

export interface ChatPartner {
  id: number;
  username: string;
  name: string;
  fitnessLevel: string;
}

// Navigation types
export type StackParamList = {
  Main: undefined;
  LogWorkout: undefined;
  Login: undefined;
  Register: undefined;
  WorkoutDetail: { workoutId: number };
};