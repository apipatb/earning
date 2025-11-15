# EarnTrack Monetization Guide

Complete guide to monetizing EarnTrack.

---

## Pricing Strategy

### Freemium Model

**Free Tier:**
- Up to 3 platforms
- Basic analytics
- 1 goal tracking
- CSV export
- **Target:** Acquire users, build trust

**Pro Tier: $9/month**
- Unlimited platforms
- Advanced analytics
- Unlimited goals
- All export formats
- Priority support
- **Target:** Active freelancers, gig workers

**Business Tier: $29/month**
- Everything in Pro
- Team collaboration (up to 5 users)
- API access
- Custom reports
- White-label option (coming soon)
- Dedicated support
- **Target:** Agencies, teams

---

## Implementation Options

### Option 1: Stripe Integration (Recommended)

**Pros:**
- Easy to implement
- Trusted payment processor
- Handles PCI compliance
- Subscription management built-in
- Great documentation

**Cons:**
- 2.9% + $0.30 per transaction
- Requires code changes

### Option 2: Paddle

**Pros:**
- Merchant of record (handles VAT/taxes)
- Global payments
- No separate tax setup needed

**Cons:**
- 5% + $0.50 per transaction
- Higher fees

### Option 3: LemonSqueezy

**Pros:**
- Merchant of record
- Beautiful checkout
- Easy integration

**Cons:**
- 5-7% fees
- Newer platform

---

## Stripe Implementation

### Backend Setup

```bash
npm install stripe
```

**Create Stripe Controller** (`app/backend/src/controllers/stripe.controller.ts`):

```typescript
import { Response } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { priceId } = req.body;

    const session = await stripe.checkout.sessions.create({
      customer_email: req.user!.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId, // price_1234... from Stripe dashboard
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: {
        userId,
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

export const webhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      // Upgrade user to Pro
      const session = event.data.object;
      await handleSubscriptionCreated(session);
      break;

    case 'customer.subscription.deleted':
      // Downgrade user to Free
      await handleSubscriptionCancelled(event.data.object);
      break;
  }

  res.json({ received: true });
};

async function handleSubscriptionCreated(session: any) {
  // Update user subscription status
  await prisma.user.update({
    where: { id: session.metadata.userId },
    data: {
      subscriptionStatus: 'pro',
      stripeCustomerId: session.customer,
      subscriptionId: session.subscription,
    },
  });
}

async function handleSubscriptionCancelled(subscription: any) {
  // Downgrade user
  await prisma.user.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      subscriptionStatus: 'free',
    },
  });
}
```

### Database Schema Update

Add to `schema.prisma`:

```prisma
model User {
  // ... existing fields

  subscriptionStatus  String   @default("free") // free, pro, business
  stripeCustomerId    String?  @map("stripe_customer_id")
  stripeSubscriptionId String? @map("stripe_subscription_id")
  subscriptionEndsAt  DateTime? @map("subscription_ends_at")
}
```

### Frontend Checkout

```typescript
// app/frontend/src/pages/Pricing.tsx

const handleUpgrade = async (plan: 'pro' | 'business') => {
  try {
    const response = await api.post('/stripe/create-checkout-session', {
      priceId: plan === 'pro' ? 'price_pro_monthly' : 'price_business_monthly'
    });

    const stripe = await loadStripe(process.env.VITE_STRIPE_PUBLIC_KEY!);
    await stripe?.redirectToCheckout({
      sessionId: response.data.sessionId
    });
  } catch (error) {
    console.error('Upgrade error:', error);
  }
};
```

---

## Pricing Psychology

### Current Pricing: $9/$29

**Why these numbers:**
- $9 is below psychological $10 barrier
- $29 is 3x+ the base price (perceived value)
- Common SaaS pricing tiers

### Alternative Pricing Strategies

**Annual Discount:**
- Monthly: $9/month
- Annual: $90/year (save $18 = 17% off)

**Lifetime Deal (Launch Only):**
- One-time: $199 (limited to first 100 users)
- Creates urgency
- Cash injection for marketing

**Tiered Features:**
- Free: 3 platforms, 1 goal
- Pro: 10 platforms, 5 goals
- Business: Unlimited

---

## Feature Gating

