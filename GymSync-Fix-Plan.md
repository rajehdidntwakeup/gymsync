# GymSync Fix Plan

> A step-by-step guide to fixing every issue identified in the project analysis.
> Organized into 6 phases by priority — each phase builds on the previous one.

---

## Phase 1: Critical — Authentication & Security

> **Goal:** Make login work end-to-end and stop leaking passwords.

### Step 1.1: Create JWT Utility Class

**File:** `backend/src/main/java/com/gymsync/security/JwtUtil.java` (NEW)

Create a utility class that handles JWT token creation and validation using the already-declared `jjwt` dependency.

**What to implement:**
```
- generateToken(UserDetails userDetails) → String
  - Use gymsync.jwt.secret and gymsync.jwt.expiration from application.properties
  - Set subject = username, claim "userId" = user.getId()
  - Set issuedAt = now, expiration = now + expirationMs
- extractUsername(String token) → String
- extractUserId(String token) → Long
- isTokenValid(String token, UserDetails userDetails) → boolean
  - Check username matches, token not expired
- extractAllClaims(String token) → Claims (private helper)
```

**Configuration values (from `application.properties`):**
- `gymsync.jwt.secret` — inject via `@Value`
- `gymsync.jwt.expiration` — inject via `@Value`

---

### Step 1.2: Make User Entity Implement UserDetails

**File:** `backend/src/main/java/com/gymsync/model/User.java` (MODIFY)

**Changes:**
1. Add `implements UserDetails` to the class declaration
2. Add `@JsonIgnore` on `getPassword()` method (prevents password hash from appearing in API responses)
3. Implement `getAuthorities()` → return `Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))`
4. Implement `isAccountNonExpired()`, `isAccountNonLocked()`, `isCredentialsNonExpired()`, `isEnabled()` → all return `true`
5. `getUsername()` already exists — it maps to the `username` column, which is correct for Spring Security

**Why:** Spring Security's `AuthenticationManager` needs a `UserDetails` object. Adding `@JsonIgnore` on `getPassword()` fixes the critical password leak bug.

---

### Step 1.3: Create Custom UserDetailsService

**File:** `backend/src/main/java/com/gymsync/security/CustomUserDetailsService.java` (NEW)

**What to implement:**
```
@Service
public class CustomUserDetailsService implements UserDetailsService

  @Autowired UserRepository userRepository

  loadUserByUsername(String username) → UserDetails
    - Call userRepository.findByUsername(username)
    - If not found, throw UsernameNotFoundException
    - Return the User entity (which now implements UserDetails)
```

---

### Step 1.4: Create JWT Authentication Filter

**File:** `backend/src/main/java/com/gymsync/security/JwtAuthenticationFilter.java` (NEW)

**What to implement:**
```
public class JwtAuthenticationFilter extends OncePerRequestFilter

  @Autowired JwtUtil jwtUtil
  @Autowired CustomUserDetailsService userDetailsService

  doFilterInternal(request, response, filterChain)
    1. Extract Authorization header
    2. If header starts with "Bearer ", extract token
    3. If token valid → load UserDetails, create UsernamePasswordAuthenticationToken
    4. Set SecurityContextHolder authentication
    5. Continue filter chain
```

**Edge cases:**
- If no Authorization header → just continue the filter chain (allow permitAll endpoints through)
- If token is malformed/expired → clear context, continue (Spring Security will return 401 for secured endpoints)

---

### Step 1.5: Wire JWT Filter into SecurityConfig

**File:** `backend/src/main/java/com/gymsync/config/SecurityConfig.java` (MODIFY)

**Changes:**
1. Inject `JwtAuthenticationFilter` and `CustomUserDetailsService`
2. Add `.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)` to the filter chain
3. Remove `@CrossOrigin(origins = "*")` — will be centralized in Step 1.7
4. Build `AuthenticationManager` using the `userDetailsService` and `passwordEncoder` beans

**Updated filter chain:**
```java
http
  .csrf(AbstractHttpConfigurer::disable)
  .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
  .authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**").permitAll()
    .requestMatchers("/api/gyms").permitAll()
    .requestMatchers("/api/workouts/exercises").permitAll()
    .requestMatchers("/ws/**").permitAll()
    .anyRequest().authenticated()
  )
  .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
```

---

### Step 1.6: Implement Login Endpoint

**File:** `backend/src/main/java/com/gymsync/controller/AuthController.java` (MODIFY)

