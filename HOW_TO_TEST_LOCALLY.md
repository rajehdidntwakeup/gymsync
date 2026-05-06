# How to Test GymSync Locally

> Complete guide to running and testing the GymSync app on your machine.

---

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Java JDK | 21+ | `java -version` |
| Maven | 3.9+ (or use `./mvnw`) | `mvn -version` |
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| PostgreSQL | 15+ | `psql --version` |
| Docker (optional) | 20+ | `docker -v` |
| Git | 2.x | `git --version` |

---

## 1. Clone & Setup

```bash
git clone https://github.com/rajehdidntwakeup/gymsync.git
cd gymsync
```

---

## 2. Database Setup

### Option A: PostgreSQL (Recommended for full stack testing)

```bash
# Create the database
sudo -u postgres psql -c "CREATE DATABASE gymsync;"

# Set environment variables (add to ~/.bashrc or export per session)
export DB_USERNAME=postgres
export DB_PASSWORD=your_password
```

The app uses **Flyway migrations** (`backend/src/main/resources/db/migration/`) to create
tables on startup. With PostgreSQL, `spring.jpa.hibernate.ddl-auto=validate` — Flyway manages
the schema, not Hibernate.

### Option B: H2 In-Memory (No PostgreSQL needed)

Use the `test` profile to skip PostgreSQL entirely:

```bash
cd backend
./mvnw spring-boot:run -Dspring.profiles.active=test
```

- H2 auto-creates tables (`ddl-auto=create-drop`)
- Flyway is disabled for H2
- Data is lost on restart (in-memory only)
- Good for: quick smoke tests, API development

---

## 3. Backend Testing

### 3.1 Start the Backend

**With PostgreSQL:**
```bash
cd backend
export DB_USERNAME=postgres
export DB_PASSWORD=your_password
./mvnw spring-boot:run
```

**With H2 (no DB setup needed):**
```bash
cd backend
./mvnw spring-boot:run -Dspring.profiles.active=test
```

The backend starts on **http://localhost:8080**. Verify it's running:

```bash
curl http://localhost:8080/api/health
# Expected: {"status":"UP"} or similar
```

### 3.2 Run All Backend Tests

```bash
cd backend
./mvnw test
```

This uses the `test` profile automatically — H2 in-memory DB, no PostgreSQL required.

### 3.3 Run Specific Test Classes

```bash
# Unit tests
./mvnw test -Dtest=AuthControllerTest
./mvnw test -Dtest=UserControllerTest
./mvnw test -Dtest=WorkoutControllerTest
./mvnw test -Dtest=JwtUtilTest
./mvnw test -Dtest=WorkoutServiceImplTest

# Repository tests
./mvnw test -Dtest=ChatMessageRepositoryTest

# Model tests
./mvnw test -Dtest=ModelTest
```

### 3.4 Run E2E / Integration Tests

```bash
# E2E flow tests
./mvnw test -Dtest=AuthenticationE2ETest
./mvnw test -Dtest=ChatE2EFlowTest
./mvnw test -Dtest=UserProfileE2EFlowTest
./mvnw test -Dtest=WorkoutE2EFlowTest

# Integration tests
./mvnw test -Dtest=WorkoutIntegrationTest
```

> **Note:** Some E2E/integration tests may need the app running or a specific test profile.
> They use `@WithMockUser` for Spring Security context.

### 3.5 Run with Coverage Report

```bash
./mvnw verify
# Report at: target/site/jacoco/index.html
```

### 3.6 Run Checkstyle

```bash
./mvnw checkstyle:check
```

### 3.7 Skip Tests & Just Build

```bash
./mvnw clean package -DskipTests
```

---

## 4. Manual API Testing

### 4.1 Register a User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "fitnessLevel": "INTERMEDIATE",
    "gymLocation": "McFit Vienna",
    "workoutGoals": "Build muscle"
  }'
```

### 4.2 Login & Get JWT Token

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

Copy the `token` from the response.

### 4.3 Use JWT for Authenticated Endpoints

```bash
TOKEN="your-jwt-token-here"

# Get your profile
curl http://localhost:8080/api/users/me \
  -H "Authorization: Bearer $TOKEN"

# Update your profile
curl -X PUT http://localhost:8080/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "new@example.com",
    "fitnessLevel": "ADVANCED"
  }'

# Find gym buddies
curl "http://localhost:8080/api/users/buddies?gymLocation=McFit%20Vienna" \
  -H "Authorization: Bearer $TOKEN"

