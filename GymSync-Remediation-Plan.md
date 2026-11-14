# GymSync Remediation Plan — Make the App Work End-to-End

> **Created:** 2026-11-14  
> **Baseline commit:** `0585a45` (`main`)  
> **Scope:** Backend, Expo mobile app, database, local tooling, CI.  
> **Goal:** A developer can clone the repository, start the backend without external infrastructure, run the mobile app, and complete the core flows: register → login → manage profile → browse gyms → find buddies → log workouts → chat in real time.

---

## 1. Current State Summary

The project has improved substantially since the original analysis. JWT authentication, profile management, workout CRUD, gym APIs, chat REST endpoints, Flyway migrations, and a Docker profile now exist.

However, several defects still prevent the application from working end-to-end:

| ID | Severity | Problem | Impact |
|----|----------|---------|--------|
| P0-1 | Critical | Jackson serialization cycle between `WorkoutLog` and `ExerciseSet` | Workout list, workout detail, and adding exercise sets fail |
| P0-2 | Critical | No STOMP authentication interceptor; `Principal` is `null` on WebSocket messages | Real-time chat fails with a null pointer exception |
| P0-3 | Critical | Mobile always sends `rating = 0`, backend rejects values below 1 | Saving a workout fails unless the user selects a star rating |
| P0-4 | Critical | H2 test profile is only in `src/test/resources`; Maven wrapper is missing | Documented local startup (`./mvnw ... -Dspring.profiles.active=test`) does not start on H2 |
| P1-1 | High | Public exercises endpoint requires an authenticated `Principal` | Documented unauthenticated `curl` returns 500 |
| P1-2 | High | `Map.of` in chat partner response rejects `null` fitness levels | `/api/chat/partners` can return 500 |
| P1-3 | High | Invalid or expired JWT returns 403; mobile interceptor only handles 401 | Expired sessions are not cleared or redirected to login |
| P1-4 | High | Login failures and ownership failures return 500 | Wrong HTTP semantics; poor client behavior |
| P1-5 | High | CORS does not include Expo web's default port, and Security CORS is not enabled | Web build is blocked by CORS |
| P1-6 | High | Duplicate Expo entry files; `src/App.tsx` is dead and missing `WorkoutDetail` | Edits to the wrong file are ignored; navigation crash if entry changes |
| P1-7 | High | Frontend/backend JSON contracts disagree (`custom` vs `isCustom`, `exercise` vs `exerciseId`/`exerciseName`) | Workout detail cannot display exercise names reliably |
| P1-8 | High | No path to start a new chat; partner list only includes existing conversations | Chat feature is effectively unreachable for first-time users |
| P2-1 | Medium | No gym seed data | Gyms screen is always empty |
| P2-2 | Medium | Buddy matching UI and schedule editing UI are absent | Core MVP feature cannot be used |
| P2-3 | Medium | No `docker-compose.yml` or PostgreSQL provisioning | Full-stack setup is manual and fragile |
| P2-4 | Medium | No JaCoCo plugin, stale docs, shallow tests, duplicate mobile dependencies | CI claims coverage it does not produce; regressions go undetected |
| P2-5 | Medium | WebSocket origins and JWT defaults are insecure | Not production-ready |

---

## 2. Definition of Done

The plan is complete when all of the following are true:

1. `docker compose up` starts PostgreSQL and the backend; `GET /api/health` returns `{"status":"UP"}`.
2. A developer can start the backend on H2 without PostgreSQL:
   ```bash
   cd backend
   SPRING_PROFILES_ACTIVE=h2 ./mvnw spring-boot:run
   ```
3. Register → login → profile update works through the mobile app.
4. Creating a workout, adding exercise sets, listing workouts, and opening workout details all return valid JSON without recursion errors.
5. Two users can find each other as buddies, open a chat, and exchange messages in real time through the mobile app.
6. Gym list, city search, and student-discount filtering return seeded data.
7. Mobile auth survives an app restart; expired tokens return the user to the login screen.
8. `./mvnw verify`, `npm test`, `npm run lint`, and `npx tsc --noEmit` pass in `backend/` and `mobile-expo/`.
9. CI is green and produces a real coverage report.
10. All user-visible errors have readable messages; no silent `console.error`-only failures.

---

## 3. Workstreams and Recommended Order

| Order | Workstream | IDs | Rough effort |
|-------|------------|-----|--------------|
| 1 | Backend serialization contract | P0-1 | 2–4 hours |
| 2 | Workout save validation | P0-3 | 1–2 hours |
| 3 | Local runtime and tooling | P0-4 | 2–4 hours |
| 4 | WebSocket authentication | P0-2 | 4–8 hours |
| 5 | API correctness and error semantics | P1-1, P1-2, P1-3, P1-4 | 4–6 hours |
| 6 | CORS and WebSocket origin policy | P1-5 | 1–2 hours |
| 7 | Mobile entry point and contract alignment | P1-6, P1-7 | 4–6 hours |
| 8 | Chat initiation flow | P1-8 | 4–6 hours |
| 9 | Seed data and missing MVP screens | P2-1, P2-2 | 1–2 days |
| 10 | Infrastructure, CI, tests, docs | P2-3, P2-4, P2-5 | 1–2 days |

Complete workstreams 1–4 before attempting end-to-end manual testing. Workstreams 5–8 can be developed in parallel if separate branches are used.

---

## 4. P0-1 — Break the Workout JSON Serialization Cycle

### Problem

`WorkoutLog` contains `List<ExerciseSet>`, and each `ExerciseSet` contains a back-reference to `WorkoutLog`:

- `backend/src/main/java/com/gymsync/model/WorkoutLog.java:34-35`
- `backend/src/main/java/com/gymsync/model/ExerciseSet.java:18-46`

Neither side of the back-reference is excluded from Jackson serialization. When a workout with at least one set is returned, Jackson recurses until it throws:

```text
com.fasterxml.jackson.databind.JsonMappingException:
Infinite recursion (StackOverflowError)
```

This was verified locally with Jackson 2.15.3 using the same object shape.

### Affected endpoints

- `GET /api/workouts`
- `GET /api/workouts/{id}`
- `POST /api/workouts/{workoutId}/sets`
- Any future endpoint returning a `WorkoutLog` with loaded `exerciseSets`

### Immediate fix (P0)

Add an explicit back-reference exclusion on `ExerciseSet`:

```java
// backend/src/main/java/com/gymsync/model/ExerciseSet.java

@JsonIgnore
public WorkoutLog getWorkoutLog() {
    return workoutLog;
}
```

Import `com.fasterxml.jackson.annotation.JsonIgnore`.

Keep the setter and JPA mapping unchanged. Serialization of `WorkoutLog → exerciseSets` still works; serialization of `ExerciseSet → workoutLog` stops.

Optionally add proxy-safe annotations to avoid Hibernate internals leaking:

```java
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
```

on entities that may be returned as proxies.

### Proper fix (P1, recommended)

Introduce response DTOs so entities are never serialized directly:

- `WorkoutLogResponse`
  - `id`, `workoutDate`, `notes`, `durationMinutes`, `caloriesBurned`, `rating`, `createdAt`, `exerciseSets`
- `ExerciseSetResponse`
  - `id`, `exerciseId`, `exerciseName`, `setNumber`, `reps`, `weightKg`, `durationSeconds`, `notes`, `completed`
- Mapper methods in the controller/service layer.

This also fixes P1-7 and prevents accidental exposure of the full `User` object inside workout responses.

### Acceptance criteria

- `GET /api/workouts` returns `200` when the current user has a workout with sets.
- Response contains `exerciseSets`, and each set has no `workoutLog` field.
- `POST /api/workouts/{id}/sets` returns `200` and the updated workout.
- Add an integration test that serializes the response through MockMvc; calling the controller method directly is not sufficient because it bypasses Jackson.

### Test to add

`backend/src/test/java/com/gymsync/integration/WorkoutSerializationTest.java`

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(TestSecurityConfig.class)
class WorkoutSerializationTest {

    @Test
    @WithMockUser(username = "testuser")
    void getWorkouts_WithExerciseSets_ShouldNotRecurse() throws Exception {
        // Create user, exercise, workout, and set through repositories.
        // GET /api/workouts and expect 200.
        // Assert exerciseSets[0].workoutLog does not exist.
    }
}
```

---

## 5. P0-2 — Add STOMP WebSocket Authentication

### Problem

The backend exposes a SockJS/STOMP endpoint at `/ws/chat`:

- `backend/src/main/java/com/gymsync/config/WebSocketConfig.java:21-25`

There is no `ChannelInterceptor` that authenticates STOMP frames. The mobile client sends the JWT only in the STOMP `CONNECT` frame:

- `mobile-expo/src/services/ChatWebSocketService.ts:35-39`

The HTTP SockJS handshake carries no `Authorization` header, so Spring cannot derive a `Principal`. Consequently, `ChatController` receives `null`:

```java
// ChatController.java:28-33
@MessageMapping("/chat.send")
public void sendMessage(@Payload ChatMessageRequest request, Principal principal) {
    ChatMessage saved = chatService.sendMessage(
            principal.getName(), // NullPointerException
            ...
```

### Affected flows

- Sending a message through STOMP
- Sending typing notifications through STOMP
- Server-side delivery to `/user/queue/messages`
- Any unread or delivery receipts sent to a user destination

The REST fallback (`POST /api/chat/send`) works, but the mobile app does not use it.

### Implementation

1. Create `backend/src/main/java/com/gymsync/security/WebSocketAuthInterceptor.java`.

```java
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    public WebSocketAuthInterceptor(JwtUtil jwtUtil,
                                    CustomUserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null) {
                header = accessor.getFirstNativeHeader("authorization");
            }

            if (header == null || !header.startsWith("Bearer ")) {
                throw new MessagingException("Missing or invalid Authorization header");
            }

            String token = header.substring(7);
            String username = jwtUtil.extractUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            if (!jwtUtil.isTokenValid(token, userDetails)) {
                throw new MessagingException("Invalid or expired token");
            }

            accessor.setUser(new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities()));
        }

        return message;
    }
}
```

2. Register the interceptor in `WebSocketConfig`:

```java
private final WebSocketAuthInterceptor authInterceptor;

public WebSocketConfig(WebSocketAuthInterceptor authInterceptor) {
    this.authInterceptor = authInterceptor;
}

@Override
public void configureClientInboundChannel(ChannelRegistration registration) {
    registration.interceptors(authInterceptor);
}
```

3. Optionally add a null guard in `ChatController` as defense in depth:

```java
if (principal == null) {
    throw new MessagingException("Unauthenticated WebSocket message");
}
```

4. Restrict WebSocket origins using a configuration property instead of `"*"`:

```java
@Value("${gymsync.cors.allowed-origins}")
private String[] allowedOrigins;

registry.addEndpoint("/ws/chat")
        .setAllowedOriginPatterns(allowedOrigins)
        .withSockJS();