**Replace the stub login method with:**
```java
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request) {
    Authentication authentication = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(
            request.getUsername(), request.getPassword()
        )
    );

    SecurityContextHolder.getContext().setAuthentication(authentication);
    UserDetails userDetails = (UserDetails) authentication.getPrincipal();
    String token = jwtUtil.generateToken(userDetails);
    User user = userRepository.findByUsername(userDetails.getUsername())
        .orElseThrow(() -> new RuntimeException("User not found"));

    return ResponseEntity.ok(Map.of(
        "token", token,
        "type", "Bearer",
        "userId", user.getId(),
        "username", user.getUsername()
    ));
}
```

**Also inject:** `AuthenticationManager` and `JwtUtil` into the constructor.

**Also make `LoginRequest` public** (currently package-private).

---

### Step 1.7: Create Global CORS and Error Handling

**File:** `backend/src/main/java/com/gymsync/config/CorsConfig.java` (NEW)

**What to implement:**
```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:8080", "http://localhost:19000", "http://localhost:19006")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

**File:** `backend/src/main/java/com/gymsync/exception/GlobalExceptionHandler.java` (NEW)

**What to implement:**
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        // Map known messages to appropriate status codes
        if (ex.getMessage().contains("not found")) return ResponseEntity.status(404).body(...)
        return ResponseEntity.status(500).body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        // Collect field errors → return 400 with details
    }

    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(UsernameNotFoundException ex) {
        return ResponseEntity.status(401).body(Map.of("error", ex.getMessage()));
    }
}
```

**Then:** Remove `@CrossOrigin(origins = "*")` from all four controllers (AuthController, UserController, WorkoutController, ChatController).

---

### Step 1.8: Fix Mobile Auth Flow

**File:** `mobile-expo/src/services/AuthContext.tsx` (MODIFY)

**Changes:**
1. After `login()` stores the token, call `api.get('/users/me')` with the token and `setUser(userData)`
2. In `checkAuth()`, if a token exists, call `api.get('/users/me')` and `setUser(userData)`
3. In `logout()`, also call `setUser(null)` (already done) — no backend logout needed for JWT

**Updated `login` method:**
```typescript
const login = async (credentials: LoginCredentials) => {
  const response = await api.post('/auth/login', credentials);
  const { token } = response.data;
  await AsyncStorage.setItem('token', token);
  // Fetch user profile with the new token
  const userResponse = await api.get('/users/me');
  setUser(userResponse.data);
};
```

**Updated `checkAuth` method:**
```typescript
const checkAuth = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      const response = await api.get('/users/me');
      setUser(response.data);
    }
  } catch (error) {
    // Token is invalid — clear it
    await AsyncStorage.removeItem('token');
  } finally {
    setLoading(false);
  }
};
```

**Also apply the same changes to:** `mobile/src/services/AuthContext.tsx`

---

### Step 1.9: Fix 401 Interceptor Navigation

**File:** `mobile-expo/src/services/api.ts` (MODIFY)

Add a callback mechanism so the 401 interceptor can trigger logout:

```typescript
// Add at module level
let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// In the response interceptor:
if (error.response?.status === 401) {
  await AsyncStorage.removeItem('token');
  onUnauthorizedCallback?.();
}
```

**File:** `mobile-expo/src/App.tsx` (MODIFY) — register the callback in `AppNavigator`:

```typescript
import { setOnUnauthorized } from './src/services/api';

// Inside AppNavigator component:
React.useEffect(() => {
  setOnUnauthorized(() => {
    // Reset navigation to Login screen
    navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
  });
}, []);
```

**Also apply to:** `mobile/src/services/api.ts`

---

## Phase 2: High — Backend Stubs & Data Integrity

> **Goal:** Replace all hardcoded/fake data with real database queries.

### Step 2.1: Create UserService

**File:** `backend/src/main/java/com/gymsync/service/UserService.java` (NEW)

**What to implement:**
```
@Service
public class UserService

  @Autowired UserRepository userRepository

  getUserProfile(String username) → User
    - findByUsername, throw if not found

  updateUserProfile(String username, User updates) → User
    - Find user, update allowed fields (name, email, fitnessLevel, gymLocation, workoutGoals)
    - Do NOT allow updating username, password (separate flow), or id
    - Save and return

  setSchedule(Long userId, List<TimeSlot> schedule) → User
    - Find user, replace availableSlots, save

  getSchedule(Long userId) → List<TimeSlot>
    - Find user, return availableSlots

  findBuddies(String gymLocation, String fitnessLevel) → List<User>
    - Query by gymLocation and fitnessLevel
    - Exclude the requesting user
    - Add to UserRepository: findByGymLocationAndFitnessLevel(String, FitnessLevel)
```