# List exercises (public endpoint)
curl http://localhost:8080/api/workouts/exercises
```

### 4.4 Workout Endpoints

```bash
# Create a workout log
curl -X POST http://localhost:8080/api/workouts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutDate": "2026-05-06",
    "notes": "Push day",
    "durationMinutes": 60,
    "rating": 4
  }'

# Get your workouts
curl http://localhost:8080/api/workouts \
  -H "Authorization: Bearer $TOKEN"

# Get workout stats
curl http://localhost:8080/api/workouts/stats \
  -H "Authorization: Bearer $TOKEN"
```

### 4.5 Gym Endpoints (Public — No Auth Needed)

```bash
# List all gyms
curl http://localhost:8080/api/gyms

# Search gyms by city
curl "http://localhost:8080/api/gyms/search?city=Vienna"

# Gyms with student discount
curl http://localhost:8080/api/gyms/student-discount

# Get a specific gym
curl http://localhost:8080/api/gyms/1
```

### 4.6 Health Check (Public)

```bash
curl http://localhost:8080/api/health
```

---

## 5. Mobile App Testing (Expo)

### 5.1 Install Dependencies

```bash
cd mobile-expo
npm install --legacy-peer-deps
```

> **Important:** `--legacy-peer-deps` is required because `@react-native-community/picker`
> has peer dependency conflicts. Do NOT use `npm ci` without it.

### 5.2 Start the Expo Dev Server

```bash
npx expo start
```

This opens the Expo DevTools. From there you can:
- Press **`a`** — launch on Android emulator
- Press **`i`** — launch on iOS simulator
- Press **`w`** — launch in web browser
- Scan QR code — launch on physical device via Expo Go

### 5.3 Configure API URL

The mobile app connects to `http://localhost:8080/api` by default. To point at a different
backend, set `extra.apiUrl` in `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.1.100:8080"
    }
  }
}
```

> **Tip:** On a physical device, `localhost` won't reach your computer. Use your machine's
> LAN IP (e.g. `192.168.x.x`) instead.

### 5.4 Run Mobile Tests

```bash
cd mobile-expo
npm test
```

Jest config is in `jest.config.js` — uses `ts-jest` transform with `node` test environment.

### 5.5 Run Specific Mobile Tests

```bash
# Run a single test file
npx jest src/services/__tests__/AuthContext.test.tsx

# Run tests matching a pattern
npx jest --testPathPattern=api
```

### 5.6 Lint

```bash
npm run lint
```

### 5.7 Type Check

```bash
npx tsc --noEmit
```

---

## 6. Mobile App Testing (React Native CLI)

The `mobile/` directory is the React Native CLI version (not Expo).

```bash
cd mobile

# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android (requires Android Studio / emulator)
npm run android

# Run on iOS (macOS only, requires Xcode)
npm run ios

# Run tests
npm test

# Lint
npm run lint

# Type check
npm run type-check
```

---

## 7. Docker Testing

### 7.1 Build & Run Backend in Docker

```bash
cd backend
docker build -t gymsync-backend:latest .
docker run -d -p 8080:8080 --name gymsync-test gymsync-backend:latest
```

The Docker image uses the `docker` profile (H2 in-memory, Flyway disabled). No PostgreSQL
needed.

### 7.2 Verify the Container

```bash
# Wait ~10s for startup, then check health
curl -sf http://localhost:8080/api/health

# Or check Docker's built-in health check
docker inspect --format='{{.State.Health.Status}}' gymsync-test

# View logs
docker logs gymsync-test
```

### 7.3 Cleanup

```bash
docker stop gymsync-test
docker rm gymsync-test
```

---

## 8. Full Stack Integration Test

This is the end-to-end flow: backend + mobile together.

### Step 1: Start the backend

```bash
cd backend
./mvnw spring-boot:run -Dspring.profiles.active=test
# Wait for "Started GymSyncApplication" log
```

### Step 2: Register & login from the mobile app

1. Open the Expo app (`npx expo start` from `mobile-expo/`)
2. Go to Register screen
3. Fill in name, username, email, password, pick a fitness level
4. Submit — should get a success toast/redirect
5. Login with the same credentials
6. Verify you see your profile on the Home/Profile screen

### Step 3: Test core flows