```

### Client-side verification

The React Native client uses `sockjs-client`, which may require polyfills in React Native. Verify at runtime:

- `TextEncoder` is available. `text-encoding` is already a dependency but never imported; expose the polyfill in `index.ts` or the WebSocket service if needed.
- `global.self` and related browser globals required by SockJS are available in Expo.
- Header casing is preserved from `connectHeaders`.

If SockJS proves unreliable in React Native, an alternative is to use the native WebSocket transport with a token query parameter and a corresponding server-side handshake handler. Keep SockJS as the first option because it is already wired.

### Acceptance criteria

- `Principal` is non-null in `@MessageMapping` methods.
- Two authenticated users can send and receive `/user/queue/messages` frames.
- A connection without a token receives a STOMP `ERROR` frame and cannot send messages.
- Typing notifications are delivered to the intended user only.
- Add an integration test using `WebSocketStompClient` and `@SpringBootTest(webEnvironment = RANDOM_PORT)`.

---

## 6. P0-3 — Fix Workout Save Rating Validation

### Problem

`LogWorkoutScreen` initializes the rating to `0` and always includes it in the request:

- `mobile-expo/src/screens/LogWorkoutScreen.tsx:50`
- `mobile-expo/src/screens/LogWorkoutScreen.tsx:168-174`

The backend entity rejects `0` because of `@Min(1)`:

- `backend/src/main/java/com/gymsync/model/WorkoutLog.java:31-32`

`@Valid` is applied to the request body in `WorkoutController.createWorkout`, so any workout saved without selecting a star silently fails with `400 Bad Request`.

### Fix

Mobile:

```ts
const workout = {
  workoutDate: date.toISOString().split('T')[0],
  durationMinutes: duration ? parseInt(duration, 10) : null,
  caloriesBurned: calories ? parseInt(calories, 10) : null,
  rating: rating > 0 ? rating : null,
  notes: notes.trim() || null,
};
```

Backend:

- Keep `@Min(1) @Max(5)` on the nullable `Double rating`; Bean Validation skips `null`.
- Optionally add a `@JsonSetter` or service-level normalization that converts `0` to `null` for backward compatibility with older clients. Prefer the mobile fix as the primary solution.

### Additional workout form issues to fix in the same change

1. Bodyweight sets are silently dropped. Current code saves a set only when both reps and weight are present:

   ```ts
   if (set.reps && set.weightKg) { ... }
   ```

   Change to save when `set.reps` is present, and send `weightKg: null` when blank.

2. Partial workout saves. The workout is created first, then sets are posted sequentially. If a set fails, the workout remains without that set. Options:
   - Add a single backend endpoint that creates a workout and its sets transactionally.
   - Or, on mobile, delete the workout if any set fails.
   - Preferred long-term fix: `POST /api/workouts` accepts an optional `exerciseSets` array and persists everything in one transaction.

3. Numeric inputs should be validated client-side (positive integers only) and parsed with `parseInt(value, 10)`.

### Acceptance criteria

- Saving a workout with no rating returns `200`.
- Saving a workout with rating `1`–`5` returns `200`.
- Saving a bodyweight-only set succeeds.
- A failed set post does not leave a partially saved workout.

---

## 7. P0-4 — Fix Local Runtime and Tooling

### 7.1 Add the Maven wrapper

The repository contains no `mvnw`, `mvnw.cmd`, or `.mvn/wrapper/`, but README and `HOW_TO_TEST_LOCALLY.md` instruct developers to run `./mvnw`. Maven is also absent from the current development machine.

Add the wrapper:

```bash
cd backend
mvn wrapper:wrapper -Dmaven=3.9.9
```

If Maven is not installed, download the wrapper files from the official Maven Wrapper distribution or copy them from another project pinned to Maven 3.9.x. Commit:

- `backend/mvnw`
- `backend/mvnw.cmd`
- `backend/.mvn/wrapper/maven-wrapper.properties`
- `backend/.mvn/wrapper/maven-wrapper.jar` if the distribution requires it

Verify:

```bash
cd backend
./mvnw -v
```

### 7.2 Put the H2 profile on the main runtime classpath

`application-test.properties` currently exists only at:

```text
backend/src/test/resources/application-test.properties
```

It is visible to `mvn test`, but not to `spring-boot:run` or a packaged JAR. Therefore the documented command

```bash
./mvnw spring-boot:run -Dspring.profiles.active=test
```

still uses PostgreSQL, `ddl-auto=validate`, and Flyway.

Create a runtime H2 profile:

**`backend/src/main/resources/application-h2.properties`**

```properties
spring.application.name=GymSync-H2

spring.datasource.url=jdbc:h2:mem:gymsync;DB_CLOSE_DELAY=-1
spring.datasource.username=sa
spring.datasource.password=
spring.datasource.driver-class-name=org.h2.Driver

spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=false

spring.flyway.enabled=false

gymsync.jwt.secret=localH2SecretKeyChangeMe123456789012345678901234
gymsync.jwt.expiration=86400000

logging.level.com.gymsync=INFO
logging.level.org.springframework.security=WARN
```

Keep `application-test.properties` for automated tests. Update documentation to use the new profile:

```bash
cd backend
SPRING_PROFILES_ACTIVE=h2 ./mvnw spring-boot:run
```

For PowerShell:

```powershell
$env:SPRING_PROFILES_ACTIVE = "h2"
.\mvnw.cmd spring-boot:run
```

### 7.3 Make the PostgreSQL URL configurable

Update `backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/gymsync}
spring.datasource.username=${DB_USERNAME:postgres}
spring.datasource.password=${DB_PASSWORD:password}
```

This allows Docker Compose and CI to inject the database URL without editing files.

### 7.4 Update documentation

Update the following files so they match the new runtime:

- `README.md` — Quick Start uses `./mvnw`, includes H2 option and PostgreSQL option.
- `HOW_TO_TEST_LOCALLY.md` — replace every `-Dspring.profiles.active=test` runtime instruction with the H2 profile; keep `test` only for `./mvnw test`.
- Add a note that the H2 database is in-memory and resets on restart.
- Remove references to non-existent test classes such as `WorkoutServiceTest`.

### Acceptance criteria

- On a machine without PostgreSQL and without a global Maven install, `SPRING_PROFILES_ACTIVE=h2 ./mvnw spring-boot:run` starts the backend.
- `curl http://localhost:8080/api/health` returns `200`.
- `./mvnw test` still uses H2 and passes.
- Documentation contains no broken `./mvnw` or wrong-profile instructions.

