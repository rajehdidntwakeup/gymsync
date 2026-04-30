# GymSync Project Analysis Report

> Generated: 2026-04-19

## Project Overview

**GymSync** is a gym buddy matching and workout planning app built with:

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Spring Boot (Java 21) | 3.2.0 |
| Database (prod) | PostgreSQL | 15+ |
| Database (test/docker) | H2 in-memory | -- |
| ORM | Spring Data JPA / Hibernate | -- |
| Migrations | Flyway | -- |
| Auth | JWT (jjwt 0.12.3) | -- |
| Password hashing | BCrypt | -- |
| Real-time | Spring WebSocket + STOMP | -- |
| Mobile (v1, bare) | React Native + TypeScript | RN 0.73.0, React 18.2.0 |
| Mobile (v2, Expo) | Expo + React Native + TypeScript | Expo ~55, RN 0.83.2, React 19.2.0 |
| HTTP client (mobile) | Axios | 1.6.x |
| Navigation (mobile) | React Navigation 6 | -- |
| CI/CD | GitHub Actions | -- |
| Containerization | Docker (multi-stage) | eclipse-temurin:21 |

---

## What's Well Implemented

### Solid Data Model & Schema

- Well-designed JPA entities with proper relationships and fetch strategies
- 3 Flyway migrations with proper indexes, constraints (including a self-messaging CHECK constraint), and 28 seed exercises
- `WorkoutLog` has `addExerciseSet`/`removeExerciseSet` helper methods for cascade management
- `ChatMessage` uses `@PrePersist` for timestamp and `LAZY` fetch on sender/receiver

### WorkoutService (Most Complete Feature)

- The only fully-implemented service with 7 methods covering CRUD, stats, custom exercises, and search
- Well-structured with helper methods and proper repository usage
- Backed by 10 unit tests and 9 controller tests

### Chat Infrastructure

- WebSocket/STOMP config is correct with SockJS fallback
- `ChatController` handles send, typing, history, partners, and unread counts
- `ChatMessageRepository` has good JPQL queries for conversations, unread counts, and partner listing
- Messages are persisted before being pushed to users

### Docker Multi-Stage Build

- Clean Alpine-based Dockerfile with JDK 21 build stage and JRE 21 runtime stage
- Proper `SPRING_PROFILES_ACTIVE=docker` configuration

### Mobile Navigation Architecture

- 5-tab bottom navigator (Home, Gyms, Workouts, Chat, Profile)
- Auth stack with Login/Register shown when unauthenticated
- `LogWorkoutScreen` pushed as a modal from Workouts tab

### API Interceptor Pattern

- Axios request interceptor attaches JWT from AsyncStorage
- 401 response interceptor clears token on unauthorized responses
- Proper pattern even though the auth system itself is broken

### EAS Build Profiles

- Development, preview (APK), and production (AAB) profiles configured in `eas.json`

---

## What's Ready for Testing

| Feature | Notes |
|---------|-------|
| Workout CRUD | Create workout, add sets, list workouts, get stats -- all work through the backend |
| Chat message flow | Send/receive via STOMP, history retrieval, partner listing, typing notifications |
| Registration endpoint | `POST /api/auth/register` actually creates users with BCrypt passwords |
| Exercise library | 28 seeded exercises, search by name, filter by muscle group/category |
| Workout screen (mobile) | Fetches workouts + stats, pull-to-refresh, empty state, FAB for logging |
| LogWorkout screen (mobile) | Rich form: date picker, duration, calories, star rating, dynamic exercise sets |
| Chat screen (mobile) | Partner list + message history + real-time WebSocket messaging |
| Backend unit tests | WorkoutService (10 tests), ChatController (4 tests), WorkoutController (9 tests) |

---

## What's Poorly Implemented

### Backend Issues