- **Buddies:** Go to Buddies tab — should show matching users
- **Workouts:** Log a workout, view it, check stats on Home
- **Gyms:** Browse gyms, search by city, check student discounts
- **Chat:** Open chat, verify WebSocket connects (check console for STOMP frames)

---

## 9. Troubleshooting

### Backend won't start

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Connection refused` on port 5432 | PostgreSQL not running | Start PostgreSQL: `sudo systemctl start postgresql` |
| `Flyway migration failed` | Schema out of sync | Check `db/migration/` files match DB state, or use `test` profile |
| `Bean creation error` | Missing env vars | Set `DB_USERNAME` and `DB_PASSWORD` |
| Port 8080 in use | Another process on 8080 | `lsof -i :8080` then kill it, or use `server.port=8081` |

### Mobile tests fail

| Symptom | Cause | Fix |
|---------|-------|-----|
| `npm install` peer dep errors | Picker package conflict | Use `--legacy-peer-deps` |
| Jest crash on ES module imports | expo-constants etc. are ES modules | Mock them in test: `jest.mock('expo-constants', () => ({...}))` |
| `@types/index` import fails | Module resolution | Use relative imports: `../types` instead of `@types/` |
| `handlers?.length` null error | Axios interceptors can be null | Use `handlers != null ? handlers.length : 0` |
| TypeScript errors in tests | JSX not supported in `node` env | Rewrite tests as pure logic mocks, no JSX rendering |

### Docker issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Build fails on checkstyle | Checkstyle runs in Docker | Already skipped with `-Dcheckstyle.skip=true` |
| Container exits immediately | Missing H2 config | Ensure `SPRING_PROFILES_ACTIVE=test` or `docker` is set |
| Health check fails | App not ready yet | Wait up to 30s or check logs: `docker logs <container>` |

### WebSocket not connecting (mobile)

1. Verify backend is running
2. Check the WebSocket URL matches (`ws://localhost:8080/ws`)
3. SockJS fallback — try `http://localhost:8080/ws/info` in a browser
4. On physical device, use your LAN IP, not `localhost`

---

## 10. Quick Reference Commands

```bash
# ── Backend ──
cd backend
./mvnw spring-boot:run -Dspring.profiles.active=test   # Start with H2
./mvnw test                                              # Run all tests
./mvnw test -Dtest=AuthControllerTest                    # Run one test
./mvnw verify                                            # Test + coverage
./mvnw checkstyle:check                                  # Lint

# ── Mobile (Expo) ──
cd mobile-expo
npm install --legacy-peer-deps                           # Install deps
npx expo start                                           # Start dev server
npm test                                                 # Run tests
npm run lint                                              # Lint
npx tsc --noEmit                                          # Type check

# ── Mobile (RN CLI) ──
cd mobile
npm install                                               # Install deps
npm start                                                 # Metro bundler
npm test                                                  # Run tests
npm run lint                                               # Lint
npm run type-check                                         # TypeScript check

# ── Docker ──
cd backend
docker build -t gymsync-backend:latest .                  # Build image
docker run -d -p 8080:8080 gymsync-backend:latest          # Run container
curl http://localhost:8080/api/health                     # Health check
docker logs <container>                                   # View logs
```

---

## 11. Test Structure Overview

```
backend/src/test/java/com/gymsync/
├── config/
│   └── TestSecurityConfig.java          # Security config for tests
├── controller/
│   ├── AuthControllerTest.java          # Register/login unit tests
│   ├── ChatControllerTest.java          # Chat controller tests
│   ├── UserControllerTest.java          # User profile/buddies tests
│   └── WorkoutControllerTest.java       # Workout CRUD tests
├── e2e/
│   ├── AuthenticationE2ETest.java       # Full auth flow
│   ├── ChatE2EFlowTest.java            # Chat flow E2E
│   ├── UserProfileE2EFlowTest.java      # Profile flow E2E
│   └── WorkoutE2EFlowTest.java         # Workout flow E2E
├── integration/
│   └── WorkoutIntegrationTest.java     # Integration tests
├── model/
│   └── ModelTest.java                  # Entity model tests
├── repository/
│   └── ChatMessageRepositoryTest.java  # Repository query tests
├── security/
│   └── JwtUtilTest.java                # JWT token tests
└── GymSyncApplicationTests.java       # Context load test

mobile-expo/src/services/__tests__/
├── AuthContext.test.tsx                # Auth context unit tests
├── api.test.ts                        # Axios API tests
└── simple.test.ts                      # Basic utility tests
```