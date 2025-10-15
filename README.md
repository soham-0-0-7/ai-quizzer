# AI Quiz Generator API

A comprehensive Node.js/TypeScript API, hosted on AWS EC2, for generating AI-powered quizzes with user authentication, submission tracking, adaptive difficulty, and analytics dashboard.

## 🚀 Quick Start

### For Web Servers (Port 80)

```bash
docker pull soham794/ai-quiz-app

docker run -d -p 80:3000 \
  -e "DATABASE_URL=YOUR_POSTGRES_CONNECTION_URL" \
  -e "JWT_SECRET=YOUR_SECRET_KEY" \
  -e "GEMINI_API_KEY=YOUR_GEMINI_API_KEY" \
  -e "UPSTASH_REDIS_REST_URL=YOUR_REDIS_URL" \
  -e "UPSTASH_REDIS_REST_TOKEN=YOUR_REDIS_TOKEN" \
  -e "EMAIL_USER=YOUR_EMAIL" \
  -e "EMAIL_PASS=YOUR_EMAIL_APP_PASSWORD" \
  --name ai-quiz-container \
  soham794/ai-quiz-app:latest
```

### For Local Development (Port 3000)

```bash
docker pull soham794/ai-quiz-app

docker run -d -p 3000:3000 \
  -e "DATABASE_URL=YOUR_POSTGRES_CONNECTION_URL" \
  -e "JWT_SECRET=YOUR_SECRET_KEY" \
  -e "GEMINI_API_KEY=YOUR_GEMINI_API_KEY" \
  -e "UPSTASH_REDIS_REST_URL=YOUR_REDIS_URL" \
  -e "UPSTASH_REDIS_REST_TOKEN=YOUR_REDIS_TOKEN" \
  -e "EMAIL_USER=YOUR_EMAIL" \
  -e "EMAIL_PASS=YOUR_EMAIL_APP_PASSWORD" \
  --name ai-quiz-container \
  soham794/ai-quiz-app:latest
```

## 🌐 API Base URL Structure

```
http://98.88.73.209:80/endpoints
```

## ✨ New Features Added

### 🔐 Mock Authentication Service

- Accepts any username/password combination for testing
- Generates JWT tokens for session management
- Token validation across all quiz endpoints

### 🧠 AI-Powered Quiz Generation

- Generates quizzes with customizable grade levels using Gemini 2.5 Flash
- Adaptive question difficulty based on user's past performance
- Intelligent balancing of easy/medium/hard questions

### 📊 Advanced Quiz Management

- Submit quiz answers with AI-powered evaluation and scoring
- Comprehensive quiz history retrieval with multiple filter options
- Quiz retry functionality with score re-evaluation
- Access to old submissions and performance tracking

### 🎯 Smart Features

- **AI Hint Generation**: Get contextual hints for individual questions
- **Result Suggestions**: Receive 2 personalized improvement tips after submission
- **Adaptive Difficulty**: Real-time question difficulty adjustment based on performance history

### 📧 Notification System

- Automatic email delivery of quiz results
- Detailed performance reports sent to registered email

### ⚡ Performance Enhancements

- Redis caching layer for reduced API latency
- Optimized quiz data fetching with cache fallback

### 🏆 Leaderboard System

- Display top scores by grade and subject
- Competitive ranking system for enhanced engagement

## 🐳 Docker Configuration

- **Base Image:** Node.js 22 Alpine
- **Environment:** Production optimized
- **Port:** 3000 (internal)
- **Dependencies:** All production dependencies included
- **Prisma:** Client generation included in build process
- **AI Model:** Gemini 2.5 Flash for enhanced quiz generation

## 📝 Important Notes

- JWT tokens expire after 1 hour - re-login required
- Quiz generation is limited to 20 questions maximum
- Email results are sent automatically after quiz submission
- Redis cache improves performance with database fallback
- Bypass token (`bypass`) available for testing (maps to user ID 1)
- All dates use `dd-mm-yy` format for URL compatibility
- Date range filters accept `dd-mm-yy` format in request body
- Response dates are formatted as `dd/mm/yy` for display purposes
- Cache automatically updates when quiz data is not found
- Mock authentication accepts any valid username/password combination

