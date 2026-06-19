# /ops — Check and Fix All Problems

Scan the Dopame project for operational problems and fix every issue found. This is an active fix command — don't just report, resolve.

## Scan and fix in this order

### 1. Broken imports & missing files
- Check all `import` / `from` statements in `backend/` and `frontend/src/`
- Fix any that reference non-existent modules or files

### 2. Environment variable gaps
- Check every `os.environ[...]` and `os.environ.get(...)` call in the backend
- Check every `process.env.REACT_APP_...` reference in the frontend
- List any that are required but not documented — add them to a `.env.example` file in `backend/` if one doesn't exist

### 3. CORS & cookie config
- Verify `FRONTEND_URL` is correctly wired in `server.py`
- Verify cookie `secure` and `sameSite` flags are safe for cross-origin (Render frontend → Render backend)

### 4. Unused / dead code
- Remove unused imports in Python files
- Remove unused imports in React/JS files

### 5. Console errors & warnings
- Check for obvious React key prop issues, missing dependency array items in `useEffect`, and deprecated patterns

### 6. API consistency
- Ensure all routes return consistent JSON shapes
- Ensure all routes that need auth use `CurrentUser`

### 7. Test hygiene
- Check `backend/tests/` and `tests/` for hardcoded credentials or URLs and replace with env var references

## After fixing
- Summarize every file changed and what was fixed
- Commit all changes with message: `ops: fix operational issues`
- Report any problems that could not be auto-fixed and need manual attention
