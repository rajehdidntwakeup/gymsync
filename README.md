# GymSync 💪

Gym buddy matching + workout planning app for students and young professionals.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Spring Boot 3.2 (Java 21) |
| Database | PostgreSQL 15+ (H2 for local development) |
| Mobile | React Native / Expo (TypeScript) |
| Auth | JWT |
| Real-time | STOMP over SockJS |
| ORM | Spring Data JPA / Flyway |

## Project Structure

```text
gymsync/
├── backend/          # Spring Boot API
├── mobile-expo/      # Canonical Expo mobile app
├── docker-compose.yml
├── .env.example
└── docs/
```

`mobile/` is legacy/deprecated.

## Quick Start

### Backend on H2

```bash
cd backend
SPRING_PROFILES_ACTIVE=h2 ./mvnw spring-boot:run
```

### Backend on PostgreSQL

```bash
cd backend
export DB_USERNAME=postgres
export DB_PASSWORD=your_password
./mvnw spring-boot:run
```

### Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

### Mobile

```bash
cd mobile-expo
npm install
npx expo start
```

## Testing

### Backend

```bash
cd backend
./mvnw test
./mvnw verify
./mvnw checkstyle:check
```

### Mobile

```bash
cd mobile-expo
npm test
npm run lint
npm run type-check
```

## Definition of Done progress

- Local H2 startup works without PostgreSQL.
- Workout create/list/detail works without JSON recursion.
- JWT auth includes real-time STOMP WebSocket auth.
- Gym data is seeded.
- CORS uses an explicit origin allowlist.
- CI uses the Maven wrapper and JaCoCo coverage.

See `GymSync-Remediation-Plan.md` for the full roadmap. Historical strategy docs are retained for reference.