---

### Step 2.2: Add Missing Repository Methods

**File:** `backend/src/main/java/com/gymsync/repository/UserRepository.java` (MODIFY)

Add:
```java
List<User> findByGymLocationAndFitnessLevel(String gymLocation, FitnessLevel fitnessLevel);
List<User> findByGymLocation(String gymLocation);
```

---

### Step 2.3: Rewrite UserController

**File:** `backend/src/main/java/com/gymsync/controller/UserController.java` (MODIFY)

**Replace all stub methods with real implementations:**

```java
@GetMapping("/me")
public ResponseEntity<?> getMyProfile(Principal principal) {
    User user = userService.getUserProfile(principal.getName());
    return ResponseEntity.ok(user);
}

@PutMapping("/me")
public ResponseEntity<?> updateProfile(Principal principal, @RequestBody @Valid User updates) {
    User updated = userService.updateUserProfile(principal.getName(), updates);
    return ResponseEntity.ok(updated);
}

@GetMapping("/buddies")
public ResponseEntity<?> findBuddies(
    Principal principal,
    @RequestParam(required = false) String gymLocation,
    @RequestParam(required = false) String fitnessLevel
) {
    User currentUser = userService.getUserProfile(principal.getName());
    List<User> buddies = userService.findBuddies(
        gymLocation != null ? gymLocation : currentUser.getGymLocation(),
        fitnessLevel != null ? fitnessLevel : currentUser.getFitnessLevel().name()
    );
    return ResponseEntity.ok(buddies);
}
```

**Inject `UserService`** instead of no service (current state has none).

---

### Step 2.4: Fix findByIdWithExerciseSets NPE

**File:** `backend/src/main/java/com/gymsync/repository/WorkoutLogRepository.java` (MODIFY)

Change the return type from `WorkoutLog` to `Optional<WorkoutLog>`:

```java
@Query("SELECT w FROM WorkoutLog w LEFT JOIN FETCH w.exerciseSets WHERE w.id = :id")
Optional<WorkoutLog> findByIdWithExerciseSets(@Param("id") Long id);
```

**File:** `backend/src/main/java/com/gymsync/service/WorkoutService.java` (MODIFY)

Update `getWorkoutById`:
```java
public WorkoutLog getWorkoutById(Long workoutId) {
    return workoutLogRepository.findByIdWithExerciseSets(workoutId)
        .orElseThrow(() -> new RuntimeException("Workout not found with id: " + workoutId));
}
```

---

### Step 2.5: Add Ownership Checks to WorkoutController

**File:** `backend/src/main/java/com/gymsync/controller/WorkoutController.java` (MODIFY)

Add ownership validation for `getWorkout`, `deleteWorkout`, and `addExerciseSet`:

```java
private void verifyOwnership(WorkoutLog workout, String username) {
    if (!workout.getUser().getUsername().equals(username)) {
        throw new RuntimeException("You can only access your own workouts");
    }
}
```

Call this method in `getWorkout`, `deleteWorkout`, and `addExerciseSet` after fetching the workout.

---

### Step 2.6: Add @Valid to All @RequestBody Parameters

**Files to modify:**
- `AuthController.java` — add `@Valid` to `register(@RequestBody @Valid User user)`
- `WorkoutController.java` — add `@Valid` to `createWorkout`, `addExerciseSet`, `createCustomExercise`
- `ChatController.java` — add `@Valid` to `sendMessage`, `sendTyping`

This activates the Bean Validation annotations (`@NotBlank`, `@Size`, `@Email`) that already exist on the `User` entity.

---

### Step 2.7: Create DTO Layer for User (Password Leak Prevention Part 2)

**File:** `backend/src/main/java/com/gymsync/dto/UserProfileResponse.java` (NEW)

```java
public class UserProfileResponse {
    private Long id;
    private String name;
    private String username;
    private String email;
    private String fitnessLevel;
    private String gymLocation;
    private String workoutGoals;
    private List<TimeSlot> availableSlots;
    private LocalDateTime createdAt;
    // getters/setters — NO password field
}
```

**File:** `backend/src/main/java/com/gymsync/dto/UserUpdateRequest.java` (NEW)

```java
public class UserUpdateRequest {
    private String name;
    private String email;
    private String fitnessLevel;
    private String gymLocation;
    private String workoutGoals;
    // getters/setters — NO id, username, password fields
}
```