| Issue | Severity |
|-------|----------|
| **Login endpoint is a stub** -- returns `"Login endpoint - JWT implementation pending"` instead of a JWT token. The jjwt dependency is declared but zero code uses it | CRITICAL |
| **No JWT filter/provider/UserDetailsService** -- `SecurityConfig` sets `STATELESS` policy but has no mechanism to validate tokens. `anyRequest().authenticated()` will reject everything because no auth context can be established | CRITICAL |
| **UserController returns hardcoded fake data** -- `/users/me` returns `"Test User"`, `/schedule` returns empty list, `/buddies` returns empty list. No `UserRepository` is even injected | CRITICAL |
| **User.password leaks in API responses** -- No `@JsonIgnore` on the password field. Any endpoint returning a User entity (chat partners, exercise creators) exposes the BCrypt hash | CRITICAL |
| **No ownership checks** -- Any user can GET or DELETE any other user's workout. Any user can read any chat conversation by knowing a username | HIGH |
| **No `@ControllerAdvice`** -- All `RuntimeException` throws result in raw 500 responses with stack traces | HIGH |
| **No `@Valid` on any `@RequestBody`** -- Bean Validation annotations exist on entities but are never triggered | HIGH |
| **`findByIdWithExerciseSets` returns `null`** (not `Optional`) -- causes NPE downstream | HIGH |
| **`@CrossOrigin(origins = "*")`** on every controller and WebSocket config | MEDIUM |
| **`getWorkoutStats` loads all workouts into memory** just to call `.size()` instead of a COUNT query | LOW |
| **No pagination** on any list endpoint | LOW |
| **Duplicate `assertj-core` dependency** in pom.xml | TRIVIAL |

### Mobile Issues

| Issue | Severity |
|-------|----------|
| **Auth flow is broken end-to-end** -- After login, `user` is never set (TODO comment). After app restart, `checkAuth` never hydrates the user. The app always shows the login screen regardless of token state | CRITICAL |
| **No error feedback to users** -- Login failure, API errors, chat load failures all silently log to console. User sees no indication of failure | HIGH |
| **No form validation** -- Login/Register/LogWorkout screens accept empty or invalid input with no checks | HIGH |
| **Exercise picker is hardcoded** -- LogWorkoutScreen always adds "Bench Press" (exerciseId: 1) with a TODO comment | MEDIUM |
| **ChatScreen WebSocket connection leak** -- Switching partners creates new connections without closing the old one | MEDIUM |
| **Sequential API calls for workout sets** -- No atomicity; partial saves leave orphaned workouts | MEDIUM |
| **No WorkoutDetail screen** -- WorkoutsScreen navigates to `'WorkoutDetail'` which doesn't exist (will crash at runtime) | MEDIUM |
| **TypeScript type mismatches** -- Frontend `WorkoutLog` type has completely different fields than backend model. `Exercise.muscleGroup` vs backend `primaryMuscleGroup` | MEDIUM |
| **6 explicit `any` usages** -- navigation props, form cast | LOW |

---

## What's Missing

### Critical Missing Components

| Missing Component | Impact |
|-------------------|--------|
| **JWT authentication (generation + validation + filter)** | Entire security layer is inert. No user can actually authenticate |
| **UserDetailsService implementation** | Spring Security has no way to load users from the database |
| **UserService** | Profile, schedule, and buddy matching have no backend logic |

### Missing Features (Listed as MVP in README)

| Missing Feature | Details |
|-----------------|---------|
| **GymController** | Gym model + repository + security rule exist, but no API endpoint |
| **Gym discovery UI** | GymsScreen says "Map view coming soon" -- no map, no gym list |
| **Buddy matching** | The app's core feature. Backend returns empty list, frontend has zero UI |
| **User schedule management** | Backend echoes input, frontend has no UI |
| **Profile editing** | Backend PUT exists (as a stub), ProfileScreen only has a Logout button |

### Missing API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `PATCH /api/chat/{id}/read` | Mark messages as read (field exists but no endpoint) |
| `PUT /api/workouts/{id}` | Update a workout (can create and delete but not edit) |
| `POST /api/auth/refresh` | Refresh JWT token |
| `POST /api/auth/logout` | Invalidate JWT server-side |
| All `/api/gyms/*` endpoints | Gym discovery (model + repo exist, no controller) |