---

## 8. P1-1 — Fix the Exercises Endpoint Contract

### Problem

`SecurityConfig` permits the endpoint without authentication:

- `backend/src/main/java/com/gymsync/config/SecurityConfig.java:36`

But `WorkoutController.getExercises` requires a `Principal`:

- `backend/src/main/java/com/gymsync/controller/WorkoutController.java:113-119`

An unauthenticated request reaches the controller, `principal` is `null`, and `principal.getName()` throws a null pointer exception.

### Recommended fix

The endpoint returns both global and user-created exercises, so it requires a user identity. Remove the public rule:

```java
// SecurityConfig.java
.requestMatchers("/api/workouts/exercises").permitAll() // delete
```

Then both `/api/workouts/exercises` and `/api/workouts/exercises/search` require authentication. Update `HOW_TO_TEST_LOCALLY.md` and `docs/api.md`, which currently call the endpoint without a token.

Alternative: keep a public, user-independent catalog endpoint and require authentication only for custom exercises. This requires a new service method that queries `findByIsCustomFalse()`.

### Acceptance criteria

- `GET /api/workouts/exercises` without a token returns `401`.
- With a valid token, it returns the global catalog plus the current user's custom exercises.
- Documentation reflects the auth requirement.

---

## 9. P1-2 — Fix Chat Partner Response Null Handling

### Problem

`ChatService.getChatPartners` uses `Map.of`:

- `backend/src/main/java/com/gymsync/service/ChatService.java:79-91`

`Map.of` rejects null values. `fitnessLevel` is optional during registration, so a partner without a fitness level causes a `NullPointerException` and a 500 response.

### Fix

Create a DTO instead of a map:

```java
public class ChatPartnerResponse {
    private Long id;
    private String username;
    private String name;
    private String fitnessLevel; // nullable
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private long unreadCount;
}
```

Map entities explicitly, allowing null fields. This also gives the frontend a stable contract and supports future unread badges.

### Acceptance criteria

- `/api/chat/partners` returns `200` when a partner has no fitness level.
- Response includes at least `id`, `username`, `name`, and `fitnessLevel` (nullable).
- Add a service or integration test for the null case.

---

## 10. P1-3 and P1-4 — Correct HTTP Error Semantics

### Problem

1. No custom `AuthenticationEntryPoint` is configured. Spring Security defaults to `403 Forbidden` for unauthenticated requests. The mobile interceptor only reacts to `401` (`mobile-expo/src/services/api.ts:38-55`), so expired tokens leave the app in a broken state.
2. `GlobalExceptionHandler` catches every `RuntimeException` and returns `500`, including:
   - `BadCredentialsException` during login
   - ownership violations
   - invalid enum values
   - missing resources
3. The handler decides `404` by searching for the word `"not found"` in the exception message, which is fragile.

### Fix

#### Backend exception types

Create explicit exceptions:

- `ResourceNotFoundException`
- `ForbiddenException`
- `InvalidRequestException` (optional)

Replace generic `RuntimeException` throws in services and controllers where practical.

#### Global exception handler

Handle each case explicitly:

| Exception | Status |
|-----------|--------|
| `MethodArgumentNotValidException` | `400` |
| `IllegalArgumentException` | `400` |
| `BadCredentialsException` | `401` |
| `UsernameNotFoundException` | `401` |
| `AccessDeniedException` | `403` |
| `ForbiddenException` | `403` |
| `ResourceNotFoundException` | `404` |
| Any other `Exception` | `500` with a generic message |

Do not expose exception messages or stack traces for unexpected 500 responses. Log them server-side.

#### Security entry point

```java
.exceptionHandling(exception -> exception
    .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
    .accessDeniedHandler((request, response, ex) ->
        response.sendError(HttpStatus.FORBIDDEN.value()))
)
```

#### Mobile

Keep the 401 interceptor, but also treat `403` from protected endpoints as an authentication failure if it occurs without a valid token. Prefer the backend fix so the mobile contract stays simple.

### Acceptance criteria

- Wrong password returns `401` with a structured error body.
- Missing workout returns `404`.
- Another user's workout returns `403`.
- Missing or expired token returns `401`.
- Mobile clears the token and returns to login after a 401.
- No endpoint returns a raw stack trace.

---

## 11. P1-5 — Fix CORS and WebSocket Origin Policy

### Problem

- `backend/src/main/java/com/gymsync/config/CorsConfig.java:13` allows only `localhost:8080`, `localhost:19000`, and `localhost:19006`.
- Expo web in current SDKs defaults to `http://localhost:8081`, so browser requests are blocked.
- Spring Security does not enable CORS, so preflight requests to protected endpoints can be rejected before MVC CORS applies.
- `WebSocketConfig` allows all origins.

### Fix

1. Define a `CorsConfigurationSource` bean instead of, or in addition to, `WebMvcConfigurer`:

```java
@Bean
public CorsConfigurationSource corsConfigurationSource(
        @Value("${gymsync.cors.allowed-origins}") List<String> origins) {

    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(origins);
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
}
```