**Then update** `UserController` and `ChatController` to return `UserProfileResponse` instead of `User` entities. The `@JsonIgnore` on `User.password` (Step 1.2) is the quick fix; DTOs are the proper fix.

---

### Step 2.8: Create GymController

**File:** `backend/src/main/java/com/gymsync/controller/GymController.java` (NEW)

```java
@RestController
@RequestMapping("/api/gyms")
public class GymController {

    @Autowired private GymRepository gymRepository;

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

// AFTER (matching backend):
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
  exerciseId: number;
  exerciseName?: string;  // populated from join
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  notes: string | null;
  completed: boolean;
}
```

Fix `Exercise` interface:

```typescript
// BEFORE:
export interface Exercise {
  id: number;
  name: string;
  category: string;
  muscleGroup: string;  // wrong field name
}

// AFTER:
export interface Exercise {
  id: number;
  name: string;
  category: string;
  primaryMuscleGroup: string;
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

**Also apply to:** `mobile/App.tsx` (or root App.tsx)

---

### Step 3.3: Fix ChatScreen WebSocket Connection Leak

**File:** `mobile-expo/src/screens/ChatScreen.tsx` (MODIFY)

In the `useEffect` for `selectedPartner`, disconnect the previous connection before connecting a new one:

```typescript
useEffect(() => {
  if (selectedPartner) {
    // Disconnect previous connection before creating a new one
    chatSocket.disconnect();
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
    existing.setNotes(updates.getNotes());
    existing.setDurationMinutes(updates.getDurationMinutes());
    existing.setCaloriesBurned(updates.getCaloriesBurned());
    existing.setRating(updates.getRating());
    return ResponseEntity.ok(workoutLogRepository.save(existing));
}
```

---

### Step 4.4: Remove Duplicate ChatController Annotation

**File:** `backend/src/main/java/com/gymsync/controller/ChatController.java` (MODIFY)

Remove `@Controller` — `@RestController` already includes it. Having both is redundant.

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

**File:** `backend/src/main/java/com/gymsync/service/WorkoutService.java` (MODIFY)

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

Replace all occurrences of `principal != null ? principal.getName() : "testuser"` with just `principal.getName()`. If principal is null (shouldn't happen with JWT), the request should fail with 401.

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

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| Phase 1 | `JwtUtil.java`, `CustomUserDetailsService.java`, `JwtAuthenticationFilter.java`, `CorsConfig.java`, `GlobalExceptionHandler.java` | `User.java`, `SecurityConfig.java`, `AuthController.java`, `AuthContext.tsx` (×2), `api.ts` (×2), `App.tsx` (×2) |
| Phase 2 | `UserService.java`, `UserProfileResponse.java`, `UserUpdateRequest.java`, `GymController.java` | `UserRepository.java`, `UserController.java`, `WorkoutLogRepository.java`, `WorkoutService.java`, `WorkoutController.java`, `ChatController.java`, `ExerciseSet.java` |
| Phase 3 | `WorkoutDetailScreen.tsx` | `types/index.ts` (×2), `App.tsx` (×2), `ChatScreen.tsx` (×2), `LoginScreen.tsx` (×2), `RegisterScreen.tsx` (×2), `WorkoutsScreen.tsx` (×2), `LogWorkoutScreen.tsx` (×2), `ProfileScreen.tsx` (×2), `GymsScreen.tsx` (×2) |
| Phase 4 | `ChatService.java` | `ChatController.java`, `WorkoutController.java`, `WorkoutService.java`, `WorkoutLogRepository.java`, `TimeSlot.java`, `WorkoutLog.java`, `pom.xml`, `mobile/package.json` |
| Phase 5 | — | `api.ts` (×2), `ChatWebSocketService.ts` (×2), `HomeScreen.tsx` (×2), `WorkoutsScreen.tsx` (×2), `AuthContext.test.tsx`, `RegisterScreen.tsx` (×2), `WorkoutControllerTest.java` |
| Phase 6 | `.dockerignore`, `AuthControllerTest.java`, `UserControllerTest.java`, `JwtUtilTest.java` | `ci.yml`, `Dockerfile`, `application.properties`, `application-test.properties`, 5 E2E/integration test files |

**Total new files:** ~10  
**Total modified files:** ~30 (many exist in both `mobile/` and `mobile-expo/`, so ~45 file edits)  
**Estimated effort:** 2-3 weeks for a single developer