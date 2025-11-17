# Stripe.js Payment Form Integration Guide

## Overview

This guide covers the complete Stripe.js integration implemented in the PaymentForm component. The implementation includes proper security measures, error handling, 3D Secure support, and a production-ready user experience.

## Files Modified/Created

### New Files
- `/app/frontend/src/utils/stripe.ts` - Stripe utility functions and helpers
- `/app/frontend/src/components/PaymentFormWrapper.tsx` - Stripe Elements provider wrapper
- `/app/frontend/STRIPE_INTEGRATION_GUIDE.md` - This documentation

### Modified Files
- `/app/frontend/src/components/PaymentForm.tsx` - Complete rewrite with Stripe Elements

## Installation

### 1. Install Required Packages

Run the following command in the `/app/frontend` directory:

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

Or with yarn:

```bash
yarn add @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Set Up Environment Variables

Add your Stripe publishable key to your environment variables file:

**Development (.env.development):**
```bash
VITE_STRIPE_PUBLIC_KEY=pk_test_your_test_key_here
```

**Production (.env.production):**
```bash
VITE_STRIPE_PUBLIC_KEY=pk_live_your_live_key_here
```

**IMPORTANT:**
- Never commit your `.env` files to version control
- Use test keys (pk_test_) in development
- Use live keys (pk_live_) only in production
- Backend should use corresponding secret keys (sk_test_ or sk_live_)

## Usage

### Basic Implementation

Replace the old PaymentForm import with PaymentFormWrapper:

```tsx
// Old way (DO NOT USE)
import PaymentForm from './components/PaymentForm';

// New way (CORRECT)
import PaymentFormWrapper from './components/PaymentFormWrapper';

// In your component
const [showPaymentForm, setShowPaymentForm] = useState(false);

{showPaymentForm && (
  <PaymentFormWrapper
    onClose={() => setShowPaymentForm(false)}
    onSuccess={() => {
      setShowPaymentForm(false);
      // Refresh payment methods or show success message
      fetchPaymentMethods();
    }}
  />
)}
```

## Features Implemented

### 1. Stripe Elements Integration
- Uses official Stripe CardElement for PCI compliance
- Automatic card brand detection
- Real-time validation
- Postal code collection for AVS (Address Verification System)

### 2. Security Features
- **No card data touches your server** - All card information handled by Stripe
- **3D Secure (SCA) support** - Automatic Strong Customer Authentication
- **SetupIntent for saved cards** - Secure card storage
- **Data sanitization** - Sensitive data never logged to console
- **HTTPS required** - Stripe.js only works over HTTPS (except localhost)

### 3. Error Handling
- Stripe API errors parsed to user-friendly messages
- Network error detection with retry logic
- Form validation before Stripe API calls
- Card-specific errors (declined, insufficient funds, etc.)
- Automatic retry counter

### 4. User Experience
- Loading states during processing
- Success confirmation with animation
- Clear error messages
- Retry button after errors
- Disabled form during processing
- Test card information in development mode
- Visual feedback for card validation

### 5. Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- Focus management

## Payment Flow

### Step-by-Step Process

1. **Component Mount**
   ```
   User opens payment form
   → Stripe.js loads
   → SetupIntent created on backend
   → Client secret returned
   → Form ready for input
   ```

2. **User Enters Card**
   ```
   User types card information
   → Real-time validation by Stripe
   → Card brand detected
   → Error messages shown if invalid
   ```

3. **Form Submission**
   ```
   User clicks "Add Card"
   → Client-side validation
   → stripe.createPaymentMethod() called
   → PaymentMethod created by Stripe
   → PaymentMethod ID sent to backend
   → Backend saves to database
   → If 3D Secure required: stripe.confirmCardSetup()
   → Success message shown
   ```

4. **Success**
   ```
   Card saved successfully
   → Success message displayed
   → onSuccess() callback triggered
   → Form closes after 1.5 seconds
   ```

## Testing

### Stripe Test Cards

Use these test cards in development/test mode:

#### Successful Payments
```
Card Number: 4242 4242 4242 4242
Exp: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

#### 3D Secure Authentication
```
Card Number: 4000 0025 0000 3155
Exp: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
Note: Will trigger 3D Secure modal
```

#### Declined Card
```
Card Number: 4000 0000 0000 0002
Result: Card will be declined
```

#### Insufficient Funds
```
Card Number: 4000 0000 0000 9995
Result: Insufficient funds error
```

#### Expired Card
```
Card Number: 4000 0000 0000 0069
Result: Expired card error
```

#### Processing Error
```
Card Number: 4000 0000 0000 0119
Result: Processing error
```

**Full list:** https://stripe.com/docs/testing#cards

### Testing Checklist

