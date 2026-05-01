# GymSync Fix Plan

> A step-by-step guide to fixing every issue identified in the project analysis.
> Organized into 6 phases by priority — each phase builds on the previous one.
> 
> **Last updated:** 2026-05-01 — verified against actual codebase state after Phase 1 implementation.

---

## Phase 1: Critical — Authentication & Security ✅ COMPLETED

> **Goal:** Make login work end-to-end and stop leaking passwords.

### Step 1.1: Create JWT Utility Class ✅

**File:** `backend/src/main/java/com/gymsync/security/JwtUtil.java` (NEW) — **DONE**

Implemented with jjwt 0.12.3. Uses `Jwts.parser()` (not deprecated `parserBuilder()`).

### Step 1.2: Make User Entity Implement UserDetails ✅

**File:** `backend/src/main/java/com/gymsync/model/User.java` — **DONE**

- `implements UserDetails` ✅
- `@JsonIgnore` on `getPassword()`, `getAuthorities()`, `isAccountNonExpired()`, `isAccountNonLocked()`, `isCredentialsNonExpired()`, `isEnabled()` ✅
- `getAuthorities()` returns `Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))` ✅

### Step 1.3: Create Custom UserDetailsService ✅

**File:** `backend/src/main/java/com/gymsync/security/CustomUserDetailsService.java` — **DONE**

### Step 1.4: Create JWT Authentication Filter ✅

**File:** `backend/src/main/java/com/gymsync/security/JwtAuthenticationFilter.java` — **DONE**

### Step 1.5: Wire JWT Filter into SecurityConfig ✅

**File:** `backend/src/main/java/com/gymsync/config/SecurityConfig.java` — **DONE**

JWT filter chain configured with:
- `/api/auth/**` — permitAll
- `/api/gyms` — permitAll
- `/api/workouts/exercises` — permitAll
- `/ws/**` — permitAll
- Everything else — authenticated

### Step 1.6: Implement Login Endpoint ✅

**File:** `backend/src/main/java/com/gymsync/controller/AuthController.java` — **DONE**

Uses `RegisterRequest` DTO (not raw `User`) for registration, `LoginRequest` DTO for login. `@Valid` on register.

### Step 1.7: Create Global CORS and Error Handling ✅

**File:** `backend/src/main/java/com/gymsync/config/CorsConfig.java` — **DONE**
**File:** `backend/src/main/java/com/gymsync/exception/GlobalExceptionHandler.java` — **DONE**

All `@CrossOrigin("*")` annotations removed from controllers.

### Step 1.8: Fix Mobile Auth Flow ✅

**Files:** `mobile-expo/src/services/AuthContext.tsx`, `mobile/src/services/AuthContext.tsx` — **DONE**

JWT token storage, auto-fetch user profile after login, 401 interceptor with auth callback.

### Step 1.9: Fix 401 Interceptor Navigation ✅

**Files:** `mobile-expo/src/services/api.ts`, `mobile/src/services/api.ts` — **DONE**

---

## Phase 2: High — Backend Stubs & Data Integrity

> **Goal:** Replace all hardcoded/fake data with real database queries, add ownership checks, DTOs, and GymController.

### Step 2.1: Update UserService ~~(Create)~~ ⚠️ ALREADY EXISTS — NEEDS FIXES

**File:** `backend/src/main/java/com/gymsync/service/UserService.java` (MODIFY)

`UserService` already exists but needs these fixes:

1. **`updateProfile` doesn't update `email`** — add `user.setEmail(updateData.getEmail())` (the plan originally included this but the current implementation skipped it)
2. **`findBuddies` uses in-memory filter** `userRepository.findAll().stream().filter(...)` — replace with a proper database query for performance

**Changes:**
```java
// In updateProfile(), add email update:
@Transactional
public User updateProfile(String username, User updateData) {
    User user = getUserByUsername(username);
    user.setName(updateData.getName());
    user.setEmail(updateData.getEmail());           // ADD THIS
    user.setFitnessLevel(updateData.getFitnessLevel());
    user.setGymLocation(updateData.getGymLocation());
    user.setWorkoutGoals(updateData.getWorkoutGoals());
    return userRepository.save(user);
}

// Replace findBuddies with DB query (requires Step 2.2 repository methods):
public List<User> findBuddies(String username, String gymLocation, String fitnessLevel) {
    if (gymLocation != null && fitnessLevel != null) {
        FitnessLevel level = FitnessLevel.valueOf(fitnessLevel);
        return userRepository.findByGymLocationAndFitnessLevelAndUsernameNot(gymLocation, level, username);
    } else if (gymLocation != null) {
        return userRepository.findByGymLocationAndUsernameNot(gymLocation, username);
    } else if (fitnessLevel != null) {
        FitnessLevel level = FitnessLevel.valueOf(fitnessLevel);
        return userRepository.findByFitnessLevelAndUsernameNot(level, username);
    }
    return userRepository.findByUsernameNot(username);
}
```