### Free Users CAN:
- Add up to 3 platforms
- Create unlimited earnings
- View basic analytics
- Set 1 goal
- Export to CSV
- Use dark mode
- Multi-currency

### Free Users CANNOT:
- Add more than 3 platforms
- Set multiple goals
- Access advanced analytics
- Priority support
- API access

### Implementation

```typescript
// Middleware to check subscription
export const requirePro = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId }
  });

  if (user?.subscriptionStatus !== 'pro' && user?.subscriptionStatus !== 'business') {
    return res.status(403).json({
      error: 'This feature requires a Pro subscription',
      upgradeUrl: '/pricing'
    });
  }

  next();
};

// Usage
router.post('/platforms', authenticate, async (req, res) => {
  const platformCount = await prisma.platform.count({
    where: { userId: req.user!.userId }
  });

  if (platformCount >= 3 && user.subscriptionStatus === 'free') {
    return res.status(403).json({
      error: 'Free tier limited to 3 platforms. Upgrade to Pro for unlimited.',
      upgradeUrl: '/pricing'
    });
  }

  // Create platform...
});
```

---

## Revenue Projections

### Conservative (Year 1)

**Month 1:**
- 100 users
- 5% conversion = 5 paid
- Revenue: $45 MRR

**Month 3:**
- 500 users
- 8% conversion = 40 paid
- Revenue: $360 MRR

**Month 6:**
- 2,000 users
- 10% conversion = 200 paid
- Revenue: $1,800 MRR

**Month 12:**
- 5,000 users
- 12% conversion = 600 paid
- Revenue: $5,400 MRR
- **ARR: $64,800**

### Optimistic (Year 1)

**Month 12:**
- 10,000 users
- 15% conversion = 1,500 paid
- Revenue: $13,500 MRR
- **ARR: $162,000**

---

## Alternative Revenue Streams

### 1. Affiliate Commissions

**Partner with:**
- Upwork (refer freelancers)
- Fiverr (affiliate program)
- QuickBooks (accounting)
- TurboTax (tax software)

**Potential:** $500-2,000/month

### 2. API Access

**Pricing:**
- 1,000 requests: Free
- 10,000 requests: $29/month
- 100,000 requests: $99/month

**Use Cases:**
- Third-party apps
- Data analysis tools
- Accounting software integrations

### 3. White Label

**Enterprise Pricing:**
- $499/month for unlimited users
- Custom branding
- Dedicated support

**Target:**
- Agencies
- Freelance platforms
- Gig economy companies

### 4. Sponsored Listings

**Platform Sponsorships:**
- Platforms pay $99/month to be featured
- "Recommended" badge
- Priority in dropdown

**Potential:** $500-1,000/month

### 5. Premium Content

**Courses & Guides:**
- "Freelance Success Masterclass" - $99
- "Gig Economy Tax Guide" - $49
- "Scale to $10K/Month" - $199

**Potential:** $1,000-5,000/month

---

## Conversion Optimization

### In-App Prompts

**When users hit limits:**
```
"You've reached your limit of 3 platforms.

Upgrade to Pro to add unlimited platforms and unlock:
✅ Advanced analytics
✅ Unlimited goals
✅ Priority support

[Upgrade to Pro - $9/month]"
```

**After 7 days:**
```
"You've been using EarnTrack for a week!

Upgrade to Pro to unlock:
✅ Unlimited platforms
✅ Advanced analytics
✅ Unlimited goals

[Start 7-Day Free Trial]"
```

**Success moments:**
```
"🎉 Congratulations! You just logged $5,000 in earnings!

Track even more with Pro:
✅ Unlimited platforms
✅ Advanced reports

[Upgrade Now]"
```

### Email Drip Campaign

**Day 1:** Welcome email
**Day 3:** Feature highlight
**Day 7:** Upgrade offer (7-day trial)
**Day 14:** Case study / testimonial
**Day 30:** Special discount (20% off first month)

---

## Metrics to Track

### Key Metrics

**MRR (Monthly Recurring Revenue):**
- Target Month 1: $45
- Target Month 6: $1,800
- Target Month 12: $5,400

**Conversion Rate:**
- Free → Trial: >10%
- Trial → Paid: >40%
- Overall: >5%

