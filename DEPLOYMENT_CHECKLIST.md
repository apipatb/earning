# EarnTrack - Deployment Checklist

Complete checklist for pre-deployment verification, testing, post-deployment validation, and rollback procedures.

---

## Table of Contents

1. [Pre-Deployment Verification](#pre-deployment-verification)
2. [Testing Checklist](#testing-checklist)
3. [Performance Validation](#performance-validation)
4. [Security Audit Checklist](#security-audit-checklist)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Deployment Sign-Off](#deployment-sign-off)

---

## Pre-Deployment Verification

### Code Quality & Standards

- [ ] All TypeScript/JavaScript files have no compilation errors
  ```bash
  npm run build
  ```

- [ ] No TypeScript errors in frontend
  ```bash
  cd app/frontend && npm run build:check
  ```

- [ ] No TypeScript errors in backend
  ```bash
  cd app/backend && npm run build
  ```

- [ ] ESLint passes without warnings
  ```bash
  npm run lint
  ```

- [ ] No hardcoded URLs (must use environment variables)
  - [ ] Backend API URLs
  - [ ] Frontend API endpoints
  - [ ] Static asset URLs
  - [ ] Webhook URLs

- [ ] No hardcoded secrets in code
  ```bash
  git log --all -p | grep -i "secret\|password\|key" | grep -v test
  ```

- [ ] No console.log statements in production code
  ```bash
  grep -r "console\." app/backend/src --include="*.ts" | grep -v test
  ```

- [ ] All imports resolved correctly
  ```bash
  npm run build --verbose
  ```

### Git Repository

- [ ] All changes committed to git
  ```bash
  git status
  ```
  Expected: clean working tree

- [ ] Latest main branch pulled
  ```bash
  git checkout main && git pull origin main
  ```

- [ ] No untracked files that should be committed
  ```bash
  git status --porcelain
  ```

- [ ] Commit history is clean and logical
  ```bash
  git log --oneline -10
  ```

- [ ] All commits have descriptive messages following format:
  - [ ] `feat: add new feature`
  - [ ] `fix: resolve issue`
  - [ ] `docs: update documentation`
  - [ ] `test: add tests`

- [ ] Branch is up to date with main
  ```bash
  git diff origin/main...HEAD
  ```

### Dependencies & Packages

- [ ] All npm dependencies installed and lock file committed
  ```bash
  npm ci
  ```

- [ ] No deprecated dependencies
  ```bash
  npm audit
  ```

- [ ] No critical security vulnerabilities
  ```bash
  npm audit --json | grep "severity.*critical"
  ```

- [ ] package.json versions match lock file
  ```bash
  npm install --package-lock-only
  ```

- [ ] All backend dependencies listed
  ```bash
  cd app/backend && npm list --depth=0
  ```

- [ ] All frontend dependencies listed
  ```bash
  cd app/frontend && npm list --depth=0
  ```

### Environment Configuration

- [ ] All required environment variables documented
  - [ ] Backend: DATABASE_URL, JWT_SECRET, etc.
  - [ ] Frontend: VITE_API_URL, etc.

- [ ] Environment variables follow naming conventions
  - [ ] All uppercase
  - [ ] Underscores for word separation
  - [ ] Prefixed appropriately (VITE_ for frontend)

- [ ] .env.example files updated and accurate
  - [ ] /app/backend/.env.example
  - [ ] /app/frontend/.env.example

- [ ] .env files are in .gitignore
  ```bash
  grep "^\.env" .gitignore
  ```

- [ ] vercel.json has correct configuration
  ```bash
  cat vercel.json | jq '.'
  ```

- [ ] railway.json exists (if needed) with correct config
  ```bash
  cat railway.json 2>/dev/null || echo "Not present (OK if using defaults)"
  ```

### Database Migrations

- [ ] Database schema reviewed and finalized
  ```bash
  cat app/backend/prisma/schema.prisma | head -50
  ```

- [ ] All migrations created
  ```bash
  ls -la app/backend/prisma/migrations
  ```

- [ ] Migrations have descriptive names
  - [ ] Follow: `YYYYMMDDHHMMSS_description`
  - [ ] Lowercase, underscores, no spaces

- [ ] Migrations tested locally
  ```bash
  npm --prefix app/backend run db:migrate:dev
  ```

- [ ] Database can be seeded with test data
  ```bash
  npm --prefix app/backend run db:seed 2>/dev/null || echo "No seed script"
  ```

- [ ] Migration rollback script available (if needed)
  - [ ] Documented in MIGRATION_GUIDE.md

---

## Testing Checklist

### Unit Tests

- [ ] Backend unit tests passing
  ```bash
  npm --prefix app/backend run test
  ```

- [ ] Frontend unit tests passing
  ```bash
  npm --prefix app/frontend run test
  ```

- [ ] Test coverage adequate (aim for > 80%)
  ```bash
  npm --prefix app/backend run test:coverage
  npm --prefix app/frontend run test:coverage
  ```

- [ ] New tests added for new features
  - [ ] Authentication tests
  - [ ] API endpoint tests
  - [ ] Database query tests
  - [ ] Component render tests

- [ ] No skipped tests
  ```bash
  grep -r "\.skip\|xit\|x\(" app/backend/src --include="*.test.ts"
  ```

### Integration Tests

- [ ] Backend API routes tested
  ```bash
  npm --prefix app/backend run test:integration 2>/dev/null || echo "No integration tests"
  ```

- [ ] Database integration working
  - [ ] Can connect to database
  - [ ] Can perform CRUD operations
  - [ ] Transactions working correctly

- [ ] API authentication tested
  - [ ] Login returns token
  - [ ] Token grants access
  - [ ] Expired token rejected
  - [ ] Invalid token rejected

- [ ] API error handling tested
  - [ ] 400 Bad Request for invalid input
  - [ ] 401 Unauthorized for unauthenticated
  - [ ] 403 Forbidden for insufficient permissions
  - [ ] 404 Not Found for missing resource
  - [ ] 500 Server Error with proper error message

### End-to-End Tests

- [ ] E2E tests pass locally
  ```bash
  npm --prefix app/frontend run test:e2e
  ```

- [ ] Critical user flows tested
  - [ ] User registration
  - [ ] User login
  - [ ] Dashboard loads
  - [ ] Create new earning record
  - [ ] View earnings history
  - [ ] User logout

- [ ] Cross-browser testing completed
  - [ ] Chrome/Chromium
  - [ ] Firefox
  - [ ] Safari (if possible)
  - [ ] Edge

- [ ] Mobile responsiveness tested
  - [ ] iPhone (375px width)
  - [ ] iPad (768px width)
  - [ ] Desktop (1200px+ width)

- [ ] Accessibility checked
  - [ ] Keyboard navigation works
  - [ ] Screen reader compatibility
  - [ ] Color contrast sufficient
  - [ ] Labels on form inputs

### Manual Testing

- [ ] Smoke tests passed
  - [ ] App loads without errors
  - [ ] Can navigate to main pages
  - [ ] Forms submit without errors
  - [ ] Data displays correctly

- [ ] Feature testing completed
  - [ ] All new features work as designed
  - [ ] All existing features still work
  - [ ] Edge cases handled

- [ ] Error scenarios tested
  - [ ] Network disconnected
  - [ ] API down
  - [ ] Invalid data
  - [ ] Missing required fields

- [ ] Data integrity verified
  - [ ] No data loss
  - [ ] Calculations correct
  - [ ] Transactions atomic
  - [ ] No race conditions

---

## Performance Validation

### Frontend Performance

- [ ] Build completes without errors and warnings
  ```bash
  npm --prefix app/frontend run build
  ```

- [ ] Build size acceptable (< 500KB gzipped)
  ```bash
  ls -lh app/frontend/dist
  ```

- [ ] Lighthouse score checked
  - [ ] Performance: > 90
  - [ ] Accessibility: > 90
  - [ ] Best Practices: > 90
  - [ ] SEO: > 90

  ```bash
  npm --prefix app/frontend run build
  # Use Chrome DevTools Lighthouse
  ```

- [ ] Core Web Vitals measured
  - [ ] LCP (Largest Contentful Paint): < 2.5s
  - [ ] FID (First Input Delay): < 100ms
  - [ ] CLS (Cumulative Layout Shift): < 0.1
  - [ ] TTFB (Time to First Byte): < 600ms

- [ ] CSS bundle optimized
  - [ ] Tailwind CSS correctly purged
  - [ ] No unused styles
  - [ ] CSS < 100KB minified+gzipped

- [ ] JavaScript bundles optimized
  - [ ] Code splitting working
  - [ ] Lazy loading for routes
  - [ ] No duplicate dependencies

- [ ] Images optimized
  - [ ] Compressed properly
  - [ ] Appropriate formats (WebP where possible)
  - [ ] Responsive images

### Backend Performance

- [ ] Backend builds without warnings
  ```bash
  npm --prefix app/backend run build
  ```

- [ ] Startup time acceptable (< 5 seconds)
  ```bash
  npm --prefix app/backend run dev
  # Measure from start to "listening on port"
  ```

- [ ] API response times measured
  - [ ] p50: < 100ms
  - [ ] p95: < 500ms
  - [ ] p99: < 1000ms

  ```bash
  # Load test with mock data
  npm --prefix app/backend run test:load 2>/dev/null || echo "No load test"
  ```

- [ ] Database query times optimized
  - [ ] All queries have indexes
  - [ ] N+1 queries eliminated
  - [ ] Complex queries use views

- [ ] Memory usage acceptable
  - [ ] No memory leaks
  - [ ] Startup < 100MB
  - [ ] Stable over time

- [ ] Connection pooling working
  - [ ] Database connections pooled
  - [ ] Connection limits respected
  - [ ] No connection leaks

### Load Testing (Recommended)

- [ ] Load test with 1000 concurrent users
  - [ ] No errors under load
  - [ ] Response times < 2 seconds
  - [ ] Database handles load

  ```bash
  # If load testing tools available
  artillery quick --count 1000 https://localhost:3001
  ```

- [ ] Stress test peak traffic
  - [ ] Service remains responsive
  - [ ] Graceful degradation
  - [ ] Clear error messages

---

## Security Audit Checklist

### Authentication & Authorization

- [ ] JWT implementation secure
  - [ ] Algorithm: HS256 or RS256
  - [ ] Secret: min 32 characters
  - [ ] Expiry: appropriate (7 days typical)
  - [ ] No secrets in token payload

- [ ] Password security verified
  - [ ] Hashing: bcrypt or similar
  - [ ] Salt rounds: >= 10
  - [ ] Min length: 8 characters
  - [ ] Complexity requirements enforced

- [ ] Authorization checks implemented
  - [ ] Users can only access own data
  - [ ] Admin endpoints protected
  - [ ] Role-based access working

- [ ] Session security
  - [ ] Sessions use secure cookies (HttpOnly, Secure)
  - [ ] CSRF protection enabled
  - [ ] Session timeout configured

### Data Protection

- [ ] Sensitive data encryption
  - [ ] Passwords hashed
  - [ ] API keys encrypted at rest
  - [ ] Database connections encrypted

- [ ] Data transmission encryption
  - [ ] HTTPS enforced everywhere
  - [ ] No HTTP fallback
  - [ ] HSTS headers set

- [ ] Data privacy
  - [ ] No PII in logs
  - [ ] No secrets in error messages
  - [ ] User data properly scoped

### Input Validation & Sanitization

- [ ] All user inputs validated
  ```bash
  grep -r "TODO\|FIXME.*validation" app/backend/src
  # Should return empty
  ```

- [ ] Input sanitization implemented
  - [ ] SQL injection prevented
  - [ ] XSS prevented
  - [ ] Command injection prevented

- [ ] File upload security
  - [ ] File type validation
  - [ ] File size limits
  - [ ] Virus scanning (if available)
  - [ ] Stored outside web root

- [ ] API input validation
  - [ ] Zod/Joi schemas defined
  - [ ] Validated before processing
  - [ ] Clear error messages

### HTTP Security Headers

- [ ] Security headers configured
  ```bash
  curl -I https://[backend-domain] | grep -i "strict\|content\|csp\|x-frame"
  ```

- [ ] Headers to verify:
  - [ ] `Strict-Transport-Security`
  - [ ] `Content-Security-Policy`
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `X-XSS-Protection`

### API Security

- [ ] Rate limiting enabled
  ```bash
  # Test rate limit
  for i in {1..100}; do curl -s https://[backend-domain]/api/v1/health; done
  # Should get 429 after threshold
  ```

- [ ] CORS properly configured
  - [ ] No wildcard origins
  - [ ] Only trusted domains
  - [ ] Credentials handled correctly

- [ ] API versioning in place
  - [ ] `/api/v1/` prefix used
  - [ ] Backwards compatibility maintained

- [ ] API documentation current
  - [ ] All endpoints documented
  - [ ] Parameter types specified
  - [ ] Response formats documented

### Database Security

- [ ] Database access restricted
  - [ ] No public access
  - [ ] Strong password
  - [ ] Limited user privileges

- [ ] Backups secured
  - [ ] Encrypted at rest
  - [ ] Encrypted in transit
  - [ ] Tested restores

- [ ] Query injection prevented
  - [ ] Parameterized queries used
  - [ ] No string concatenation
  - [ ] Prisma or ORM used

### Dependency Security

- [ ] No known vulnerabilities
  ```bash
  npm audit
  ```

- [ ] Dependencies up to date
  - [ ] No outdated major versions
  - [ ] Security patches applied
  - [ ] Deprecated packages removed

- [ ] Supply chain security
  - [ ] Package source verified
  - [ ] Signed commits on main branch
  - [ ] Dependency scanning enabled

### Secrets Management

- [ ] No secrets in repository
  ```bash
  git log --all -p | grep -E "password|secret|key" | wc -l
  # Should be 0
  ```

- [ ] Secrets protected in CI/CD
  - [ ] Not logged in builds
  - [ ] Not exposed in error messages
  - [ ] Rotation procedure in place

- [ ] Environment variables documented
  - [ ] All variables listed
  - [ ] Descriptions provided
  - [ ] Examples shown (no real values)

### Compliance & Standards

- [ ] GDPR compliance (if applicable)
  - [ ] User data is portable
  - [ ] User data can be deleted
  - [ ] Privacy policy available
  - [ ] Terms of Service available

- [ ] Code quality standards met
  - [ ] Linting passes
  - [ ] Code style consistent
  - [ ] No TODO/FIXME left behind

---

## Post-Deployment Verification

### Immediate Checks (First 5 Minutes)

- [ ] Service deployed successfully
  - [ ] No errors in deployment logs
  - [ ] All services running

- [ ] Health endpoints responding
  ```bash
  curl https://[backend-domain]/health
  curl https://[frontend-domain]
  ```

- [ ] Frontend loads without errors
  - [ ] Open in browser
  - [ ] Check console (F12) for errors
  - [ ] Page renders correctly

- [ ] Basic functionality works
  - [ ] Can navigate pages
  - [ ] Forms render
  - [ ] Can click buttons

### Early Verification (First 30 Minutes)

- [ ] User authentication flow
  - [ ] Can register new user
  - [ ] Can login
  - [ ] Token received
  - [ ] Can access protected routes

- [ ] API endpoints working
  - [ ] GET requests return data
  - [ ] POST requests create records
  - [ ] PUT requests update records
  - [ ] DELETE requests remove records

- [ ] Database operations working
  - [ ] Data persists after refresh
  - [ ] Data queries are fast
  - [ ] No obvious errors

- [ ] External integrations working
  - [ ] File uploads working
  - [ ] Email notifications (if applicable)
  - [ ] Any external APIs responding

- [ ] Error handling working
  - [ ] Invalid input shows error
  - [ ] Network errors handled
  - [ ] Error messages are clear

### Comprehensive Verification (1-2 Hours)

- [ ] All main features verified
  - [ ] Feature 1: Earning tracking
  - [ ] Feature 2: Platform management
  - [ ] Feature 3: Analytics/Dashboard
  - [ ] Feature 4: Reporting
  - [ ] Feature 5: Settings

- [ ] Dashboard data accuracy
  - [ ] Totals calculated correctly
  - [ ] Charts render
  - [ ] Data filters work
  - [ ] Date ranges work

- [ ] Responsive design verified
  - [ ] Mobile view (375px)
  - [ ] Tablet view (768px)
  - [ ] Desktop view (1200px)
  - [ ] All features accessible

- [ ] Performance acceptable
  - [ ] Page load time < 3 seconds
  - [ ] API responses < 1 second
  - [ ] No visible slowness
  - [ ] Network requests optimized

- [ ] Error scenarios handled
  - [ ] Missing data displays gracefully
  - [ ] Network errors show retry
  - [ ] Form validation works
  - [ ] Error messages helpful

### Monitoring & Logs (2-4 Hours)

- [ ] Monitor error rates
  ```bash
  railway logs --service backend | grep "ERROR\|error"
  # Should see no errors or only expected ones
  ```

- [ ] Monitor performance metrics
  ```bash
  railway metrics --service backend
  # CPU < 20%, Memory < 50%
  ```

- [ ] Check user activity
  - [ ] Users can login
  - [ ] No authentication errors
  - [ ] Sessions working

- [ ] Monitor for any crashes
  ```bash
  railway logs --service backend | grep "crash\|exit\|fatal"
  # Should be empty
  ```

### Extended Verification (4-24 Hours)

- [ ] No issues reported by users
  - [ ] Monitor support channels
  - [ ] Check error tracking (if configured)
  - [ ] Review analytics for anomalies

- [ ] System stability
  - [ ] No unplanned restarts
  - [ ] Consistent performance
  - [ ] No memory leaks
  - [ ] Database connections stable

- [ ] Data integrity verified
  - [ ] No missing data
  - [ ] No duplicate data
  - [ ] Calculations correct
  - [ ] Relationships intact

- [ ] Backup working
  ```bash
  railway logs --service postgres | grep "backup"
  # Should see backup completed
  ```

- [ ] All monitoring active
  - [ ] Alerts configured
  - [ ] Dashboards updating
  - [ ] Logs collecting
  - [ ] Metrics recording

---

## Rollback Procedures

### Decision to Rollback

**Rollback immediately if:**

- [ ] Critical functionality broken
- [ ] Data loss occurring
- [ ] Security issue detected
- [ ] Performance degradation > 50%
- [ ] Error rate > 5%
- [ ] System unavailable > 5 minutes

**Can monitor for 30+ minutes if:**

- [ ] Minor features impacted
- [ ] Non-critical endpoints affected
- [ ] Error rate 0.1-1%
- [ ] Performance degradation < 20%

### Frontend Rollback (Vercel)

```bash
# 1. Access Vercel Dashboard
# Go to: https://vercel.com/dashboard

# 2. Select project
# Click on [project-name]

# 3. Go to Deployments tab

# 4. Find previous stable deployment
# Look for green checkmark, status "Ready"

# 5. Click deployment

# 6. Click "..." menu → "Promote to Production"

# 7. Confirm rollback

# 8. Verify frontend restored
curl https://[frontend-domain]
# Open in browser, verify functionality

# 9. Update VITE_API_URL if backend also rolled back
# Vercel → Settings → Environment Variables
```

**Time to rollback:** 2-3 minutes

### Backend Rollback (Railway)

```bash
# 1. Access Railway Dashboard
# Go to: https://railway.app/dashboard

# 2. Select project

# 3. Select backend service

# 4. Go to Deployments tab

# 5. Find previous stable deployment
# Look for green "Success" status

# 6. Click deployment

# 7. Click "Redeploy" or "Promote"

# 8. Confirm rollback

# 9. Wait for deployment (2-5 minutes)

# 10. Verify health
curl https://[backend-domain]/health
# Should return {"status":"ok"}

# 11. Check logs
railway logs --service backend
# Should see "listening on port 3000"
```

**Time to rollback:** 5-10 minutes

### Database Rollback

**For schema changes (if needed):**

```bash
# 1. Create rollback migration
cd app/backend
npm run db:migrate:dev --name rollback_[previous_migration]

# 2. Apply rollback locally
npm run db:push

# 3. Commit and push
git add .
git commit -m "Revert: rollback migration"
git push origin main

# 4. Deploy code change
# Vercel/Railway will auto-deploy

# 5. Run migration in production
railway run npm run db:push
```

**For data issues:**

```bash
# 1. Restore from backup
# Contact DevOps for backup file

# 2. Stop backend service
railway stop --service backend

# 3. Restore database
railway run psql $DATABASE_URL < backup-YYYYMMDD.sql

# 4. Verify restore
railway run psql $DATABASE_URL -c "SELECT count(*) FROM users;"

# 5. Restart backend
railway start --service backend

# 6. Verify health
curl https://[backend-domain]/health
```

**Time to rollback:** 10-30 minutes

### Incident Communication

**During Rollback:**

```
Post to team/status page every 5 minutes:

"Deployment rolled back due to [issue].
Investigating root cause.
ETA for resolution: [time]"

Example messages:
- "Rolled back frontend due to authentication issue"
- "Rolled back backend due to database migration failure"
- "Rolled back both services - investigating data integrity"
```

**After Rollback:**

```
"Deployment rolled back and service restored.
Starting investigation into root cause.
Will provide update in 1 hour."

Then:
1. Create incident post-mortem
2. Document root cause
3. Create preventive measures
4. Schedule follow-up review
```

### Post-Rollback Review

- [ ] Service stability verified
  - [ ] No new errors
  - [ ] Performance normal
  - [ ] Users can access

- [ ] Root cause identified
  - [ ] What went wrong?
  - [ ] Why wasn't caught in testing?
  - [ ] How to prevent?

- [ ] Fix prepared
  - [ ] Code changes made
  - [ ] Additional testing added
  - [ ] Documentation updated

- [ ] Re-deployment planned
  - [ ] When will fixed version deploy?
  - [ ] Additional testing needed?
  - [ ] Stakeholder approval?

---

## Deployment Sign-Off

### Pre-Deployment Review

- [ ] **Code Review**: Completed by _____________ Date: _______
  - [ ] Logic is sound
  - [ ] No security issues
  - [ ] Tests added/updated
  - [ ] Documentation updated

- [ ] **QA Testing**: Completed by _____________ Date: _______
  - [ ] All tests passing
  - [ ] Feature works as specified
  - [ ] No regressions found
  - [ ] Performance acceptable

- [ ] **Security Review**: Completed by _____________ Date: _______
  - [ ] No vulnerabilities
  - [ ] Secrets secured
  - [ ] Data protected
  - [ ] Headers configured

- [ ] **DevOps Review**: Completed by _____________ Date: _______
  - [ ] Deployment plan sound
  - [ ] Rollback plan documented
  - [ ] Monitoring configured
  - [ ] Backups ready

### Deployment Approval

**I approve this deployment to production:**

```
Date: _______________________
Time: _______________________

Approved by: _________________ (Print name)
Signature: ___________________

Title: ______________________

Reason approved:
________________________________________
________________________________________
```

**Alternative approvers (if primary unavailable):**

1. ________________________________
2. ________________________________
3. ________________________________

### Deployment Execution

```
Deployment start time: _________
Deployed by: ___________________
Backend deployment time: ________
Frontend deployment time: _______
Total deployment time: _________

Issues encountered:
□ None
□ Minor (describe): _______________
□ Major (describe): _______________

Rollback performed:
□ No
□ Yes (document reason): __________

Deployment end time: ____________
Verified by: __________________
```

### Post-Deployment Sign-Off

**Deployment successful and verified:**

```
Verified by: _____________________ Date: _______
Time verified: _______________________
Features working: ✓ Yes ✓ No
Performance acceptable: ✓ Yes ✓ No
No errors in logs: ✓ Yes ✓ No

Issues found during verification:
________________________________________
________________________________________

Next check-in: Date _______  Time _______
On-call monitor: _________________________
```

---

**Deployment Reference**

```
Deployment ID:       _______________________
Version deployed:    _______________________
Branch deployed:     _______________________
Commit hash:         _______________________
Deployment URL:      _______________________
Duration:            _______________________
Status:              _______________________
Incidents:           _______________________
Root cause (if any): _______________________
Action items:        _______________________
```

---

**Last Updated:** 2025-01-16
**Version:** 1.0
**Status:** Production Ready