---

### Step 2.2: Add Missing Repository Methods

**File:** `backend/src/main/java/com/gymsync/repository/UserRepository.java` (MODIFY)

Add these methods for the `findBuddies` DB query:

```java
List<User> findByGymLocationAndFitnessLevelAndUsernameNot(String gymLocation, FitnessLevel fitnessLevel, String username);
List<User> findByGymLocationAndUsernameNot(String gymLocation, String username);
List<User> findByFitnessLevelAndUsernameNot(FitnessLevel fitnessLevel, String username);
List<User> findByUsernameNot(String username);
```

**Note:** The `GymRepository` already has `findByCityContainingIgnoreCase` and `findByHasStudentDiscountTrue` ✅

---

### Step 2.3: Update UserController (Partially Done)

**File:** `backend/src/main/java/com/gymsync/controller/UserController.java` (MODIFY)

The controller is already rewritten to use `UserService` (was done during Phase 1). Remaining fixes:

1. **Add `@Valid` on `updateProfile` `@RequestBody`**:
```java
@PutMapping("/me")
public ResponseEntity<?> updateProfile(@Valid @RequestBody UserUpdateRequest user, Principal principal) {
```
   Note: Uses `UserUpdateRequest` DTO from Step 2.7 once created. Until then, add `@Valid` to the current `@RequestBody User user`.

2. **Return `UserProfileResponse` instead of raw `User`** once DTOs are created (Step 2.7).

Current state doesn't need a full rewrite — just these incremental fixes.

---

### Step 2.4: Fix findByIdWithExerciseSets NPE ✅ ALREADY FIXED

**File:** `backend/src/main/java/com/gymsync/repository/WorkoutLogRepository.java` — **ALREADY RETURNS `Optional<WorkoutLog>`**

**File:** `backend/src/main/java/com/gymsync/service/WorkoutServiceImpl.java` — **ALREADY USES `.orElseThrow()`**

No changes needed. Skip this step.

---

### Step 2.5: Add Ownership Checks to WorkoutController

**File:** `backend/src/main/java/com/gymsync/controller/WorkoutController.java` (MODIFY)

Add a private method and call it in `getWorkout`, `deleteWorkout`, and `addExerciseSet`:

```java
private void verifyOwnership(WorkoutLog workout, String username) {
    if (!workout.getUser().getUsername().equals(username)) {
        throw new RuntimeException("You can only access your own workouts");
    }
}
```

Apply in these endpoints:
- `getWorkout(@PathVariable Long id, Principal principal)` — add `verifyOwnership(workout, principal.getName())`
- `deleteWorkout(@PathVariable Long id, Principal principal)` — add ownership check before delete
- `addExerciseSet(@PathVariable Long workoutId, ..., Principal principal)` — add ownership check

**Also remove all `"testuser"` fallbacks** (5 occurrences at lines 28, 41, 70, 85, 93):
```java
// BEFORE:
String username = principal != null ? principal.getName() : "testuser";

// AFTER:
String username = principal.getName();
```

The JWT filter ensures `principal` is never null for secured endpoints.

---

### Step 2.6: Add @Valid to All @RequestBody Parameters

**Files to modify:**

| File | Method | Current | Change To |
|------|--------|---------|-----------|
| `WorkoutController.java` | `createWorkout` | `@RequestBody WorkoutLog` | `@RequestBody @Valid WorkoutLog` |
| `WorkoutController.java` | `addExerciseSet` (AddSetRequest) | `@RequestBody AddSetRequest` | `@RequestBody @Valid AddSetRequest` |
| `WorkoutController.java` | `createCustomExercise` | `@RequestBody Exercise` | `@RequestBody @Valid Exercise` |
| `AuthController.java` | `register` | `@Valid @RequestBody RegisterRequest` | ✅ Already done |
| `ChatController.java` | `sendMessage` / `sendTyping` | N/A | These are `@MessageMapping` (WebSocket), not REST — `@Valid` doesn't apply the same way. Skip. |