### Missing Infrastructure

| Missing | Details |
|---------|---------|
| **DTO layer** | Raw JPA entities exposed in all responses (with password leak) |
| **Mapper layer** | No MapStruct, ModelMapper, or manual mappers |
| **Reusable UI components** | No shared components directory. No loading spinners, error boundaries, or toast notifications |
| **Global error handler** | No `@ControllerAdvice` on backend, no error boundary on mobile |
| **Environment-based API URLs** | Hardcoded `localhost:8080` in mobile. Expo `extra.apiUrl` is defined but unused |
| **docker-compose.yml** | No orchestration for backend + PostgreSQL. Docker runs H2 (data lost on restart) |
| **`.dockerignore`** | Build context includes unnecessary files |
| **Production deployment config** | No `application-prod.properties`, no Docker Hub push, no store submission |
| **`Dockerfile` health check** | No `HEALTHCHECK` instruction |
| **Docker test** | Only checks `java -version`, not the app itself |

### Missing Backend Services

| Service | Current State |
|---------|--------------|
| `UserService` | Does not exist -- UserController is all stubs |
| `ChatService` | Does not exist -- ChatController contains business logic directly |
| `GymService` | Does not exist |
| `AuthService` | Does not exist -- AuthController mixes concerns |

---

## Bugs Found

| # | Bug | Location | Severity |
|---|-----|----------|----------|
| 1 | Login returns placeholder string instead of JWT | `AuthController.java:49` | CRITICAL |
| 2 | Password hash leaked in API responses (no `@JsonIgnore`) | `User.java` (password field) | CRITICAL |
| 3 | `findByIdWithExerciseSets` returns null causing NPE | `WorkoutLogRepository.java:29` | HIGH |
| 4 | AuthContext never sets user after login/register | `AuthContext.tsx:43` (both mobile dirs) | CRITICAL |
| 5 | AuthContext never hydrates user on app restart | `AuthContext.tsx:28` (both mobile dirs) | CRITICAL |
| 6 | Navigation to non-existent WorkoutDetail screen (will crash) | `WorkoutsScreen.tsx:55` (both dirs) | HIGH |
| 7 | WebSocket connection leak when switching chat partners | `ChatScreen.tsx` useEffect (both dirs) | MEDIUM |
| 8 | 401 interceptor clears token but doesn't navigate to login | `api.ts:34` (both dirs) | HIGH |
| 9 | Test asserts `AsyncStorage.setItem` NOT called on login success (should assert IS called) | `AuthContext.test.tsx:77` (expo) | MEDIUM |
| 10 | `getWorkoutStats` loads all workouts into memory for count | `WorkoutService.java` | LOW |
| 11 | `ExerciseSet.completed` defaults to `true` (odd for a new set) | `ExerciseSet.java` | LOW |
| 12 | TypeScript type check in CI suppressed with `\|\| true` | `ci.yml:61` | MEDIUM |
| 13 | Docker test only checks `java -version`, not the app | `ci.yml:105` | MEDIUM |
| 14 | Duplicate deps: `@stomp/stompjs`, `sockjs-client`, `assertj-core` listed twice | `package.json` / `pom.xml` | LOW |
| 15 | `WorkoutLog` type mismatch between frontend and backend | `types/index.ts` vs `WorkoutLog.java` | HIGH |

---

## Security Concerns