2. Enable CORS in `SecurityConfig`:

```java
.cors(Customizer.withDefaults())
```

3. Externalize origins:

```properties
gymsync.cors.allowed-origins=http://localhost:8081,http://localhost:19006,http://localhost:19000
```

4. Use the same property for WebSocket `setAllowedOriginPatterns(...)`.

5. For local development, document adding the developer machine LAN IP or use a stricter development-only pattern. Do not use `"*"` with credentials.

### Acceptance criteria

- A browser request from `http://localhost:8081` to `/api/health` succeeds.
- Preflight `OPTIONS` to a protected endpoint returns the CORS headers and `200`.
- WebSocket handshake from an allowed origin succeeds; a disallowed origin fails.

---

## 12. P1-6 — Consolidate the Expo Entry Point

### Problem

`mobile-expo` contains two app entry files:

- `mobile-expo/App.tsx` — used by `index.ts`, and it correctly registers `WorkoutDetail`.
- `mobile-expo/src/App.tsx` — unused duplicate, missing the `WorkoutDetail` screen registration.

`mobile-expo/index.ts` imports `./App`, so the root file is the real entry. Anyone editing `src/App.tsx` sees no effect. If someone changes the import to `src/App`, navigation to `WorkoutDetail` will crash.

The bare React Native app in `mobile/` has no `WorkoutDetailScreen` at all.

### Recommended structure

Make `mobile-expo/src/App.tsx` the canonical entry:

1. Copy the correct root `App.tsx` content into `src/App.tsx`, ensuring both screens are registered:

```tsx
<Stack.Screen name="Main" component={TabNavigator} />
<Stack.Screen name="LogWorkout" component={LogWorkoutScreen} />
<Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
```

2. Change `mobile-expo/index.ts`:

```ts
import App from './src/App';
```

3. Delete `mobile-expo/App.tsx`.

4. Update imports inside `src/App.tsx` to use relative paths or the existing aliases consistently.

5. Decide what to do with `mobile/`:
   - Preferred: mark it deprecated in README, remove it from docs and CI, and delete it in a follow-up after confirming nobody depends on it.
   - If it must stay: add the missing `WorkoutDetailScreen`, fix its `AuthContext` import from `@types` to a valid path, and remove duplicate dependencies from `mobile/package.json`.

### Acceptance criteria

- Exactly one app entry file exists for the Expo project.
- `WorkoutDetail` navigation works from the Workouts tab.
- No source file references a screen that is not registered.
- README clearly states which mobile project is canonical.

---

## 13. P1-7 — Align Frontend and Backend JSON Contracts

### Problems

| Backend output | Frontend expectation | Effect |
|----------------|----------------------|--------|
| `Exercise.isCustom` serializes as `custom` because of the boolean getter | `Exercise.isCustom` in `types/index.ts:66` | Custom flag is unavailable |
| `ExerciseSet.exercise` is a full object | `ExerciseSet.exerciseId` and `exerciseName` in `types/index.ts:69-79` | Workout detail groups by `Exercise #1` |
| `WorkoutLog.user` is serialized as a full user object | Not typed in frontend | Unnecessary data exposure and payload size |
| `ExerciseSet.workoutLog` is serialized | Not typed | Serialization recursion |

### Fix

1. Prefer backend DTOs (see P0-1) that define the contract explicitly:
   - `ExerciseSetResponse` with `exerciseId` and `exerciseName`.
   - `ExerciseResponse` with `isCustom`.
   - `WorkoutLogResponse` without the user object.
2. Alternatively, add Jackson annotations:
   ```java
   @JsonProperty("isCustom")
   public boolean isCustom() { return isCustom; }
   ```
   and add computed `exerciseId`/`exerciseName` getters on `ExerciseSet`.
3. Update `mobile-expo/src/types/index.ts` to match the chosen contract exactly.
4. Update `WorkoutDetailScreen` to use `exerciseName` and `exerciseId` without fallback guessing once the contract is guaranteed.
5. Add a contract test that asserts the JSON keys for a workout response.

### Acceptance criteria

- Workout detail displays exercise names.
- Exercise responses expose `isCustom`.
- TypeScript types match actual API responses.
- No `any` casts are needed to read exercise data.

---

## 14. P1-8 — Add a Way to Start a Chat

### Problem

The chat screen loads partners from `/api/chat/partners`:

- `mobile-expo/src/screens/ChatScreen.tsx:67-78`

The backend query returns only users with an existing message:

- `backend/src/main/java/com/gymsync/repository/ChatMessageRepository.java:30-31`

A new user has no partners and no UI to create a conversation. Chat is therefore unreachable unless a message is inserted directly into the database.

### Fix

1. Add a "Message" action to buddy results and profile views.
2. Add a stack screen for a chat thread, or navigate to the Chat tab with a `partnerUsername` parameter.
3. Optionally add a "New Chat" button that opens a searchable list of buddies or all users (with privacy considerations).
4. Backend addition (optional): `POST /api/chat/conversations` that validates the target user exists and returns or creates the conversation shell.
5. Ensure the selected partner can be passed to `ChatScreen` and used for both REST history and STOMP messages.

### Acceptance criteria

- A user with no prior messages can select a buddy and open a chat.
- The first message is persisted and delivered.
- The partner appears in `/api/chat/partners` afterward.
- Empty state explains how to start a chat.

---

## 15. P2-1 — Seed Gym Data

### Problem

`gyms` table exists and `GymController` works, but no migration inserts rows. The Gyms screen is always empty.

### Fix

Add a new migration, never edit an already-applied migration:

```text
backend/src/main/resources/db/migration/V4__seed_gyms.sql
```

Include 5–10 realistic development records with:

- `name`
- `address`
- `city`
- `latitude` / `longitude`
- `phone`
- `website`
- `monthly_price`
- `student_discount`
- `opening_hours`
- `has_student_discount`

Use deterministic IDs or let the sequence assign them. Keep the SQL portable enough for PostgreSQL and, if needed, H2.

### Acceptance criteria

- `/api/gyms` returns seeded gyms.
- City search returns matching results.
- `/api/gyms/student-discount` returns non-empty data.
- Gyms screen displays cards without errors.

---

## 16. P2-2 — Build Missing MVP Screens

### 16.1 Buddy matching

Backend endpoint already exists:

- `GET /api/users/buddies?gymLocation=...&fitnessLevel=...`

Add a `BuddiesScreen`:

- Filters: gym location and fitness level.
- List: name, username, fitness level, gym location, workout goals.
- Actions: view profile, start chat.
- States: loading, empty, error with retry, pull-to-refresh.

Add the screen to the tab navigator or surface it prominently on Home. The README calls buddy matching the core feature, so it should not remain backend-only.

### 16.2 Schedule editing

Backend endpoints:

- `GET /api/users/schedule`
- `POST /api/users/schedule`

Add an edit mode to `ProfileScreen` or a dedicated `ScheduleScreen`:

- Select day, start time, end time.
- Add/remove slots.
- Persist via `POST /api/users/schedule` with `{ "slots": [...] }`.
- Display validation errors.

### 16.3 Gym map (optional)

`react-native-maps` is installed but unused. Either:

- Implement a map view with gym markers, or
- Remove the dependency and the claim from README.

Do not leave a dependency that suggests a feature that does not exist.

### Acceptance criteria

- A user can find another user by gym and fitness level.
- A user can edit and persist availability.
- The app has a discoverable path to both features.

---

## 17. P2-3 — Add Docker Compose and Production Configuration

### Problem

The backend defaults to PostgreSQL, but there is no orchestration file. The Docker image uses H2 with `create-drop`, so data is lost on every restart. `docker-compose.yml` is absent.

### Fix

Add `docker-compose.yml` at the repository root:

```yaml
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: gymsync
      POSTGRES_USER: gymsync
      POSTGRES_PASSWORD: gymsync_dev_password
    ports:
      - "5432:5432"
    volumes:
      - gymsync_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gymsync -d gymsync"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build: ./backend
    environment:
      SPRING_PROFILES_ACTIVE: prod
      DB_URL: jdbc:postgresql://db:5432/gymsync
      DB_USERNAME: gymsync
      DB_PASSWORD: gymsync_dev_password
      JWT_SECRET: change-me-to-a-long-random-secret-at-least-32-bytes
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy

volumes:
  gymsync_pgdata:
```

Add `backend/src/main/resources/application-prod.properties`:

```properties
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.flyway.enabled=true
logging.level.com.gymsync=INFO
logging.level.org.springframework.security=WARN
```

Add `.env.example` with the variables and a clear warning not to commit real secrets.

### Acceptance criteria

- `docker compose up --build` starts both services.
- Flyway creates the schema in PostgreSQL.
- `/api/health` returns `200`.
- Data survives a backend container restart.
- No production config contains a hardcoded JWT secret fallback.

---

## 18. P2-4 — CI, Coverage, Tests, and Documentation

### 18.1 Maven and CI

1. Use the Maven wrapper in CI:
   ```bash
   ./mvnw checkstyle:check
   ./mvnw verify
   ```
2. Add JaCoCo to `backend/pom.xml`:
   - `prepare-agent`
   - `report`
   - Optional `check` goal with a minimum line coverage threshold (start at 60%, raise gradually).
3. Ensure the CI artifact path matches the generated report:
   ```text
   backend/target/site/jacoco/
   ```
4. Remove the CI Docker step's dependency on the non-existent `test` profile. Use the built-in `docker` profile or explicitly set:
   ```bash
   -e SPRING_PROFILES_ACTIVE=docker
   -e SPRING_FLYWAY_ENABLED=false
   ```
   Keep the `/api/health` wait loop.
5. Do not use `|| true` for type checking or linting.

### 18.2 Mobile CI

1. Fix the ESLint script for ESLint 9 flat config:
   ```json
   "lint": "eslint ."
   ```
   `--ext` is an eslintrc-era option and is not valid with flat config.
2. Add a `type-check` script:
   ```json
   "type-check": "tsc --noEmit"
   ```
   and run it in CI.
3. Keep `npm ci --legacy-peer-deps` until the picker dependency is replaced.
4. Replace `@react-native-community/picker` with `@react-native-picker/picker`, which is the maintained package and is compatible with current React Native versions.
5. Add a `--coverage` run once screen tests exist.

### 18.3 Tests to add

Backend:

| Test | Purpose |
|------|---------|
| `WorkoutSerializationTest` | Prevent Jackson recursion regression |
| `WebSocketAuthInterceptorTest` | Validate CONNECT token handling |
| `ChatServiceTest` | Null fitness level, partner mapping, unread counts |
| `GymRepositoryTest` | Seeded gym search and discount queries |
| `SecurityErrorSemanticsTest` | 401 for missing token, 403 for forbidden, 404 for missing resource |
| `AuthControllerTest` additions | Login failure returns 401, registration validation |

Mobile:

| Test | Purpose |
|------|---------|
| `AuthContext` integration | Login stores token, hydrates user, restart restores session |
| `LoginScreen` | Invalid input and failed login show messages |
| `WorkoutsScreen` | Loading, empty, error, and populated states |
| `WorkoutDetailScreen` | Renders sets and exercise names |
| `ChatScreen` | Partner selection and message send |
| `ApiClient` | 401 clears token and calls auth callback |

For screen tests, switch the Jest configuration to the `jest-expo` preset while keeping pure logic tests. The current `testEnvironment: 'node'` plus `ts-jest` setup cannot render React Native components meaningfully.

### 18.4 Documentation cleanup

Update:

- `README.md` — current features, quick start, H2 and PostgreSQL options, canonical mobile project, test commands.
- `HOW_TO_TEST_LOCALLY.md` — correct profile commands, remove non-existent tests, correct public-endpoint examples.
- `docs/api.md` — auth requirements, request/response examples matching DTOs, error status codes.
- `docs/CI_CD.md` — actual workflow jobs and coverage behavior.
- `GymSync-Analysis-Report.md` and `GymSync-Fix-Plan.md` — mark as historical or update the status tables; they currently claim items are pending that have been implemented.

### 18.5 Cleanup

- Remove duplicate dependencies from `mobile/package.json` (`@stomp/stompjs`, `sockjs-client`, `text-encoding`).
- Remove dead entry files.
- Remove unused imports and `any` casts flagged by ESLint.
- Ensure `README.md` does not reference directories or files that do not exist.

---

## 19. End-to-End Test Script

Use this checklist after each milestone. Run against the H2 profile first, then PostgreSQL/Docker.

### 19.1 Backend startup

```bash
cd backend
SPRING_PROFILES_ACTIVE=h2 ./mvnw spring-boot:run
```

Expected: application starts; `/api/health` returns `200`.

### 19.2 Register and login two users

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","username":"alice","email":"alice@example.com","password":"password123","fitnessLevel":"INTERMEDIATE","gymLocation":"McFit Vienna"}'

curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob","username":"bob","email":"bob@example.com","password":"password123","fitnessLevel":"BEGINNER","gymLocation":"McFit Vienna"}'
```

Log in and capture tokens:

```bash
ALICE_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}' | jq -r .token)

BOB_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"password123"}' | jq -r .token)
```

Expected: both logins return a JWT.

### 19.3 Profile and buddy matching

```bash
curl http://localhost:8080/api/users/me -H "Authorization: Bearer $ALICE_TOKEN"
curl "http://localhost:8080/api/users/buddies?gymLocation=McFit%20Vienna" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

Expected: Alice's profile; Bob appears in buddy results.

### 19.4 Workout flow

```bash
# Create workout without rating
WORKOUT_ID=$(curl -s -X POST http://localhost:8080/api/workouts \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workoutDate":"2026-11-14","durationMinutes":60,"caloriesBurned":300,"notes":"Push day"}' \
  | jq -r .id)

# Add a set
curl -X POST "http://localhost:8080/api/workouts/$WORKOUT_ID/sets" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"exerciseId":1,"setNumber":1,"reps":10,"weightKg":60}'

# List and detail must both return 200 and valid JSON
curl -i http://localhost:8080/api/workouts -H "Authorization: Bearer $ALICE_TOKEN"
curl -i "http://localhost:8080/api/workouts/$WORKOUT_ID" -H "Authorization: Bearer $ALICE_TOKEN"
```

Expected: create returns `200`; add-set returns `200`; list/detail return `200` with `exerciseSets` and no recursion error.

### 19.5 Gyms

```bash
curl http://localhost:8080/api/gyms
curl "http://localhost:8080/api/gyms/search?city=Vienna"
curl http://localhost:8080/api/gyms/student-discount
```

Expected: non-empty arrays after the seed migration.

### 19.6 Chat REST fallback

```bash
curl -X POST http://localhost:8080/api/chat/send \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiverUsername":"bob","content":"Hello!","type":"CHAT"}'

curl http://localhost:8080/api/chat/history/bob -H "Authorization: Bearer $ALICE_TOKEN"
curl http://localhost:8080/api/chat/unread -H "Authorization: Bearer $BOB_TOKEN"
curl http://localhost:8080/api/chat/partners -H "Authorization: Bearer $ALICE_TOKEN"
```

Expected: message persists; history shows it; Bob's unread count increments; partner list works.

### 19.7 Real-time chat (after P0-2)

1. Open two app instances or two browser tabs connected as Alice and Bob.
2. Select each other and connect.
3. Send a message from Alice; it appears for Bob without refresh.
4. Send from Bob; it appears for Alice.
5. Verify a third client with no token cannot connect.

### 19.8 Mobile flow

1. Register a new user.
2. Force-close and reopen the app; the session should remain active.
3. Edit profile; changes persist.
4. Log a workout with and without a rating.
5. Add a bodyweight-only set.
6. Open workout detail; exercise names display.
7. Browse gyms; search by city; toggle student discount.
8. Open buddies; message a buddy.
9. Log out; log in again.
10. Invalidate the token server-side or shorten expiration; verify the app returns to login with a clear message.

---

## 20. Milestones

| Milestone | Includes | Exit criteria |
|-----------|----------|---------------|
| M1 — Backend usable on H2 | P0-1, P0-3, P0-4 | Workout flow works via curl against H2 |
| M2 — Real-time chat | P0-2, P1-8 (minimal) | Two authenticated clients exchange messages |
| M3 — Correct API contracts | P1-1 through P1-7 | All endpoints return correct status codes and JSON; mobile types match |
| M4 — Core product flows | P2-1, P2-2 | Gyms seeded; buddy and schedule screens usable |
| M5 — Production readiness | P2-3, P2-4, P2-5 | Docker Compose, coverage, CI, docs, and security baselines complete |

