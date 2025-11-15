# EarnTrack Testing Guide

Complete testing guide for EarnTrack application.

---

## Table of Contents

1. [Manual Testing](#manual-testing)
2. [Testing Checklist](#testing-checklist)
3. [API Testing](#api-testing)
4. [Frontend Testing](#frontend-testing)
5. [Bug Reporting](#bug-reporting)

---

## Manual Testing

### Prerequisites

1. Backend running on `http://localhost:3001`
2. Frontend running on `http://localhost:5173`
3. PostgreSQL database connected
4. Fresh database (run `npx prisma migrate reset`)

---

## Testing Checklist

### ✅ Authentication Flow

**Registration:**
- [ ] Navigate to `/register`
- [ ] Enter valid email and password (min 6 characters)
- [ ] Click "Sign Up"
- [ ] Verify redirect to dashboard
- [ ] Check token stored in localStorage

**Login:**
- [ ] Navigate to `/login`
- [ ] Enter registered email and password
- [ ] Click "Login"
- [ ] Verify redirect to dashboard
- [ ] Test "Remember me" functionality

**Logout:**
- [ ] Click "Logout" button
- [ ] Verify redirect to login page
- [ ] Check token removed from localStorage

**Invalid Credentials:**
- [ ] Try login with wrong password → Error message
- [ ] Try login with non-existent email → Error message
- [ ] Try registration with existing email → Error message
- [ ] Try password < 6 characters → Validation error

---

### ✅ Dashboard

- [ ] View total earnings summary
- [ ] View total hours worked
- [ ] View average hourly rate
- [ ] See platform breakdown with percentages
- [ ] View recent earnings list (last 5)
- [ ] Charts render correctly
- [ ] All numbers formatted correctly

---

### ✅ Platforms Management

**Create Platform:**
- [ ] Click "Add Platform"
- [ ] Enter platform name (e.g., "Upwork")
- [ ] Select category (freelance/delivery/services/other)
- [ ] Pick color (optional)
- [ ] Set expected rate (optional)
- [ ] Click "Add Platform"
- [ ] Verify platform appears in list

**Edit Platform:**
- [ ] Click edit icon on platform
- [ ] Modify name
- [ ] Change expected rate
- [ ] Update color
- [ ] Save changes
- [ ] Verify updates reflected

**Delete Platform:**
- [ ] Click delete icon
- [ ] Confirm deletion
- [ ] Verify platform removed from list
- [ ] Check associated earnings still exist

**Validation:**
- [ ] Try empty platform name → Error
- [ ] Try duplicate platform name → Should allow (different rates)

---

### ✅ Earnings Tracking

**Add Earning:**
- [ ] Click "Add Earning"
- [ ] Select platform from dropdown
- [ ] Choose date
- [ ] Enter amount (e.g., 425.50)
- [ ] Enter hours (optional, e.g., 8.5)
- [ ] Add notes (optional)
- [ ] Click "Add Earning"
- [ ] Verify earning appears in table

**Edit Earning:**
- [ ] Click edit icon on earning
- [ ] Modify amount
- [ ] Change hours
- [ ] Update notes
- [ ] Save changes
- [ ] Verify hourly rate recalculated

**Delete Earning:**
- [ ] Click delete icon
- [ ] Confirm deletion
- [ ] Verify earning removed
- [ ] Check totals updated

**Filter by Period:**
- [ ] Test "Today" filter → Shows today's earnings
- [ ] Test "Week" filter → Shows last 7 days
- [ ] Test "Month" filter → Shows current month
- [ ] Test "All" filter → Shows all earnings

**Export CSV:**
- [ ] Click "Export CSV"
- [ ] Verify file downloads
- [ ] Open in Excel/Google Sheets
- [ ] Check all data present and formatted correctly

**Validation:**
- [ ] Try negative amount → Error
- [ ] Try negative hours → Error
- [ ] Try future date → Should allow
- [ ] Try without selecting platform → Error

---

### ✅ Goals Tracking

**Create Goal:**
- [ ] Click "Add Goal"
- [ ] Enter title (e.g., "Earn $5000 this month")
- [ ] Set target amount (e.g., 5000)
- [ ] Choose deadline (optional)
- [ ] Add description (optional)
- [ ] Click "Add Goal"
- [ ] Verify goal appears with 0% progress

**Update Progress:**
- [ ] Click "Update Progress" button
- [ ] Verify current amount calculated from earnings
- [ ] Check progress bar updated
- [ ] Verify percentage calculated correctly

**Edit Goal:**
- [ ] Click edit icon
- [ ] Modify target amount
- [ ] Change deadline
- [ ] Save changes
- [ ] Verify updates reflected

**Change Status:**
- [ ] Mark goal as "Completed"
- [ ] Verify status badge changes to green
- [ ] Mark as "Cancelled"
- [ ] Verify status badge changes to red

**Delete Goal:**
- [ ] Click delete icon
- [ ] Confirm deletion
- [ ] Verify goal removed

**Filter by Status:**
- [ ] Test "Active" filter → Shows active goals only
- [ ] Test "Completed" filter → Shows completed goals
- [ ] Test "Cancelled" filter → Shows cancelled goals
- [ ] Test "All" filter → Shows all goals

**Export CSV:**
- [ ] Click "Export CSV"
- [ ] Verify file downloads with goal data

---

### ✅ Analytics

**Time Period Selection:**
- [ ] Select "Week" → Charts update with last 7 days
- [ ] Select "Month" → Charts update with current month
- [ ] Select "Year" → Charts update with current year

**Charts:**
- [ ] Earnings trend line chart renders
- [ ] Platform pie chart shows correct percentages
- [ ] Platform bar chart displays correctly
- [ ] Category breakdown (if multiple categories)
- [ ] Hours worked trend (if hours tracked)

**Summary Cards:**
- [ ] Total earnings displays correctly
- [ ] Total hours displays correctly
- [ ] Average hourly rate calculated correctly
- [ ] Number of platforms shown

**Platform Details Table:**
- [ ] All platforms listed
- [ ] Earnings per platform correct
- [ ] Percentages add up to 100%
- [ ] Progress bars display correctly

---

### ✅ Reports

**Report Type Selection:**
- [ ] Select "Monthly Report"
- [ ] Select "Annual Report"

**Filter Options:**
- [ ] Select different year → Report updates
- [ ] Select different month (for monthly) → Report updates

**Report Content:**
- [ ] Summary cards show correct totals
- [ ] Breakdown table displays data
- [ ] All calculations correct
- [ ] Totals row shows sum of all periods

**Print/Export:**
- [ ] Click "Print / Save PDF"
- [ ] Verify print dialog opens
- [ ] Check print preview looks good
- [ ] Save as PDF and verify formatting

---

### ✅ Profile Settings

**Update Profile:**
- [ ] Change name
- [ ] Update timezone
- [ ] Change currency
- [ ] Click "Save Changes"
- [ ] Verify success message
- [ ] Check currency updated throughout app

**Change Password:**
- [ ] Enter current password
- [ ] Enter new password (min 6 characters)
- [ ] Confirm new password
- [ ] Click "Change Password"
- [ ] Verify success message
- [ ] Test login with new password

**Delete Account:**
- [ ] Click "Delete Account"
- [ ] Confirm by typing "DELETE"
- [ ] Verify account deleted
- [ ] Check redirect to login
- [ ] Try login → Should fail (account deleted)

---

### ✅ Dark Mode

- [ ] Toggle dark mode ON
- [ ] Check all pages render correctly in dark mode
- [ ] Verify text readable (good contrast)
- [ ] Check charts visible in dark mode
- [ ] Toggle dark mode OFF
- [ ] Verify preference saved (refresh page)

---

### ✅ Multi-Currency

- [ ] Select different currency (e.g., THB)
- [ ] Verify all amounts update with new symbol
- [ ] Check formatting correct (฿1,234.56)
- [ ] Test with EUR, GBP, JPY, etc.
- [ ] Verify currency saved in profile

---

### ✅ Responsive Design

**Mobile (375px):**
- [ ] Navigation works on mobile
- [ ] Forms are usable
- [ ] Tables scroll horizontally
- [ ] Buttons appropriately sized
- [ ] Charts render on small screens

**Tablet (768px):**
- [ ] Layout adapts correctly
- [ ] Sidebar visible/hidden as needed
- [ ] Grid layouts adjust

**Desktop (1920px):**
- [ ] Max-width containers work
- [ ] Charts scale appropriately
- [ ] No excessive whitespace

---

## API Testing

### Using cURL

```bash
# 1. Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"test123",
    "name":"Test User"
  }'

# Save the token from response
TOKEN="your-jwt-token-here"

# 2. Create Platform
curl -X POST http://localhost:3001/api/v1/platforms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Upwork",
    "category":"freelance",
    "color":"#14A800",
    "expectedRate":50
  }'

# 3. Create Earning
curl -X POST http://localhost:3001/api/v1/earnings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platformId":"platform-id-here",
    "date":"2025-01-15",
    "amount":425.00,
    "hours":8.5,
    "notes":"Web development"
  }'

# 4. Get Analytics
curl -X GET "http://localhost:3001/api/v1/analytics?period=month" \
  -H "Authorization: Bearer $TOKEN"

# 5. Create Goal
curl -X POST http://localhost:3001/api/v1/goals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Earn $5000",
    "targetAmount":5000,
    "deadline":"2025-01-31T23:59:59.000Z"
  }'
```

---

## Performance Testing

### Load Time Benchmarks

**Expected Performance:**
- Initial page load: < 2 seconds
- API response time: < 500ms
- Chart rendering: < 1 second

**Test:**
1. Open DevTools → Network tab
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Check "Load" time at bottom

**Optimization:**
- Images should be optimized
- JavaScript bundles < 500KB
- CSS bundles < 100KB

---

## Bug Reporting Template

When you find a bug, report it with:

```markdown
**Bug Title:** [Short description]

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. Enter '...'
4. See error

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots:**
[If applicable]

**Environment:**
- Browser: [e.g., Chrome 120]
- OS: [e.g., macOS 14]
- Screen size: [e.g., 1920x1080]

**Console Errors:**
[Copy any errors from browser console]
```

---

## Test Data Generator

Use this to create test data:

```javascript
// Run in browser console while logged in

// Create 10 random earnings
for (let i = 0; i < 10; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i);

  fetch('http://localhost:3001/api/v1/earnings', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('auth-storage').token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      platformId: 'your-platform-id',
      date: date.toISOString().split('T')[0],
      amount: Math.random() * 500 + 100,
      hours: Math.random() * 10 + 2
    })
  });
}
```

---

## Security Testing

### Authentication Tests

- [ ] Access `/dashboard` without token → Redirects to `/login`
- [ ] Use expired JWT token → 401 Unauthorized
- [ ] Use malformed token → 401 Unauthorized
- [ ] SQL injection in inputs → No effect (Prisma protects)
- [ ] XSS attempts in notes field → Sanitized

### Rate Limiting

- [ ] Make 101 requests in 15 min → 429 Too Many Requests
- [ ] Wait 15 min → Requests work again

---

## Accessibility Testing

- [ ] Tab through all forms → Logical order
- [ ] Screen reader announces labels
- [ ] Color contrast ratio > 4.5:1
- [ ] Images have alt text
- [ ] Keyboard shortcuts work

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Final Pre-Launch Checklist

- [ ] All critical bugs fixed
- [ ] Performance acceptable
- [ ] All features tested
- [ ] Security verified
- [ ] Responsive on all devices
- [ ] Error messages user-friendly
- [ ] Loading states present
- [ ] Empty states designed
- [ ] Success messages clear
- [ ] Analytics tracking (if added)

---

**Ready to Launch! 🚀**