**Note:** For `@Valid` on `AddSetRequest`, add validation annotations to that inner class:
```java
public static class AddSetRequest {
    @NotNull
    private Long exerciseId;
    @NotNull @Positive
    private Integer setNumber;
    private Integer reps;
    private Double weightKg;
    private String notes;
    // ... getters/setters already exist
}
```

---

### Step 2.7: Create DTO Layer for User (Password Leak Prevention Part 2)

**File:** `backend/src/main/java/com/gymsync/dto/UserProfileResponse.java` (NEW)

```java
package com.gymsync.dto;

import com.gymsync.model.TimeSlot;
import com.gymsync.model.FitnessLevel;
import java.time.LocalDateTime;
import java.util.Set;

public class UserProfileResponse {
    private Long id;
    private String name;
    private String username;
    private String email;
    private FitnessLevel fitnessLevel;
    private String gymLocation;
    private String workoutGoals;
    private Set<TimeSlot> availableSlots;
    private LocalDateTime createdAt;
    // NO password field

    // Constructor from User entity
    public UserProfileResponse(com.gymsync.model.User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.fitnessLevel = user.getFitnessLevel();
        this.gymLocation = user.getGymLocation();
        this.workoutGoals = user.getWorkoutGoals();
        this.availableSlots = user.getAvailableSlots();
        this.createdAt = user.getCreatedAt();
    }

    // getters
}
```

**File:** `backend/src/main/java/com/gymsync/dto/UserUpdateRequest.java` (NEW)

```java
package com.gymsync.dto;

public class UserUpdateRequest {
    private String name;
    private String email;
    private String fitnessLevel;  // String for flexible parsing
    private String gymLocation;
    private String workoutGoals;
    // NO id, username, password fields

    // getters and setters
}
```

**Then update `UserService.updateProfile()`** to accept `UserUpdateRequest` instead of `User`:
```java
public User updateProfile(String username, UserUpdateRequest req) {
    User user = getUserByUsername(username);
    if (req.getName() != null) user.setName(req.getName());
    if (req.getEmail() != null) user.setEmail(req.getEmail());
    if (req.getFitnessLevel() != null) user.setFitnessLevel(FitnessLevel.valueOf(req.getFitnessLevel()));
    if (req.getGymLocation() != null) user.setGymLocation(req.getGymLocation());
    if (req.getWorkoutGoals() != null) user.setWorkoutGoals(req.getWorkoutGoals());
    return userRepository.save(user);
}
```

**Then update `UserController`** to return `UserProfileResponse` from `getMyProfile()` and `findBuddies()`:
```java
@GetMapping("/me")
public ResponseEntity<UserProfileResponse> getMyProfile(Principal principal) {
    User user = userService.getUserByUsername(principal.getName());
    return ResponseEntity.ok(new UserProfileResponse(user));
}
```

---

### Step 2.8: Create GymController

**File:** `backend/src/main/java/com/gymsync/controller/GymController.java` (NEW)

```java
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
```

**Note:** `GymRepository` already has `findByCityContainingIgnoreCase` and `findByHasStudentDiscountTrue` ✅

**Also ensure `SecurityConfig` permits `/api/gyms/**`** — it already has `.requestMatchers("/api/gyms").permitAll()` but should match sub-paths too. Verify the pattern includes `/api/gyms/search`, `/api/gyms/student-discount`, `/api/gyms/{id}`:
```java
// In SecurityConfig, change:
.requestMatchers("/api/gyms").permitAll()
// To:
.requestMatchers("/api/gyms/**").permitAll()
```

---

## Phase 3: High — Mobile App Fixes

> **Goal:** Make the mobile app functional with the real backend.

### Step 3.1: Fix WorkoutLog Type Mismatch

**File:** `mobile-expo/src/types/index.ts` (MODIFY)

Replace the current `WorkoutLog` interface:

```typescript
// BEFORE (broken):
export interface WorkoutLog {
  id: number;
  exerciseId: number;
  exerciseName: string;
  sets: WorkoutSet[];
  date: string;
}

// AFTER (matching backend WorkoutLog entity):
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
```

Also add `ExerciseSet` to match the backend:

