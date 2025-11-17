# Stripe Payment Form - Quick Start Guide

## 🚀 Quick Installation (5 minutes)

### Step 1: Install Dependencies

```bash
cd /home/user/earning/app/frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Step 2: Set Environment Variable

Create or update `.env.development`:

```bash
# Get your test key from: https://dashboard.stripe.com/test/apikeys
VITE_STRIPE_PUBLIC_KEY=pk_test_your_key_here
```

### Step 3: Update Your Code

Replace old PaymentForm import:

```tsx
// Before (❌ Old way)
import PaymentForm from './components/PaymentForm';

<PaymentForm onClose={handleClose} onSuccess={handleSuccess} />
```

```tsx
// After (✅ New way)
import PaymentFormWrapper from './components/PaymentFormWrapper';

<PaymentFormWrapper onClose={handleClose} onSuccess={handleSuccess} />
```

### Step 4: Test It

Use Stripe test card:
```
Card: 4242 4242 4242 4242
Exp: 12/25
CVC: 123
ZIP: 12345
```

## 📦 Package Installation Command

```bash
npm install @stripe/stripe-js@^2.4.0 @stripe/react-stripe-js@^2.4.0
```

## 🔑 Get Your Stripe Keys

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy **Publishable key** (starts with `pk_test_`)
3. Add to `.env.development` as `VITE_STRIPE_PUBLIC_KEY`
4. Backend needs **Secret key** (starts with `sk_test_`)

## 🧪 Test Cards Reference

| Scenario | Card Number | Result |
|----------|-------------|--------|
| Success | 4242 4242 4242 4242 | ✅ Payment succeeds |
| 3D Secure | 4000 0025 0000 3155 | 🔐 Requires authentication |
| Declined | 4000 0000 0000 0002 | ❌ Card declined |
| Insufficient | 4000 0000 0000 9995 | 💰 Insufficient funds |

All test cards:
- Exp: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

## ✅ Verification Checklist

- [ ] Packages installed
- [ ] Environment variable set
- [ ] Import updated to PaymentFormWrapper
- [ ] Test successful payment (4242...)
- [ ] Check no errors in console
- [ ] Verify success callback fires
- [ ] Test error handling (use declined card)

## 🐛 Troubleshooting

**"Stripe.js not loading"**
```bash
# Check environment variable is set
echo $VITE_STRIPE_PUBLIC_KEY
# Restart dev server
npm run dev
```

**"Authentication failed"**
```bash
# Check backend is running
# Verify token in localStorage
```

**"Card declined in test mode"**
```bash
# Use exact test card number
# Card: 4242 4242 4242 4242
# Exp: Any future date (e.g., 12/25)
```

## 📚 Full Documentation

See `STRIPE_INTEGRATION_GUIDE.md` for:
- Complete security guidelines
- All test cards
- Error handling details
- Production deployment steps
- Troubleshooting guide

## 🔒 Security Checklist

- [x] ✅ Card data never sent to your server
- [x] ✅ Stripe handles all PCI compliance
- [x] ✅ 3D Secure automatically supported
- [x] ✅ No sensitive data in console logs
- [x] ✅ HTTPS required in production

## 🎯 What Was Changed

### New Files
- `src/utils/stripe.ts` - Stripe helpers
- `src/components/PaymentFormWrapper.tsx` - Stripe provider
- `STRIPE_INTEGRATION_GUIDE.md` - Full docs
- `STRIPE_QUICK_START.md` - This file

### Modified Files
- `src/components/PaymentForm.tsx` - Complete rewrite with Stripe Elements

### Features Added
- ✅ Real Stripe.js integration (no more mock payment methods)
- ✅ Secure card tokenization
- ✅ 3D Secure support
- ✅ Real-time card validation
- ✅ User-friendly error messages
- ✅ Retry logic
- ✅ Loading states
- ✅ Success animations
- ✅ Test mode helpers

## 🚨 Important Notes

1. **Never commit .env files**
   ```bash
   # Add to .gitignore
   .env*
   !.env.example
   ```

2. **Use test keys in development**
   - Test: `pk_test_...` / `sk_test_...`
   - Live: `pk_live_...` / `sk_live_...`

3. **Backend must be configured**
   - Verify `/api/v1/billing/setup-intent` endpoint works
   - Verify `/api/v1/billing/payment-methods` endpoint works
   - Backend needs Stripe secret key

## 📞 Need Help?

- Check browser console for errors (F12)
- Check backend logs for API errors
- Review `STRIPE_INTEGRATION_GUIDE.md`
- Check Stripe Dashboard > Logs
- Stripe docs: https://stripe.com/docs

## ⚡ Next Steps

After basic setup works:

1. Test 3D Secure (card: 4000 0025 0000 3155)
2. Test error scenarios (declined cards)
3. Verify backend payment method storage
4. Test setting default payment method
5. Prepare for production deployment

For production deployment, see **Production Deployment** section in `STRIPE_INTEGRATION_GUIDE.md`.