**Churn Rate:**
- Target: <5% monthly
- Calculate: (Cancellations / Total Subscribers) × 100

**LTV (Lifetime Value):**
- Average: $9 × 8 months = $72
- Goal: Increase to 12+ months

**CAC (Customer Acquisition Cost):**
- Organic: ~$0
- Paid: <$30 (LTV should be 3x CAC)

---

## Retention Strategies

### 1. Onboarding
- Welcome email
- Product tour
- Quick wins (add first platform, earning)

### 2. Engagement
- Weekly email reports
- Achievement badges
- Progress notifications

### 3. Value Delivery
- Regular feature updates
- Blog content
- Community

### 4. Win-Back
- Downgrade survey
- Special offers
- Feature requests

---

## Discount Strategy

### When to Offer Discounts

**DO:**
- Annual plans (save 20%)
- Launch promotion (50% off first month)
- Referrals (both get $5 credit)
- Win-back (come back - 3 months for $5)

**DON'T:**
- Constant discounting (devalues product)
- Deep discounts for new users (they're already willing to pay)

### Referral Program

```
Refer a friend:
- They get 1 month free
- You get 1 month free

Share your link:
earntrack.com/invite/YOUR_CODE
```

---

## Payment Processing

### Stripe Setup

1. Create Stripe account
2. Add products:
   - Pro Monthly: $9
   - Pro Annual: $90
   - Business Monthly: $29
   - Business Annual: $290
3. Enable customer portal (self-service)
4. Set up webhooks
5. Test with test mode

### Tax Compliance

**Stripe Tax (Recommended):**
- Automatically calculate sales tax
- File returns
- $0.50 per transaction

**Manual:**
- Register in your state
- Calculate tax yourself
- File quarterly

---

## Legal Requirements

### Terms of Service
- User responsibilities
- Payment terms
- Refund policy
- Cancellation policy

### Privacy Policy
- Data collection
- Data usage
- Data retention
- User rights

### Refund Policy

**Recommended:**
```
30-Day Money-Back Guarantee

Not satisfied? Cancel within 30 days for a full refund.

After 30 days:
- Cancel anytime
- No refunds for partial months
- Access continues until period ends
```

---

## Launch Promotion

### First 100 Users

```
🎉 Launch Special!

First 100 users get:
- 50% off Pro forever ($4.50/month)
- Lifetime Founder badge
- Priority support
- Input on features

Spots remaining: 87

[Claim Your Spot]
```

### AppSumo Deal (Optional)

Sell lifetime deals on AppSumo:
- Tier 1: $49 (Pro features)
- Tier 2: $99 (Business features)
- Tier 3: $199 (All features + white label)

**Pros:**
- Instant cash ($10K-50K)
- Large user base
- Marketing boost

**Cons:**
- No recurring revenue
- Lower LTV
- Support burden

---

## Success Case Studies

### Indie SaaS Examples

**Plausible Analytics:**
- Started at $6/month
- Now: $1M+ ARR
- Pricing: $9-$150/month

**Fathom Analytics:**
- Started at $14/month
- Now: $750K+ ARR
- Pricing: $14-$34/month

**Simple Analytics:**
- Started at $19/month
- Now: $400K+ ARR

**Key Learnings:**
- Start small
- Focus on value
- Increase prices over time
- Build trust first

---

## Action Plan

### Week 1
- [ ] Set up Stripe account
- [ ] Create products and prices
- [ ] Add pricing page to app
- [ ] Test checkout flow

### Week 2
- [ ] Implement subscription checks
- [ ] Add upgrade prompts
- [ ] Set up webhooks
- [ ] Test full payment flow

### Week 3
- [ ] Launch with pricing
- [ ] Monitor conversions
- [ ] Collect feedback
- [ ] Iterate

---

## Recommended Starting Approach

**Month 1-2: Free Only**
- Build user base
- Get feedback
- Prove value
- Build trust

**Month 3: Launch Pricing**
- Announce paid plans
- Grandfather early users (discount)
- Collect payments
- Iterate based on feedback

**Month 6: Optimize**
- A/B test pricing
- Refine feature gates
- Improve conversion
- Scale marketing

---

**Start Free, Add Value, Grow Revenue! 💰**