## 🔐 Authentication Routes

### Create Account (Mock Service)

```
POST /user/signup
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "username": "unique_username",
  "password": "your_password"
}
```

**Note:** Mock service accepts any username/password combination for testing purposes.

**Response:**

```json
{
  "message": "Successful account creation, please login on user/login."
}
```

### Login (Mock Authentication)

```
POST /user/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "username": "unique_username",
  "password": "your_password"
}
```

**Note:** Mock authentication accepts any valid credentials and generates JWT token.

**Response:**

```json
{
  "message": "Login successful, save the token for future requests.",
  "token": "jwt_token_here"
}
```

### Logout

```
POST /user/logout
```

**Headers:** `Authorization: jwt_token_here`

**Response:**

```json
{
  "message": "Successfully logged out, deleted cache, and invalidated token."
}
```

## 🧠 Quiz Management

### Generate AI Quiz with Adaptive Difficulty

```
POST /quiz/generate
```

**Headers:** `Authorization: jwt_token_here`

**Request Body:**

```json
{
  "grade": 5,
  "subject": "Maths",
  "totalQuestions": 10,
  "maxScore": 10,
  "difficulty": "Hard to Expert"
}
```

**Grade Range:** 1-12  
**Max Questions:** 20

**Response:**

```json
{
  "message": "quiz generated successfully with id 123, send get req to /quiz/view/123",
  "adaptiveInfo": {
    "basedOnHistory": true,
    "pastPerformance": "GOOD",
    "difficultyDistribution": {
      "easy": 3,
      "medium": 5,
      "hard": 2
    }
  }
}
```

### View Quiz

```
GET /quiz/view/:quizId
```

**Headers:** `Authorization: jwt_token_here`

**Response:**

```json
{
  "instructions": "to get hint for a question, send get req to /question/hint/[questionId], total points of the quiz: 5",
  "grade": "5",
  "subject": "Maths",
  "difficulty": "ADAPTIVE",
  "questions": [
    {
      "id": 1,
      "problem": "What is 2 + 2?",
      "options": "1. 3, 2. 4, 3. 5, 4. 6",
      "points": 1,
      "difficultyLevel": "EASY"
    }
  ]
}
```

### Retry Quiz

```
POST /quiz/retry/:quizId
```

**Headers:** `Authorization: jwt_token_here`

**Response:**

```json
{
  "message": "Quiz retry initialized. Previous submissions remain accessible.",
  "retryAttempt": 2,
  "previousScore": "8/10"
}
```

## 💡 Question Hints (AI-Powered)

### Get Question Hint

```
GET /question/hint/:questionId
```

**Headers:** `Authorization: jwt_token_here`

**Response:**

```json
{
  "question": "What is 2 + 2?",
  "hint": "Think about simple addition of two numbers. Start with counting on your fingers if needed."
}
```

## 📝 Quiz Submission with AI Evaluation

### Submit Quiz

```
POST /submission/submit
```

**Headers:** `Authorization: jwt_token_here`

**Request Body:**

```json
{
  "quizId": 123,
  "responses": [
    {
      "questionId": 1,
      "userResponse": "A"
    },
    {
      "questionId": 2,
      "userResponse": "D"
    }
  ]
}
```

**Response:**

```json
{
  "submissionId": 456,
  "score": 8,
  "totalScore": 10,
  "percentage": 80.0,
  "aiEvaluation": {
    "strengths": [
      "Good understanding of basic concepts",
      "Accurate calculations"
    ],
    "improvementTips": [
      "Focus more on algebra word problems",
      "Practice mental math for faster problem solving"
    ]
  },
  "emailSent": true,
  "message": "Quiz submitted successfully. Results emailed to your registered address."
}
```

