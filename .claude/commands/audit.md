# /audit — Full Codebase Scan

Perform a thorough audit of the entire Dopame codebase. Cover all of the following areas and report findings grouped by severity (Critical / Warning / Info):

## What to check

### Backend (`backend/`)
- **Security**: hardcoded secrets, missing auth guards, unvalidated inputs, SQL/NoSQL injection risks, insecure JWT config, CORS misconfiguration
- **Correctness**: unhandled exceptions, missing error responses, broken imports, logic bugs
- **API hygiene**: missing input validation, inconsistent response shapes, unused routes
- **Dependencies**: packages in `requirements.txt` that are unused in the code

### Frontend (`frontend/src/`)
- **Security**: XSS risks, exposed secrets in env vars or source, unsafe `dangerouslySetInnerHTML`
- **Correctness**: broken imports, missing error boundaries, unhandled promise rejections, stale state
- **UX/accessibility**: missing `alt` tags, missing `data-testid` on interactive elements, broken links
- **Dead code**: unused components, unused imports, commented-out blocks

### Configuration & deployment
- **Environment variables**: any required env vars not documented or not set
- **CORS**: origins properly restricted for production
- **Cookies**: `secure` and `sameSite` flags correct for cross-origin deployment

### Tests (`tests/`, `backend/tests/`)
- Are tests passing? Are critical paths covered? Are there hardcoded URLs or credentials?

## Output format

For each finding:
```
[CRITICAL|WARNING|INFO] <file>:<line> — <description>
```

End with a summary table:
| Area | Critical | Warning | Info |
|------|----------|---------|------|

Then list the top 3 highest-priority fixes to make immediately.
