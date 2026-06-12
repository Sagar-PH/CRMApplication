# CRM Server — Production-Grade Backend

Node.js / Express / MongoDB CRM backend with:
- **JWT authentication** (access + refresh token rotation)
- **Google OAuth 2.0** login (with account linking for existing users)
- **Redis caching** for all analytics and complex queries
- **Rate limiting** per-route (auth vs API)
- **Structured logging** via Winston
- **Helmet** security headers
- **Graceful shutdown** with SIGTERM / SIGINT handling

---

## Project Structure

```
crm-server/
├── src/
│   ├── app.js                      # Express app factory (middleware, routes)
│   ├── server.js                   # Entry point: DB connect → listen
│   │
│   ├── config/
│   │   ├── database.js             # MongoDB client, connectDB, bootstrapUserDB
│   │   ├── cache.js                # Redis client, withCache(), invalidatePattern()
│   │   └── passport.js             # Google OAuth strategy
│   │
│   ├── middleware/
│   │   ├── auth.js                 # JWT Bearer guard → req.user + req.userDB
│   │   ├── errorHandler.js         # 404 + global error handler
│   │   └── rateLimiter.js          # authLimiter (20/15m) + apiLimiter (120/min)
│   │
│   ├── controllers/
│   │   ├── authController.js       # login, register, refresh, logout, Google callbacks
│   │   ├── crudFactory.js          # Generic CRUD factory (create/getAll/getById/update)
│   │   ├── resourceControllers.js  # 7 domain controllers built with crudFactory
│   │   └── dashboardController.js  # Parallel-fetch dashboard summary
│   │
│   ├── services/
│   │   └── analyticsService.js     # All analytics + forecasting logic (cached)
│   │
│   ├── routes/
│   │   ├── index.js                # Master router → mounts all sub-routers
│   │   ├── auth.js                 # /api/v1/auth/*
│   │   ├── resources.js            # /api/v1/{purchase-orders,sales-orders,...}
│   │   ├── analytics.js            # /api/v1/analytics/*
│   │   └── dashboard.js            # /api/v1/dashboard
│   │
│   └── utils/
│       ├── jwt.js                  # generateToken / verifyToken
│       ├── db.js                   # insertOne, findOne, updateOne, findAll, getNextRowId
│       ├── logger.js               # Winston logger (console + file)
│       └── response.js             # Uniform JSON response helpers
│
├── logs/                           # Auto-created: error.log, combined.log
├── .env.example
└── package.json
```

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 3. Start Redis (required for caching; app still runs without it)
redis-server

# 4. Run in development mode
npm run dev

# 5. Production
npm start
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default 8080) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `MONGO_DB_NAME` | Master DB name (default `CRMAccount`) |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (e.g. `7d`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | OAuth callback (e.g. `http://localhost:8080/api/v1/auth/google/callback`) |
| `FRONTEND_URL` | Frontend base URL for OAuth redirect |
| `REDIS_URL` | Redis connection (default `redis://localhost:6379`) |
| `CACHE_TTL_SECONDS` | Default cache TTL in seconds (default 300) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

---

## API Reference

All protected routes require:
```
Authorization: Bearer <accessToken>
```

### Auth  `/api/v1/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | ✗ | Password login → returns `accessToken`, sets `refreshToken` cookie |
| POST | `/register` | ✗ | Create new account |
| POST | `/refresh` | ✗ | Exchange `refreshToken` cookie for new access token |
| POST | `/logout` | ✗ | Clears refresh token cookie |
| GET  | `/check` | ✓ | Returns current user from token |
| GET  | `/google` | ✗ | Redirects to Google consent screen |
| GET  | `/google/callback` | ✗ | OAuth callback → redirects to `FRONTEND_URL/oauth-callback?token=...` |

### Resources  `/api/v1/{resource}`

Resources: `purchase-orders`, `sales-orders`, `vendors`, `contacts`, `tasks`, `products`, `customers`

| Method | Path | Description |
|---|---|---|
| POST | `/{resource}/` | Create |
| GET  | `/{resource}/` | List all (cached) |
| GET  | `/{resource}/:id` | Get by row_id (cached) |
| PUT  | `/{resource}/:id` | Update |

### Dashboard  `/api/v1/dashboard`

| Method | Path | Description |
|---|---|---|
| GET | `/` | Returns all collections in a single parallel-fetched response (60s cache) |

### Analytics  `/api/v1/analytics`

| Method | Path | Query Params | Description |
|---|---|---|---|
| GET | `/sales-trends` | `months` | Revenue + unit trend vs prior period |
| GET | `/purchase-trends` | `months` | Purchase trend vs prior period |
| GET | `/top-products` | `limit` | Top N products by revenue |
| GET | `/sales-vs-purchase` | `months` | Monthly sales vs purchases + profit |
| GET | `/forecast` | `months` | Revenue forecast per product |
| GET | `/inventory-risk` | `months` | Stockout / overstock / dead stock analysis |
| GET | `/reorder` | `months`, `leadTime` | Recommended reorder quantities |

---

## Authentication Flow

### Password Login
```
Client → POST /api/v1/auth/login { username, password }
       ← { accessToken }  +  Set-Cookie: refreshToken (httpOnly)

# On 401 with expired access token:
Client → POST /api/v1/auth/refresh  (cookie sent automatically)
       ← { accessToken }
```

### Google OAuth
```
Client → GET /api/v1/auth/google
       → (Google consent screen)
       → GET /api/v1/auth/google/callback
       → 302 FRONTEND_URL/oauth-callback?token=<accessToken>
           (refreshToken set as httpOnly cookie)
```

---

## Caching Strategy

Analytics endpoints are expensive MongoDB aggregations. Every result is cached in Redis:

| Endpoint | Cache key pattern | TTL |
|---|---|---|
| Dashboard | `cache:{userDB}:dashboard` | 60s |
| List endpoints | `cache:{userDB}:{Collection}:all` | 300s |
| Single record | `cache:{userDB}:{Collection}:{id}` | 300s |
| Analytics | `cache:{userDB}:analytics:{type}:{params}` | 300s |

Cache is **automatically invalidated** on any write (create/update) via `invalidatePattern`.
If Redis is unavailable the app continues — every cache miss simply hits MongoDB directly.
