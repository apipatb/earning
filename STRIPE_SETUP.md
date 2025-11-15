# Stripe Payment Integration Setup Guide

## Phase 9: Complete Payment & Subscription System

This guide will help you set up Stripe for EarnTrack's payment and subscription system.

---

## 🎯 What's Included

- ✅ Stripe Checkout Integration
- ✅ Subscription Management (Free/Pro/Business tiers)
- ✅ Webhook Handling for payment events
- ✅ Payment History & Invoicing
- ✅ Tier-based Feature Access Control
- ✅ Billing Portal for customers

---

## 📋 Prerequisites

1. Stripe Account (free) - https://stripe.com
2. Node.js backend running
3. React frontend set up
4. PostgreSQL database

---

## 🚀 Step 1: Create Stripe Account

1. Go to https://stripe.com
2. Click "Sign up"
3. Complete registration with:
   - Business name (use "EarnTrack")
   - Business website (leave blank for now)
   - Email address
4. Verify email

---

## 🔑 Step 2: Get API Keys

1. Log in to Stripe Dashboard
2. Go to **Developers** → **API Keys**
3. You'll see two keys:
   - **Publishable Key** (starts with `pk_`)
   - **Secret Key** (starts with `sk_`)
4. For production, use **Live** keys
5. For testing, use **Test** keys (recommended first)

---

## 💳 Step 3: Create Products & Prices

1. In Stripe Dashboard, go to **Billing** → **Products**
2. Click **Create Product**

### Create 3 Products:

#### Product 1: Pro Plan
- Name: `Pro`
- Description: `Unlimited platforms + advanced analytics`
- Type: `Standard pricing`
- Price: `$9.99`
- Billing period: `Monthly`
- Copy the **Price ID** (starts with `price_`)

#### Product 2: Business Plan
- Name: `Business`
- Description: `Everything in Pro + team collaboration + API`
- Type: `Standard pricing`
- Price: `$29.99`
- Billing period: `Monthly`
- Copy the **Price ID**

---

## 📝 Step 4: Set Environment Variables

### Backend (.env)

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Secret Key
STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Publishable Key
STRIPE_WEBHOOK_SECRET=whsec_... # Get this after setting up webhook (Step 5)
STRIPE_PRICE_PRO=price_... # Price ID for Pro plan
STRIPE_PRICE_BUSINESS=price_... # Price ID for Business plan

# Frontend URL (for Stripe redirects)
FRONTEND_URL=http://localhost:5173 # In development
# FRONTEND_URL=https://yourdomain.com # In production
```

### Frontend (.env)

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3001/api
```

---

## 🪝 Step 5: Set Up Webhook

Stripe needs to notify your backend about payment events.

### In Stripe Dashboard:

1. Go to **Developers** → **Webhooks**
2. Click **Add Endpoint**
3. **Endpoint URL**: `https://yourdomain.com/api/v1/payments/webhook`
   - For localhost testing, use **Stripe CLI** (see below)
4. **Events to send**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Create endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### For Local Testing (Stripe CLI):

1. Download **Stripe CLI**: https://stripe.com/docs/stripe-cli
2. Install on your system
3. In terminal:
   ```bash
   stripe login
   # Follow authentication steps

   # Listen for webhook events
   stripe listen --forward-to localhost:3001/api/v1/payments/webhook
   ```
4. Copy the signing secret from the output
5. Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## 📦 Step 6: Install Dependencies

### Backend

```bash
cd app/backend
npm install stripe
npm install
```

### Frontend

Already includes axios and @tanstack/react-query

---

## 🗄️ Step 7: Database Migration

```bash
cd app/backend

# Generate Prisma client
npx prisma generate

# Run migration (creates subscription and payment tables)
npx prisma migrate dev --name add_payments

# Or if you're starting fresh:
npx prisma db push
```

---

## 🌍 Step 8: Register Routes & Middleware

Done! The backend already has:
- ✅ Payment routes registered in `src/server.ts`
- ✅ Tier middleware for access control
- ✅ Payment controller with Stripe integration

---

## 🧪 Step 9: Test the Integration

### Test with Stripe Test Cards:

1. Open http://localhost:5173/billing
2. Click "Upgrade to Pro"
3. Use test card: `4242 4242 4242 4242`
4. Any future date for expiry
5. Any 3-digit CVC

### Expected Results:

- ✅ Payment processed
- ✅ Subscription created
- ✅ User tier updated to "pro"
- ✅ Success message displayed
- ✅ Features unlocked

### Test Webhook:

1. With Stripe CLI running, make a payment
2. Check CLI output for webhook events
3. Verify database updated with subscription

---

## 📱 Step 10: Deploy to Production

### Backend (Railway/Render):

```bash
# Add environment variables in hosting dashboard:
STRIPE_SECRET_KEY=sk_live_... # Live key
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
FRONTEND_URL=https://yourdomain.com
```

### Frontend (Vercel):

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... # Live key
VITE_API_URL=https://api.yourdomain.com/api
```

### Update Webhook URL:

1. In Stripe Dashboard → Webhooks
2. Update endpoint URL to production: `https://yourdomain.com/api/v1/payments/webhook`

---

## 🔒 Security Best Practices

- ✅ Never commit `.env` files
- ✅ Use environment variables for all secrets
- ✅ Stripe webhook signature verification implemented
- ✅ Use live keys in production only
- ✅ Enable Stripe 3D Secure for fraud protection

---

## 📞 Troubleshooting

### Problem: Webhook not hitting backend
**Solution:**
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Ensure endpoint URL is correct
- Check backend logs for errors
- Use Stripe CLI if testing locally

### Problem: "Payment declined"
**Solution:**
- Use test card `4242 4242 4242 4242`
- Check your Stripe account is active
- Verify pricing IDs are correct

### Problem: Subscription not created
**Solution:**
- Check database migrations ran: `npx prisma migrate status`
- Verify Stripe keys in `.env`
- Check backend logs

---

## 💰 Revenue Model

### Current Pricing:

- **Free**: Up to 3 platforms, basic features
- **Pro** ($9.99/mo): Unlimited platforms, analytics, exports
- **Business** ($29.99/mo): Everything in Pro + teams + API access

### Revenue Projections:

- 100 free users → $0
- 50 Pro users → $500/month
- 10 Business users → $300/month
- **Total: $800/month** (conservative)

---

## 📊 Next Steps

1. Test payments thoroughly with test cards
2. Deploy to production
3. Monitor webhook events in Stripe Dashboard
4. Set up email notifications for new subscribers
5. Create marketing for paid tiers

---

## 📚 Resources

- Stripe Docs: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Stripe Test Cards: https://stripe.com/docs/testing
- Stripe CLI: https://stripe.com/docs/stripe-cli

---

## ✅ Checklist

- [ ] Create Stripe account
- [ ] Get API keys
- [ ] Create products and prices
- [ ] Set environment variables
- [ ] Set up webhook
- [ ] Install dependencies
- [ ] Run database migration
- [ ] Test with test cards
- [ ] Deploy to production
- [ ] Update webhook URL for production
- [ ] Monitor first payments

---

**You're now ready to start accepting payments! 🎉**

Questions? Check Stripe docs or contact support@earntrack.com