| Concern | Details | Severity |
|---------|---------|----------|
| **No JWT authentication** | Login is a stub. No token generation, no filter, no UserDetailsService | CRITICAL |
| **Password hash leak** | `User.password` has no `@JsonIgnore` -- BCrypt hash returned in API responses | CRITICAL |
| **CORS wildcard** | `@CrossOrigin(origins = "*")` on all controllers + `setAllowedOriginPatterns("*")` on WebSocket | HIGH |
| **No ownership checks** | Any user can view/delete any workout, read any chat conversation | HIGH |
| **No rate limiting** | Auth endpoints vulnerable to brute-force attacks | HIGH |
| **Weak default JWT secret** | Fallback `mySecretKey123456789012345678901234567890` in `application.properties` | MEDIUM |
| **Weak default DB password** | Fallback `password` for PostgreSQL | MEDIUM |
| **DEBUG logging in production config** | `logging.level.org.springframework.security=DEBUG` leaks auth details | MEDIUM |
| **No WebSocket auth** | No `WebSocketAuthInterceptor` to validate JWT on WebSocket connections | MEDIUM |
| **No CSRF protection** | Disabled globally (acceptable for JWT, but JWT isn't implemented) | LOW |

---

## Test Coverage Summary

### Backend Tests

| Test Class | Type | Total | Enabled | Disabled |
|------------|------|-------|---------|----------|
| `WorkoutServiceTest` | Unit | 10 | 10 | 0 |
| `WorkoutControllerTest` | WebMvcTest | 9 | 9 | 0 |
| `ChatControllerTest` | Unit | 4 | 4 | 0 |
| `ModelTest` | Unit | 5 | 5 | 0 |
| `ChatMessageRepositoryTest` | DataJpaTest | 3 | 3 | 0 |
| `AuthenticationE2ETest` | E2E | 2 | 2 | 0 |
| `WorkoutE2EFlowTest` | E2E | 2 | 0 | 2 |
| `ChatE2EFlowTest` | E2E | 2 | 1 | 1 |
| `UserProfileE2EFlowTest` | E2E | 3 | 1 | 2 |
| `WorkoutIntegrationTest` | Integration | 3 | 1 | 2 |
| `GymSyncApplicationTests` | Smoke | 1 | 1 | 0 |

**7 of 12 E2E/integration tests are `@Disabled`.**

### Backend Tests That Don't Exist

- `AuthControllerTest` (login endpoint completely untested)
- `UserControllerTest` (all user profile endpoints untested)
- `GymRepositoryTest`
- `ExerciseRepositoryTest`
- `WorkoutLogRepositoryTest`
- `UserRepositoryTest`
- `ExerciseSetRepositoryTest`

### Mobile Tests

| Test File | What It Tests | Quality |
|-----------|--------------|---------|
| `simple.test.ts` (expo) | Pure JS value assertions | Tests nothing real |
| `api.test.ts` (expo) | Module existence, AsyncStorage mocks | Surface-level only |
| `AuthContext.test.tsx` (expo) | Loading state, login/logout | Has inverted assertion bug |
| `api.test.ts` (mobile) | Interceptor mechanics | Uses `@ts-ignore`, fragile |
| `AuthContext.test.tsx` (mobile) | Login/logout AsyncStorage calls | Basic |

**Zero screen-level tests exist.** No tests for any of the 8 screens, navigation flows, WebSocket connections, or form validation. The Jest coverage threshold is set to 80% but actual coverage is likely under 10%.

---

## CI/CD Pipeline Issues

| Issue | Details |
|-------|---------|
| Type check always passes | `npx tsc --noEmit \|\| true` suppresses failures |
| Docker test is meaningless | Only runs `java -version`, not the app |
| No coverage enforcement | JaCoCo output uploaded as artifact but no threshold check |
| No lint step | Backend has no static analysis; mobile lint script exists but isn't in CI |
| No deployment stage | Docker image built but never pushed to a registry |
| No mobile native builds | No EAS Build integration in CI despite `eas.json` existing |
| No `mobile/` CI job | Only `mobile-expo` is tested; the bare RN app has zero CI |
| CI/CD doc is outdated | `docs/CI_CD.md` references `expo-build.yml` and jobs that don't exist |
| Duplicate deps | `@stomp/stompjs` and `sockjs-client` listed twice in `mobile/package.json` |
| Docker build skips tests | `mvn clean package -DskipTests` in Dockerfile |
| No `.dockerignore` | Build context includes unnecessary files |
| Docker uses H2 | Data lost on restart; no `docker-compose.yml` for PostgreSQL |

---

## Frontend-Backend API Inconsistencies

| Backend Endpoint | Frontend Status | Issue |
|-----------------|---------------|-------|
| `GET /api/users/me` | Not called (commented out) | AuthContext never hydrates user |
| `PUT /api/users/me` | Not called | No profile editing UI |
| `GET /api/users/fitness-levels` | Not called | No fitness level picker |
| `POST /api/users/schedule` | Not called | No schedule UI |
| `GET /api/users/schedule` | Not called | No schedule UI |
| `GET /api/users/buddies` | Not called | No buddy matching UI (core feature) |
| `GET /api/workouts/{id}` | Not called | No workout detail screen |
| `DELETE /api/workouts/{id}` | Not called | No delete UI |
| `GET /api/workouts/exercises` | Not called | Exercise picker is hardcoded |
| `GET /api/workouts/exercises/search` | Not called | No exercise search |
| `POST /api/workouts/exercises` | Not called | -- |
| `GET /api/chat/unread` | Not called | No unread badge |
| All `/api/gyms/*` | Not called | No GymController exists |

**12 of 20 backend endpoints have no frontend integration.**

### Type Mismatches

| Frontend Type | Backend Model | Mismatch |
|--------------|---------------|----------|
| `WorkoutLog {id, exerciseId, exerciseName, sets, date}` | `WorkoutLog {id, user, workoutDate, notes, durationMinutes, caloriesBurned, rating, exerciseSets}` | Completely different structure |
| `Exercise {id, name, category, muscleGroup}` | `Exercise {id, name, category, primaryMuscleGroup, secondaryMuscleGroup, ...}` | `muscleGroup` vs `primaryMuscleGroup` |
| `ChatPartner.fitnessLevel: string` | `FitnessLevel` enum | Should be union type |

---

## Code Quality Observations

### Duplicate Codebases

The `mobile/` and `mobile-expo/` directories contain near-identical code with only import-path differences. This is a maintenance burden -- one should be the canonical source.

### Missing TODO Comments

| File | Line | Comment |
|------|------|---------|
| `AuthController.java` | 49 | `// TODO: Implement JWT token generation` |
| `AuthContext.tsx` (both dirs) | 28 | `// TODO: Validate token and get user info` |
| `AuthContext.tsx` (both dirs) | 43 | `// TODO: Set user from response` |
| `api.ts` (both dirs) | 34 | `// TODO: Navigate to login` |
| `LogWorkoutScreen.tsx` (both dirs) | 35 | `// TODO: Open exercise picker modal` |

### Silent Error Swallowing

Every mobile screen catches errors with `console.error` only -- no user-facing error messages, no retry buttons, no error state UI. This affects LoginScreen, RegisterScreen, WorkoutsScreen, ChatScreen, and AuthContext.

### No Reusable Components

The README references `src/components/` but neither mobile variant has created it. There are no loading spinners, error states, cards, or custom button components anywhere.

---

## Priority Recommendations

### Must Fix Before Any Deployment

1. **Implement JWT authentication** -- token generation in login, JwtAuthenticationFilter, UserDetailsService
2. **Add `@JsonIgnore` on `User.password`** -- prevents credential leak
3. **Fix AuthContext user state** -- set user after login/register, hydrate on app restart
4. **Add ownership checks** -- verify workout/chat belongs to requesting user
5. **Add `@ControllerAdvice`** -- structured error responses, no stack traces

### Should Fix for MVP

6. **Implement UserService** -- real profile, schedule, buddy matching logic
7. **Create GymController** -- model and repository already exist
8. **Fix mobile navigation** -- add WorkoutDetail screen or remove the navigation call
9. **Add environment-based API URLs** -- stop hardcoding `localhost:8080`
10. **Fix WebSocket connection leak** in ChatScreen
11. **Add form validation** on all mobile screens
12. **Add user-facing error states** on all mobile screens

### Nice to Have

13. Add DTO layer and mappers
14. Restrict CORS to known origins
15. Add pagination to list endpoints
16. Consolidate duplicate mobile codebases
17. Enable disabled E2E tests
18. Add screen-level mobile tests
19. Add `docker-compose.yml` with PostgreSQL
20. Add CI coverage enforcement