## 📊 Dashboard & Analytics with Advanced Filtering

### Get All Submissions

```
GET /dashboard/getAllSubmissions
```

**Headers:** `Authorization: jwt_token_here`

### Filter by Grade

```
GET /dashboard/gradeFilter/:grade
```

**Example:** `/dashboard/gradeFilter/A`

### Filter by Subject

```
GET /dashboard/subjectFilter/:subject
```

**Example:** `/dashboard/subjectFilter/Maths`

### Filter by Marks Range

```
POST /dashboard/marksFilter
```

**Request Body:**

```json
{
  "minMarks": 7,
  "maxMarks": 10
}
```

### Filter by Submission Date

```
GET /dashboard/submissionDateFilter/:date
```

**Date Format:** `dd-mm-yy`  
**Example:** `/dashboard/submissionDateFilter/25-01-25`

### Filter by Date Range

```
POST /dashboard/dateRangeFilter
```

**Request Body:**

```json
{
  "from": "01-09-24",
  "to": "09-09-24"
}
```

### Filter by Completion Date

```
GET /dashboard/completedDateFilter/:date
```

**Date Format:** `dd-mm-yy`  
**Example:** `/dashboard/completedDateFilter/25-01-25`

**Dashboard Response Format:**

```json
[
  {
    "submissionId": 123,
    "submittedOn": "25/01/25",
    "completedOn": "25/01/25",
    "gradepoint": "A",
    "grade": "5",
    "subject": "Maths",
    "myScore": 8,
    "totalScore": 10,
    "percentage": 80.0,
    "suggestions": ["Focus on algebra concepts", "Practice more word problems"],
    "userAnswers": "A ~ B ~ C ~ D",
    "questionPoints": "1 ~ 2 ~ 1 ~ 2",
    "attemptNumber": 1,
    "difficultyLevel": "ADAPTIVE",
    "quiz": [
      {
        "id": 1,
        "problem": "What is x + 1?",
        "options": "1. x, 2. x+1, 3. x-1",
        "points": 2,
        "difficultyLevel": "MEDIUM"
      }
    ]
  }
]
```

## 🏆 Leaderboard System

### Get Leaderboard by Subject

```
GET /leaderboard?subject=Maths
```

### Get Leaderboard by Grade

```
GET /leaderboard?grade=A
```

### Get Leaderboard by Subject and Grade

```
GET /leaderboard?subject=Maths&grade=A
```

**Headers:** `Authorization: jwt_token_here`

**Response:**

```json
[
  {
    "rank": 1,
    "userId": 1,
    "username": "topStudent",
    "submissionId": 123,
    "subject": "Maths",
    "grade": "A",
    "myScore": 9,
    "totalScore": 10,
    "percentage": 90.0,
    "submittedOn": "2025-01-01T10:00:00.000Z",
    "attemptNumber": 1
  }
]
```

## 📧 Email Notification System

### Automatic Result Delivery

After each quiz submission:

- Detailed performance report sent to registered email
- AI-generated improvement suggestions included
- Score breakdown and question-wise analysis
- Historical performance comparison

**Email Content Includes:**

- Quiz score and percentage
- AI evaluation and feedback
- 2 personalized improvement tips
- Question-wise performance breakdown
- Comparison with previous attempts

## ⚡ Caching Mechanism (Redis)

### Smart Caching Features

- **User Quiz Data**: All user quizzes cached on login
- **Question Hints**: Frequently requested hints cached
- **Leaderboard Data**: Real-time leaderboard caching
- **Performance Analytics**: Dashboard data cached for faster retrieval

### Cache Management

- Automatic cache updates after quiz submissions
- Intelligent cache invalidation for data consistency
- Fallback to database when cache misses occur
- Optimized cache keys for efficient data retrieval

## 🛡️ Security Features

- Password hashing with bcrypt
- JWT token expiration (1 hour)
- Token blacklisting on logout
- HTTP-only cookies for web clients
- Environment variable protection
- Mock authentication for testing environment