---

## 21. Risks and Cautions

1. **Flyway checksums are immutable.** Never edit `V1__init.sql`, `V2__add_chat_messages.sql`, or `V3__add_exercises_and_workouts.sql` after they have been applied to a database. Add `V4`, `V5`, etc.
2. **DTO migration touches both backend and mobile.** Change the backend contract and the TypeScript types in the same PR, or the app will break between deployments.
3. **STOMP header handling can vary behind proxies.** Accept both `Authorization` and `authorization`; log rejected CONNECT frames without logging the token.
4. **SockJS in React Native needs browser polyfills.** Verify `TextEncoder` and related globals; if SockJS remains unstable, switch to a native WebSocket transport with a handshake token.
5. **H2 is not PostgreSQL.** Avoid PostgreSQL-only SQL in shared migrations, or keep H2 as a test-only convenience. Verify every new migration against both databases.
6. **Do not use wildcard CORS with credentials.** It is invalid and insecure. Use an explicit property-driven allowlist.
7. **Do not expose entity graphs directly.** DTOs prevent recursion, accidental password/profile leakage, and frontend contract drift.
8. **The current tests bypass Jackson.** Controller unit tests calling methods directly will never catch serialization cycles. Use MockMvc for anything that asserts response bodies.
9. **Partial workout saves are a data-integrity issue.** Prefer one transactional endpoint over sequential mobile requests.
10. **The repository contains two mobile codebases.** Pick one canonical project early; maintaining both without parity tests will keep producing stale features.

---

## 22. File Inventory

### New files

```text
backend/mvnw
backend/mvnw.cmd
backend/.mvn/wrapper/maven-wrapper.properties
backend/src/main/resources/application-h2.properties
backend/src/main/resources/application-prod.properties
backend/src/main/java/com/gymsync/security/WebSocketAuthInterceptor.java
backend/src/main/java/com/gymsync/dto/WorkoutLogResponse.java
backend/src/main/java/com/gymsync/dto/ExerciseSetResponse.java
backend/src/main/java/com/gymsync/dto/ExerciseResponse.java
backend/src/main/java/com/gymsync/dto/ChatPartnerResponse.java
backend/src/main/java/com/gymsync/exception/ResourceNotFoundException.java
backend/src/main/java/com/gymsync/exception/ForbiddenException.java
backend/src/main/resources/db/migration/V4__seed_gyms.sql
backend/src/test/java/com/gymsync/integration/WorkoutSerializationTest.java
backend/src/test/java/com/gymsync/security/WebSocketAuthInterceptorTest.java
backend/src/test/java/com/gymsync/service/ChatServiceTest.java
docker-compose.yml
.env.example
mobile-expo/src/screens/BuddiesScreen.tsx
mobile-expo/src/screens/ScheduleScreen.tsx   (if separate from Profile)
mobile-expo/src/screens/WorkoutDetailScreen.tsx  (already exists; keep)
```

### Modified files

```text
backend/pom.xml                                  JaCoCo, dependency cleanup
backend/src/main/java/com/gymsync/config/SecurityConfig.java
backend/src/main/java/com/gymsync/config/CorsConfig.java
backend/src/main/java/com/gymsync/config/WebSocketConfig.java
backend/src/main/java/com/gymsync/controller/ChatController.java
backend/src/main/java/com/gymsync/controller/WorkoutController.java
backend/src/main/java/com/gymsync/controller/AuthController.java
backend/src/main/java/com/gymsync/model/ExerciseSet.java
backend/src/main/java/com/gymsync/model/Exercise.java
backend/src/main/java/com/gymsync/service/ChatService.java
backend/src/main/java/com/gymsync/service/UserService.java
backend/src/main/java/com/gymsync/service/WorkoutServiceImpl.java
backend/src/main/java/com/gymsync/exception/GlobalExceptionHandler.java
backend/src/main/resources/application.properties
mobile-expo/index.ts
mobile-expo/src/App.tsx
mobile-expo/src/services/api.ts
mobile-expo/src/services/AuthContext.tsx
mobile-expo/src/services/ChatWebSocketService.ts
mobile-expo/src/screens/LogWorkoutScreen.tsx
mobile-expo/src/screens/ChatScreen.tsx
mobile-expo/src/screens/ProfileScreen.tsx
mobile-expo/src/screens/WorkoutsScreen.tsx
mobile-expo/src/screens/HomeScreen.tsx
mobile-expo/src/types/index.ts
mobile-expo/package.json
mobile-expo/jest.config.js                      screen-test preset
.github/workflows/ci.yml
README.md
HOW_TO_TEST_LOCALLY.md
docs/api.md
docs/CI_CD.md
```

### Files to remove or deprecate

```text
mobile-expo/App.tsx                     after moving entry to src/App.tsx
mobile-expo/src/App.tsx               if root remains canonical (choose one)
mobile/                                freeze/deprecate or bring to parity
```

---

## 23. Quick Reference — First Pull Request

The first PR should be intentionally small and unblock manual testing:

1. Add `@JsonIgnore` to `ExerciseSet.getWorkoutLog()`.
2. Fix the mobile rating payload to send `null` when unset.
3. Add the Maven wrapper.
4. Add `application-h2.properties`.
5. Update the H2 startup command in README and `HOW_TO_TEST_LOCALLY.md`.
6. Add `WorkoutSerializationTest`.

Expected result: backend starts without PostgreSQL, and a workout with exercise sets can be created, listed, and opened without 500 errors.

The second PR should contain the STOMP authentication interceptor and a two-client chat test. Do not attempt the full feature set in one change; each item above has independent acceptance criteria.