```typescript
export interface ExerciseSet {
  id: number;
  exerciseId: number;      // references Exercise.id
  exerciseName?: string;   // populated from join (backend ExerciseSet.exercise.name)
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  notes: string | null;
  completed: boolean;
}
```

**Note:** Backend `ExerciseSet` uses `Exercise exercise` (ManyToOne EAGER), so the backend serializes it as a nested object. The mobile `ExerciseSet` type needs to handle this — either:
- Request the backend to add `@JsonIgnore` on `ExerciseSet.exercise` and `@Transient exerciseName` field, OR
- Adapt the mobile type to expect `{ exercise: { id, name, ... } }` instead of flat `exerciseId`/`exerciseName`

Fix `Exercise` interface:

```typescript
// BEFORE:
export interface Exercise {
  id: number;
  name: string;
  category: string;
  muscleGroup: string;  // wrong — backend uses primaryMuscleGroup (enum)
}

// AFTER (matching backend Exercise entity):
export interface Exercise {
  id: number;
  name: string;
  category: string;            // ExerciseCategory enum: STRENGTH, CARDIO, etc.
  primaryMuscleGroup: string;  // MuscleGroup enum: CHEST, BACK, etc.
  secondaryMuscleGroup?: string;
  description?: string;
  isCustom: boolean;
}
```

**Also apply to:** `mobile/src/types/index.ts`

---

### Step 3.2: Add WorkoutDetail Screen

**File:** `mobile-expo/src/screens/WorkoutDetailScreen.tsx` (NEW)

Create a screen that displays workout details (date, duration, calories, notes, exercise sets). Navigation from WorkoutsScreen already points to `'WorkoutDetail'`.

**File:** `mobile-expo/src/App.tsx` (MODIFY) — add to the Stack.Navigator:

```typescript
<Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
```

**Also apply to:** `mobile/App.tsx`

---

### Step 3.3: Fix ChatScreen WebSocket Connection Leak

**File:** `mobile-expo/src/screens/ChatScreen.tsx` (MODIFY)

In the `useEffect` for `selectedPartner`, disconnect the previous connection before connecting a new one:

```typescript
useEffect(() => {
  if (selectedPartner) {
    chatSocket.disconnect();  // disconnect previous
    connectSocket();
    loadHistory();
  }
  return () => {
    chatSocket.disconnect();
  };
}, [selectedPartner]);
```

**Also apply to:** `mobile/src/screens/ChatScreen.tsx`

---

### Step 3.4: Add Error Display to Login & Register Screens

**File:** `mobile-expo/src/screens/LoginScreen.tsx` (MODIFY)

Add error state and display:
```typescript
const [error, setError] = useState('');

const handleLogin = async () => {
  try {
    setError('');
    await login({ username, password });
  } catch (err) {
    setError('Invalid username or password');
  }
};

// In the JSX, add above the Button:
{error ? <Text style={styles.error}>{error}</Text> : null}
```

**Apply the same pattern to:** `RegisterScreen.tsx`, `WorkoutsScreen.tsx`, `ChatScreen.tsx`

Add `styles.error: { color: 'red', textAlign: 'center', marginBottom: 10 }` to each screen.

---

### Step 3.5: Add Form Validation to Login & Register

**File:** `mobile-expo/src/screens/LoginScreen.tsx` (MODIFY)

```typescript
const handleLogin = async () => {
  if (!username.trim()) { setError('Username is required'); return; }
  if (!password.trim()) { setError('Password is required'); return; }
  // ... proceed with login
};
```

**File:** `mobile-expo/src/screens/RegisterScreen.tsx` (MODIFY)

```typescript
const handleRegister = async () => {
  if (!form.name.trim()) { setError('Name is required'); return; }
  if (!form.username.trim()) { setError('Username is required'); return; }
  if (!form.email.includes('@')) { setError('Valid email is required'); return; }
  if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
  // ... proceed with register
};
```

---

### Step 3.6: Add Fitness Level Picker to RegisterScreen

**File:** `mobile-expo/src/screens/RegisterScreen.tsx` (MODIFY)

Replace the hardcoded `fitnessLevel: 'BEGINNER'` with a picker:

```typescript
import { Picker } from '@react-native-picker/picker';

// In the JSX, add below the password input:
<Picker
  selectedValue={form.fitnessLevel}
  onValueChange={(value) => setForm({ ...form, fitnessLevel: value })}
>
  <Picker.Item label="Beginner" value="BEGINNER" />
  <Picker.Item label="Intermediate" value="INTERMEDIATE" />
  <Picker.Item label="Advanced" value="ADVANCED" />
</Picker>
```

