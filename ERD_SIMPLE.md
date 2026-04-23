# Chakri AI Simple ER Diagram

This ERD intentionally includes only core tables that represent the main product flows.

- Identity and profile
- Portfolio/profile details
- Jobs and matching
- Coaching and quiz tracking
- Tasks and notifications

```mermaid
erDiagram
    AUTH_USERS {
        uuid id PK
        text email
    }

    PROFILES {
        uuid id PK
        text username
        text full_name
        text target_role
        text role
    }

    SKILLS {
        uuid id PK
        uuid user_id FK
        text name
        text level
    }

    PROJECTS {
        uuid id PK
        uuid user_id FK
        text title
    }

    EXPERIENCES {
        uuid id PK
        uuid user_id FK
        text company
        text title
    }

    JOBS {
        uuid id PK
        uuid created_by FK
        text title
        text company
        text status
    }

    JOB_APPLICATIONS {
        uuid id PK
        uuid user_id FK
        uuid job_id FK
        text status
    }

    JOB_MATCHES {
        uuid id PK
        uuid user_id FK
        uuid job_id FK
        numeric total_score
    }

    TASKS {
        uuid id PK
        uuid user_id FK
        text title
        text status
    }

    COACH_SESSIONS {
        uuid id PK
        uuid user_id FK
        text mode
    }

    COACH_MESSAGES {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        text role
    }

    QUIZZES {
        uuid id PK
        uuid user_id FK
        text title
        text topic
    }

    QUIZ_ATTEMPTS {
        uuid id PK
        uuid quiz_id FK
        uuid user_id FK
        int score
        int total
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text type
        boolean read
    }

    ADAPTIVE_USER_INTELLIGENCE {
        uuid user_id PK
        int quiz_attempts
        numeric quiz_accuracy_avg
    }

    AUTH_USERS ||--|| PROFILES : owns
    AUTH_USERS ||--|| ADAPTIVE_USER_INTELLIGENCE : has

    PROFILES ||--o{ SKILLS : has
    PROFILES ||--o{ PROJECTS : builds
    PROFILES ||--o{ EXPERIENCES : records

    PROFILES ||--o{ JOBS : creates
    PROFILES ||--o{ JOB_APPLICATIONS : applies
    PROFILES ||--o{ JOB_MATCHES : receives
    JOBS ||--o{ JOB_APPLICATIONS : receives
    JOBS ||--o{ JOB_MATCHES : scored_for

    PROFILES ||--o{ TASKS : plans

    PROFILES ||--o{ COACH_SESSIONS : starts
    COACH_SESSIONS ||--o{ COACH_MESSAGES : contains
    PROFILES ||--o{ COACH_MESSAGES : sends

    PROFILES ||--o{ QUIZZES : owns
    QUIZZES ||--o{ QUIZ_ATTEMPTS : attempted_by
    PROFILES ||--o{ QUIZ_ATTEMPTS : submits

    PROFILES ||--o{ NOTIFICATIONS : receives
```

## Source Schema Files

- supabase_profile_schema.sql
- supabase_job_system_schema.sql
- supabase_tasks_schema.sql
- supabase_coach_schema.sql
- supabase_adaptive_intelligence_schema.sql
- supabase_notifications_schema.sql
