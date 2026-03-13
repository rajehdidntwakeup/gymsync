# GymSync 💪

Gym buddy matching + intelligent workout planning app for students and young professionals.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Spring Boot 3.x (Java 21) |
| Database | PostgreSQL 15+ |
| Mobile | React Native (TypeScript) |
| Auth | JWT tokens |
| Real-time | WebSocket |
| ORM | Spring Data JPA |

## Project Structure

```
gymsync/
├── backend/          # Spring Boot API
│   ├── src/main/java/com/gymsync/
│   │   ├── config/   # Security, WebSocket, etc.
│   │   ├── controller/  # REST endpoints
│   │   ├── model/    # Entities
│   │   ├── repository/  # Spring Data
│   │   ├── service/  # Business logic
│   │   └── GymSyncApplication.java
│   └── pom.xml
├── mobile/           # React Native app
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── services/ # API calls
│   │   └── types/
│   └── package.json
├── docs/             # API docs, wireframes
└── .github/workflows/ # CI/CD
```

## Quick Start

### Backend
```bash
cd backend
./mvnw spring-boot:run
```

### Mobile
```bash
cd mobile
npm install
npx react-native run-android  # or run-ios
```

## Testing

### Backend Tests (90%+ Coverage)
```bash
cd backend
./mvnw test                    # Run all tests
./mvnw test -Dtest=WorkoutServiceTest  # Run specific test
./mvnw verify                  # Run with coverage report
```

### Mobile Tests
```bash
cd mobile
npm test                       # Run tests
npm run test:coverage          # Run with coverage
npm run lint                   # Lint code
npm run type-check             # TypeScript check
```

### Test Coverage
- **Unit Tests**: Service layer, Controllers, Models
- **Integration Tests**: Full workout flow, API endpoints
- **Repository Tests**: Database queries with H2

## CI/CD

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main`

Coverage reports uploaded as artifacts.

## Features (MVP)

- [ ] User auth + profile (fitness level, gym location, goals)
- [ ] Gym discovery (list/map with student discounts)
- [ ] Workout logging (exercise library, sets/reps)
- [ ] Gym buddy matching (schedule overlap, goals)

## API Documentation

See `docs/api.md`

## License

MIT