**Install dependency:** `npm install @react-native-picker/picker`

---

### Step 3.7: Build Profile Screen

**File:** `mobile-expo/src/screens/ProfileScreen.tsx` (MODIFY)

Replace the placeholder with a real profile display and edit capability:

```typescript
export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);

  if (!user) return null;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.username}>@{user.username}</Text>
      <Text style={styles.email}>{user.email}</Text>
      <Text style={styles.label}>Fitness Level: {user.fitnessLevel}</Text>
      {user.gymLocation && <Text>Gym: {user.gymLocation}</Text>}
      {user.workoutGoals && <Text>Goals: {user.workoutGoals}</Text>}
      <Button title="Logout" onPress={logout} />
    </ScrollView>
  );
}
```

---

### Step 3.8: Build GymsScreen with Real Data

**File:** `mobile-expo/src/screens/GymsScreen.tsx` (MODIFY)

Replace the placeholder with a list of gyms fetched from the API:

```typescript
const [gyms, setGyms] = useState<Gym[]>([]);
const [search, setSearch] = useState('');

useEffect(() => { loadGyms(); }, []);

const loadGyms = async () => {
  try {
    const response = await api.get('/gyms');
    setGyms(response.data);
  } catch (error) {
    console.error('Failed to load gyms:', error);
  }
};

// Render: search bar + FlatList of gyms with name, city, student discount badge
```

---

### Step 3.9: Build Exercise Picker for LogWorkoutScreen

**File:** `mobile-expo/src/screens/LogWorkoutScreen.tsx` (MODIFY)

Replace the hardcoded "Bench Press" with a real exercise picker:

1. Add state: `const [exercises, setExercises] = useState<Exercise[]>([]);`
2. Fetch exercises on mount: `api.get('/workouts/exercises')`
3. Show a Modal with a searchable list of exercises
4. When an exercise is selected, add it to `sets` with the real `exerciseId` and `exerciseName`

```typescript
const addSet = () => {
  setShowExercisePicker(true);
};

const selectExercise = (exercise: Exercise) => {
  const newSet: ExerciseSet = {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    setNumber: sets.filter(s => s.exerciseId === exercise.id).length + 1,
    reps: '',
    weightKg: '',
  };
  setSets([...sets, newSet]);
  setShowExercisePicker(false);
};
```

---

### Step 3.10: Fix ExerciseSet Default Value

**File:** `backend/src/main/java/com/gymsync/model/ExerciseSet.java` (MODIFY)

Change the default for `completed`:
```java
// BEFORE:
private Boolean completed = true;

// AFTER:
private Boolean completed = false;
```

A newly created exercise set should not be marked as completed by default.

---

## Phase 4: Medium — Backend Improvements

> **Goal:** Improve reliability, validation, and API quality.

### Step 4.1: Create ChatService

**File:** `backend/src/main/java/com/gymsync/service/ChatService.java` (NEW)

Extract business logic from `ChatController` into a service:

```
- getConversation(User user1, User user2) → List<ChatMessage>
- sendMessage(String senderUsername, String receiverUsername, String content) → ChatMessage
- markAsRead(Long messageId, String username) → void
- getUnreadCount(String username) → long
- getChatPartners(String username) → List<User>
```

Move the `UserRepository` and `ChatMessageRepository` injections from the controller to the service.

---

### Step 4.2: Add Mark-as-Read Endpoint

**File:** `backend/src/main/java/com/gymsync/controller/ChatController.java` (MODIFY)

```java
@PutMapping("/messages/{messageId}/read")
public ResponseEntity<?> markAsRead(@PathVariable Long messageId, Principal principal) {
    chatService.markAsRead(messageId, principal.getName());
    return ResponseEntity.ok().build();
}
```

---

### Step 4.3: Add Workout Update Endpoint

**File:** `backend/src/main/java/com/gymsync/controller/WorkoutController.java` (MODIFY)

