# GymSync API Documentation

## Base URL
```
http://localhost:8080/api
```

## Authentication

All endpoints except `/auth/**` require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Auth

#### POST /auth/register
Register new user.

**Request:**
```json
{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "fitnessLevel": "INTERMEDIATE",
  "gymLocation": "McFit Vienna",
  "workoutGoals": "Build muscle, lose weight"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "userId": 1
}
```

#### POST /auth/login
Login user.

**Request:**
```json
{
  "username": "johndoe",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "type": "Bearer"
}
```

### Gyms

#### GET /gyms
List all gyms.

**Query Parameters:**
- `city` (optional): Filter by city
- `discount` (optional): true/false for student discounts

**Response:**
```json
[
  {
    "id": 1,
    "name": "McFit Wien Mitte",
    "address": "Landstraßer Hauptstraße 99",
    "city": "Vienna",
    "monthlyPrice": 19.90,
    "hasStudentDiscount": true,
    "studentDiscount": 5.00
  }
]
```

#### GET /gyms/{id}
Get gym details.

### Users

#### GET /users/me
Get current user profile.

#### PUT /users/me
Update user profile.

#### GET /users/buddies
Find gym buddies based on schedule overlap.

## WebSocket

Real-time chat endpoint:
```
ws://localhost:8080/ws/chat
```

Subscribe to topics:
- `/topic/messages/{userId}` - Receive messages
- `/app/chat.send` - Send message