## 🏗️ Technical Architecture

### Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Caching:** Redis (Upstash) with fallback to database
- **AI:** Google Gemini 2.5 Flash API
- **Authentication:** JWT with HTTP-only cookies and token blacklisting
- **Email:** Nodemailer with Gmail SMTP
- **Deployment:** Docker containerized

### Key Features

- 🤖 **AI-Powered Quiz Generation:** Uses Google Gemini 2.5 Flash for adaptive quizzes
- 🎯 **Adaptive Difficulty:** Real-time question difficulty adjustment
- 🔐 **Mock Authentication:** Testing-friendly authentication system
- 📊 **Comprehensive Analytics:** Advanced filtering and performance tracking
- 📈 **Smart Leaderboards:** Rankings by subject, grade, and performance
- 💡 **AI Hint System:** Contextual hints for enhanced learning
- 📧 **Email Integration:** Automatic result delivery with AI suggestions
- 🔄 **Quiz Retry System:** Multiple attempts with score tracking
- ⚡ **Redis Caching:** High-performance data retrieval
- 🧠 **Performance-Based Adaptation:** Quiz difficulty based on history

## ⚙️ Environment Variables

| Variable                   | Description                               | Required |
| -------------------------- | ----------------------------------------- | -------- |
| `DATABASE_URL`             | PostgreSQL connection string              | ✅       |
| `JWT_SECRET`               | Secret key for JWT token generation       | ✅       |
| `GEMINI_API_KEY`           | Google Gemini 2.5 Flash API key           | ✅       |
| `UPSTASH_REDIS_REST_URL`   | Upstash Redis REST URL for caching        | ✅       |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token                  | ✅       |
| `EMAIL_USER`               | Gmail address for sending quiz results    | ✅       |
| `EMAIL_PASS`               | Gmail app password (not regular password) | ✅       |

## 🔧 Authentication & Authorization

All API routes except `/user/signup` and `/user/login` require JWT authentication via the `Authorization` header.

**Special Bypass Token:** For testing purposes, you can use `bypass` as the authorization token, which maps to user ID 1.

⚠️ **Warning:** Bypass token must NOT be used for logout route in API request header; JWT token must always be used.

## 📈 Usage Examples

### Complete Adaptive Quiz Flow

1. **Sign Up:** Create account with mock authentication
2. **Login:** Get JWT token for session management
3. **Generate Adaptive Quiz:** AI analyzes past performance and creates balanced quiz
4. **Get Hints:** Request AI-generated hints for difficult questions
5. **Submit Quiz:** Receive AI evaluation with personalized feedback
6. **Retry Quiz:** Attempt quiz again with score re-evaluation
7. **View Analytics:** Check comprehensive performance dashboard
8. **Compare Rankings:** See position on subject/grade leaderboards
9. **Email Results:** Receive detailed performance report via email

### Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (blacklisted token)
- `404` - Not Found
- `409` - Conflict (duplicate email/username)
- `500` - Internal Server Error

## ⚠️ Known Issues & Considerations

1. **Prompt Injection Risk:** Frontend validation required to prevent malicious AI prompts
2. **Mock Authentication:** Current implementation accepts any credentials - not for production
3. **Email Verification:** Unverified emails may cause Nodemailer failures
4. **Cache Optimization:** Basic caching implementation - can be enhanced further
5. **Token Management:** Manual token handling - consider implementing refresh tokens

## 📧 Additional Notes

- Results are automatically emailed after quiz submission with AI-generated improvement tips
- Mock authentication system is designed for testing and development
- Adaptive difficulty system requires at least one previous quiz for optimal performance
- Redis cache dramatically improves API response times for quiz data
- Leaderboard updates in real-time after each quiz submission


## Recordings , Links and documentation 

- https://drive.google.com/drive/folders/10DBmVcyvr5Gz6BNzytJEpiPPceX8PlQz?usp=sharing