```java
@PutMapping("/{id}")
public ResponseEntity<?> updateWorkout(
    @PathVariable Long id,
    @RequestBody @Valid WorkoutLog updates,
    Principal principal
) {
    WorkoutLog existing = workoutService.getWorkoutById(id);
    verifyOwnership(existing, principal.getName());
    // Update allowed fields: notes, durationMinutes, caloriesBurned, rating
    if (updates.getNotes() != null) existing.setNotes(updates.getNotes());
    if (updates.getDurationMinutes() != null) existing.setDurationMinutes(updates.getDurationMinutes());
    if (updates.getCaloriesBurned() != null) existing.setCaloriesBurned(updates.getCaloriesBurned());
    if (updates.getRating() != null) existing.setRating(updates.getRating());
    return ResponseEntity.ok(workoutService.updateWorkout(existing));
}
```

Add `updateWorkout(WorkoutLog)` to `WorkoutService` interface and `WorkoutServiceImpl`.

---

### Step 4.4: Remove Duplicate ChatController Annotation

**File:** `backend/src/main/java/com/gymsync/controller/ChatController.java` (MODIFY)

Remove `@Controller` — `@RestController` already includes it. Having both is redundant.

Current code (lines 24-26):
```java
@Controller
@RestController
@RequestMapping("/api/chat")
```

Change to:
```java
@RestController
@RequestMapping("/api/chat")
```

---

### Step 4.5: Add WorkoutLog Rating Validation

**File:** `backend/src/main/java/com/gymsync/model/WorkoutLog.java` (MODIFY)

Add validation:
```java
@Min(1)
@Max(5)
private Double rating;
```

---

### Step 4.6: Improve TimeSlot Validation

**File:** `backend/src/main/java/com/gymsync/model/TimeSlot.java` (MODIFY)

Add a `@Pattern` annotation for `dayOfWeek` and validation for times:

```java
@Pattern(regexp = "MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY")
private String dayOfWeek;

@Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
private String startTime;

@Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
private String endTime;
```

---

### Step 4.7: Fix getWorkoutStats Performance

**File:** `backend/src/main/java/com/gymsync/service/WorkoutServiceImpl.java` (MODIFY)

Replace the in-memory list loading with COUNT queries:

```java
public Map<String, Object> getWorkoutStats(Long userId) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));
    long totalWorkouts = workoutLogRepository.countByUser(user);
    long thisWeek = workoutLogRepository.countWorkoutsInDateRange(user, LocalDate.now().minusDays(7), LocalDate.now());
    long thisMonth = workoutLogRepository.countWorkoutsInDateRange(user, LocalDate.now().minusDays(30), LocalDate.now());
    return Map.of("totalWorkouts", totalWorkouts, "thisWeek", thisWeek, "thisMonth", thisMonth);
}
```

**File:** `backend/src/main/java/com/gymsync/repository/WorkoutLogRepository.java` (MODIFY)

Add: `long countByUser(User user);`

---

### Step 4.8: Remove Duplicate Dependencies

**File:** `backend/pom.xml` (MODIFY)

Remove the duplicate `assertj-core` entry (appears twice with version `3.24.2`).

**File:** `mobile/package.json` (MODIFY)

Remove duplicate entries for `@stomp/stompjs`, `sockjs-client`, and `text-encoding`.

---

### Step 4.9: Remove Hardcoded "testuser" Fallback

**File:** `backend/src/main/java/com/gymsync/controller/WorkoutController.java` (MODIFY)