- [ ] Install packages: `npm install @stripe/stripe-js @stripe/react-stripe-js`
- [ ] Set VITE_STRIPE_PUBLIC_KEY environment variable
- [ ] Test successful card addition (4242...)
- [ ] Test 3D Secure flow (4000 0025 0000 3155)
- [ ] Test declined card (4000 0000 0000 0002)
- [ ] Test error handling (network errors, invalid input)
- [ ] Test retry functionality
- [ ] Verify no card data in console logs
- [ ] Test "Set as default" checkbox
- [ ] Test form cancellation
- [ ] Verify success callback works
- [ ] Test on mobile devices
- [ ] Test keyboard navigation
- [ ] Test with screen reader

## Security Best Practices

### ✅ DO

1. **Always use HTTPS in production**
   - Stripe.js will not work on non-HTTPS sites (except localhost)

2. **Use environment variables for keys**
   - Never hardcode Stripe keys in source code
   - Use different keys for test/production

3. **Validate on backend**
   - Always verify payment methods on backend
   - Don't trust client-side validation alone

4. **Use SetupIntent for saved cards**
   - Proper SCA (Strong Customer Authentication)
   - Better security compliance

5. **Sanitize logs**
   - Use `sanitizeCardDataForLogging()` utility
   - Never log full card numbers

### ❌ DON'T

1. **Never store raw card data**
   - Let Stripe handle all card information
   - Only store Stripe payment method IDs

2. **Never log sensitive data**
   - No card numbers in console.log
   - No CVV codes anywhere
   - Use sanitization utilities

3. **Never commit API keys**
   - Add .env files to .gitignore
   - Use environment-specific keys

4. **Never skip validation**
   - Validate on both client and server
   - Check for authentication tokens

5. **Never bypass Stripe.js**
   - Don't try to send card data directly
   - Always use Stripe's createPaymentMethod

## Error Messages

The implementation includes user-friendly error messages for common scenarios:

| Error Type | User Message |
|------------|-------------|
| Card Declined | "Your card was declined. Please try a different payment method." |
| Invalid Card | "Invalid card information. Please check your details." |
| Network Error | "Unable to connect to payment processor. Please check your internet connection." |
| Authentication | "Authentication failed. Please refresh the page and try again." |
| Rate Limit | "Too many requests. Please wait a moment and try again." |
| Generic | "Payment processing failed. Please try again." |

## Monitoring & Debugging

### Client-Side Logging

The implementation uses prefixed console logs:
```javascript
console.error('[PaymentForm] Error fetching setup intent:', error);
```

Search for `[PaymentForm]` in console to debug issues.

### Backend Logging

Check backend logs for:
- SetupIntent creation
- PaymentMethod creation
- Payment confirmation
- Webhook events

### Common Issues

**Issue: "Stripe.js not loaded"**
- Solution: Check VITE_STRIPE_PUBLIC_KEY is set
- Solution: Check internet connection
- Solution: Check browser console for Stripe.js loading errors

**Issue: "SetupIntent failed"**
- Solution: Verify backend API is running
- Solution: Check authentication token is valid
- Solution: Verify Stripe secret key on backend

**Issue: "Card declined in test mode"**
- Solution: Use test card 4242 4242 4242 4242
- Solution: Check you're using test publishable key (pk_test_)

**Issue: "3D Secure not working"**
- Solution: Use test card 4000 0025 0000 3155
- Solution: Ensure confirmCardSetup is being called
- Solution: Check clientSecret is valid

## Production Deployment

### Pre-Deployment Checklist

- [ ] Install production dependencies
- [ ] Set production Stripe keys (pk_live_)
- [ ] Test on staging environment
- [ ] Enable HTTPS (required)
- [ ] Set up Stripe webhooks
- [ ] Configure CSP headers for Stripe.js
- [ ] Test 3D Secure in production
- [ ] Monitor error rates
- [ ] Set up Stripe Dashboard alerts
- [ ] Document team on test cards vs real cards

### Environment Variables

Ensure these are set in production:

```bash
# Frontend
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Backend
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### CSP Headers (if applicable)

Add Stripe domains to Content Security Policy:

```
script-src 'self' https://js.stripe.com;
frame-src 'self' https://js.stripe.com;
connect-src 'self' https://api.stripe.com;
```

## Additional Resources

- [Stripe.js Reference](https://stripe.com/docs/js)
- [Stripe Elements](https://stripe.com/docs/stripe-js/react)
- [Testing Cards](https://stripe.com/docs/testing)
- [3D Secure](https://stripe.com/docs/payments/3d-secure)
- [PCI Compliance](https://stripe.com/docs/security/guide)
- [Strong Customer Authentication](https://stripe.com/docs/strong-customer-authentication)

## Support

For issues with:
- **Stripe API:** Check Stripe Dashboard > Developers > Logs
- **Integration:** Review this documentation
- **Backend:** Check payment.service.ts and billing.controller.ts
- **Frontend:** Check browser console for errors

## Version History

- **v1.0.0** - Initial implementation
  - Stripe Elements integration
  - 3D Secure support
  - Error handling
  - Security measures
  - Test mode helpers
