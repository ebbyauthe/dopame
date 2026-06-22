# Render Deployment Notes

Use these settings when the frontend and backend are separate Render services.

## Frontend service

**Render settings:**
- **Build Command:** `cd frontend && npm install && npm run build`
- **Publish Directory:** `frontend/build`

Set this environment variable before building:

```text
REACT_APP_BACKEND_URL=https://your-backend-service.onrender.com
```

Render bakes `REACT_APP_*` variables into the React build, so after changing it you must redeploy/rebuild the frontend.

The `frontend/public/_redirects` file (`/* /index.html 200`) is included in the build automatically and enables SPA routing — all paths serve `index.html` so React Router handles navigation. Without this, refreshing on any `/app/*` route returns "Not Found".

## Backend service

Required environment variables:

```text
MONGO_URL=your MongoDB connection string
DB_NAME=dopame
JWT_SECRET=use a long random secret
FRONTEND_URL=https://your-frontend-service.onrender.com
```

Optional but recommended:

```text
FRONTEND_URLS=https://your-frontend-service.onrender.com,https://your-custom-domain.com
COOKIE_SECURE=true
COOKIE_SAMESITE=none
ADMIN_EMAIL=demo@dopame.app
ADMIN_PASSWORD=Dopame123!
GROQ_API_KEY=your Groq key
PLAID_CLIENT_ID=your Plaid client id
PLAID_SECRET=your Plaid secret
PLAID_ENV=sandbox
```

If login/register shows "Could not reach the backend", check:

- Frontend `REACT_APP_BACKEND_URL` points to the backend root, not `/api`.
- Backend `FRONTEND_URL` or `FRONTEND_URLS` includes the exact frontend origin.
- Backend is reachable at `https://your-backend-service.onrender.com/api/`.
- The frontend was rebuilt after changing `REACT_APP_BACKEND_URL`.