Replace all 5 occurrences of `principal != null ? principal.getName() : "testuser"` with just `principal.getName()`. If principal is null (shouldn't happen with JWT), the request should fail with 401.

**Note:** This is also partially addressed in Step 2.5 (ownership checks). Do both together.

---

## Phase 5: Medium — Mobile App Polish

> **Goal:** Improve UX, type safety, and error handling.

### Step 5.1: Use Environment-Based API URL

**File:** `mobile-expo/src/services/api.ts` (MODIFY)

```typescript
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl
  ? `${Constants.expoConfig.extra.apiUrl}/api`
  : 'http://localhost:8080/api';
```

Do the same for `ChatWebSocketService.ts`.

**Also apply to:** `mobile/src/services/api.ts` (use `react-native-config` or similar)

---

### Step 5.2: Remove Duplicate WebSocket Service

**Files to remove or unify:**
- Keep `ChatWebSocketService.ts` (the SockJS version) as the canonical implementation
- Remove `chatSocket.ts` (the raw WebSocket version)
- Update `ChatScreen.tsx` imports to use `ChatWebSocketService`

**Rationale:** Having two competing WebSocket clients is confusing. The SockJS version matches the backend's `WebSocketConfig` which uses SockJS fallback.

---

### Step 5.3: Add Loading Indicators

**Files to modify:** All mobile screens

Add `ActivityIndicator` to each screen that makes API calls:

```typescript
const [loading, setLoading] = useState(true);

if (loading) {
  return <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />;
}
```

Apply to: WorkoutsScreen, GymsScreen, ChatScreen, ProfileScreen.

---

### Step 5.4: Build HomeScreen with Real Data

**File:** `mobile-expo/src/screens/HomeScreen.tsx` (MODIFY)

Replace the static placeholder with real data:
- Welcome message using `user.name`
- Quick stats (total workouts, this week) from `/workouts/stats`
- Unread messages count from `/chat/unread`

---

### Step 5.5: Add Delete Workout Option

**File:** `mobile-expo/src/screens/WorkoutsScreen.tsx` (MODIFY)

Add swipe-to-delete or long-press menu on each workout card:
```typescript
const deleteWorkout = async (id: number) => {
  Alert.alert('Delete Workout', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      await api.delete(`/workouts/${id}`);
      loadData();
    }},
  ]);
};
```

---

### Step 5.6: Fix RegisterScreen Type Cast

**File:** `mobile-expo/src/screens/RegisterScreen.tsx` (MODIFY)

Replace `form as any` with a properly typed object that matches `RegisterData`:

```typescript
await register({
  name: form.name,
  username: form.username,
  email: form.email,
  password: form.password,
  fitnessLevel: form.fitnessLevel as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
  gymLocation: form.gymLocation || undefined,
  workoutGoals: form.workoutGoals || undefined,
});
```

---

### Step 5.7: Fix AuthContext Test Assertion

**File:** `mobile-expo/src/services/__tests__/AuthContext.test.tsx` (MODIFY)

The test at line 77 asserts `AsyncStorage.setItem` has **not** been called, but it should assert that it **has** been called after a successful login:

```typescript
// BEFORE (broken):
expect(AsyncStorage.setItem).not.toHaveBeenCalled();

// AFTER (correct):
await waitFor(() => {
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
});
```

---

### Step 5.8: Fix WorkoutControllerTest Duplicate Method

**File:** `backend/src/test/java/com/gymsync/controller/WorkoutControllerTest.java` (MODIFY)

Remove the orphaned `getStats_ShouldReturnStats()` method that references `mockMvc` (which doesn't exist in this test class). The class already has a `getStats_ShouldReturnStats()` method that works.

---

## Phase 6: Low — Infrastructure & CI

> **Goal:** Improve build reliability, testing, and deployment readiness.

### Step 6.1: Fix CI Type Check

**File:** `.github/workflows/ci.yml` (MODIFY)

Remove `|| true` from the type check step:

```yaml
# BEFORE:
- name: Type check
  run: npx tsc --noEmit || true

# AFTER:
- name: Type check
  run: npx tsc --noEmit
```

---

### Step 6.2: Improve Docker Test

**File:** `.github/workflows/ci.yml` (MODIFY)

Replace the meaningless `java -version` test with an actual health check:

```yaml
- name: Test Docker image
  run: |
    docker run -d -p 8080:8080 --name gymsync-test gymsync-backend:latest
    sleep 15
    curl -f http://localhost:8080/api/auth/register || exit 1
    docker stop gymsync-test
```

---

### Step 6.3: Add .dockerignore

**File:** `backend/.dockerignore` (NEW)

```
target/
.idea/
*.iml
.git/
.github/
README.md
```

---

### Step 6.4: Add Docker HEALTHCHECK

**File:** `backend/Dockerfile` (MODIFY)

Add before ENTRYPOINT:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:8080/api/auth/register || exit 1
```

---

### Step 6.5: Change Production Logging to INFO

**File:** `backend/src/main/resources/application.properties` (MODIFY)

```properties
# BEFORE:
logging.level.com.gymsync=DEBUG
logging.level.org.springframework.security=DEBUG

# AFTER:
logging.level.com.gymsync=INFO
logging.level.org.springframework.security=WARN
```

---

### Step 6.6: Remove Bean Override Allowance in Tests

**File:** `backend/src/test/resources/application-test.properties` (MODIFY)

Remove `spring.main.allow-bean-definition-overriding=true` — this masks configuration conflicts.

If this causes test failures, fix the conflicting bean definitions instead.

---

### Step 6.7: Enable Disabled E2E Tests

**Files to modify:**
- `backend/src/test/java/com/gymsync/e2e/WorkoutE2EFlowTest.java` — remove `@Disabled` annotations
- `backend/src/test/java/com/gymsync/e2e/ChatE2EFlowTest.java` — remove `@Disabled` from `completeChatFlow_ShouldWork()`
- `backend/src/test/java/com/gymsync/e2e/UserProfileE2EFlowTest.java` — remove `@Disabled` from `completeProfileFlow_ShouldWork()` and `scheduleAvailability_ShouldWork()`
- `backend/src/test/java/com/gymsync/integration/WorkoutIntegrationTest.java` — remove `@Disabled` from `fullWorkoutFlow_ShouldSucceed()` and `getExercises_ShouldReturnList()`

These tests may need updates to work with the new JWT authentication (they'll need to obtain a token first). Fix any failures.

---

### Step 6.8: Create Missing Test Classes

**New files:**
- `backend/src/test/java/com/gymsync/controller/AuthControllerTest.java` — test register (success, duplicate username, duplicate email, invalid data) and login (success, wrong password, user not found)
- `backend/src/test/java/com/gymsync/controller/UserControllerTest.java` — test `/me`, `/schedule`, `/buddies`
- `backend/src/test/java/com/gymsync/security/JwtUtilTest.java` — test token generation, validation, expiration

---

### Step 6.9: Add Backend Lint/Static Analysis to CI

**File:** `.github/workflows/ci.yml` (MODIFY)

Add a step in the backend job:
```yaml
- name: Run Checkstyle
  run: mvn checkstyle:check
```

**File:** `backend/pom.xml` (MODIFY) — add `maven-checkstyle-plugin` with a basic ruleset.

---

### Step 6.10: Add Mobile Lint to CI

**File:** `.github/workflows/ci.yml` (MODIFY)

Add a step in the `mobile-expo` job:
```yaml
- name: Lint
  run: npm run lint
```

---

## Summary: Files Changed Per Phase

| Phase | New Files | Modified Files | Status |
|-------|-----------|---------------|--------|
| Phase 1 | `JwtUtil.java`, `CustomUserDetailsService.java`, `JwtAuthenticationFilter.java`, `CorsConfig.java`, `GlobalExceptionHandler.java`, `LoginRequest.java`, `RegisterRequest.java` | `User.java`, `SecurityConfig.java`, `AuthController.java`, `ChatController.java`, `AuthContext.tsx` (×2), `api.ts` (×2) | ✅ Done |
| Phase 2 | `GymController.java`, `UserProfileResponse.java`, `UserUpdateRequest.java` | `UserService.java`, `UserRepository.java`, `UserController.java`, `WorkoutController.java`, `SecurityConfig.java`, `ExerciseSet.java` | ❌ Pending |
| Phase 3 | `WorkoutDetailScreen.tsx` | `types/index.ts` (×2), `App.tsx` (×2), `ChatScreen.tsx` (×2), `LoginScreen.tsx` (×2), `RegisterScreen.tsx` (×2), `WorkoutsScreen.tsx` (×2), `LogWorkoutScreen.tsx` (×2), `ProfileScreen.tsx` (×2), `GymsScreen.tsx` (×2) | ❌ Pending |
| Phase 4 | `ChatService.java` | `ChatController.java`, `WorkoutController.java`, `WorkoutService.java`, `WorkoutLogRepository.java`, `TimeSlot.java`, `WorkoutLog.java`, `pom.xml`, `mobile/package.json` | ❌ Pending |
| Phase 5 | — | `api.ts` (×2), `ChatWebSocketService.ts` (×2), `HomeScreen.tsx` (×2), `WorkoutsScreen.tsx` (×2), `AuthContext.test.tsx`, `RegisterScreen.tsx` (×2), `WorkoutControllerTest.java` | ❌ Pending |
| Phase 6 | `.dockerignore`, `AuthControllerTest.java`, `UserControllerTest.java`, `JwtUtilTest.java` | `ci.yml`, `Dockerfile`, `application.properties`, `application-test.properties`, 5 E2E/integration test files | ❌ Pending |

**Total new files:** ~10  
**Total modified files:** ~30 (many exist in both `mobile/` and `mobile-expo/`, so ~45 file edits)  
**Estimated effort:** 2-3 weeks for a single developer