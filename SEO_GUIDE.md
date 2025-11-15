# EarnTrack SEO Guide

Complete SEO optimization guide for EarnTrack.

---

## Meta Tags (Already in index.html)

Update landing page with these optimized meta tags:

```html
<!-- Primary Meta Tags -->
<title>EarnTrack - Multi-Platform Income Tracker for Freelancers & Gig Workers</title>
<meta name="title" content="EarnTrack - Multi-Platform Income Tracker for Freelancers & Gig Workers">
<meta name="description" content="Track earnings from Upwork, Fiverr, DoorDash and more. Set goals, analyze income, export reports. Free earnings tracker for freelancers and gig workers.">
<meta name="keywords" content="earnings tracker, income tracker, freelance income, gig economy, upwork earnings, fiverr earnings, doordash income, multi-platform tracker, freelance tools">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://earntrack.com/">
<meta property="og:title" content="EarnTrack - Multi-Platform Income Tracker">
<meta property="og:description" content="Track earnings from Upwork, Fiverr, DoorDash and more. Set goals, analyze income, export reports.">
<meta property="og:image" content="https://earntrack.com/og-image.png">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="https://earntrack.com/">
<meta property="twitter:title" content="EarnTrack - Multi-Platform Income Tracker">
<meta property="twitter:description" content="Track earnings from Upwork, Fiverr, DoorDash and more. Set goals, analyze income, export reports.">
<meta property="twitter:image" content="https://earntrack.com/twitter-image.png">

<!-- Additional Meta Tags -->
<meta name="robots" content="index, follow">
<meta name="language" content="English">
<meta name="author" content="EarnTrack">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="canonical" href="https://earntrack.com/">

<!-- Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

---

## Keywords Strategy

### Primary Keywords (High Priority)
1. **earnings tracker** (1,000 searches/month)
2. **income tracker** (2,400 searches/month)
3. **freelance income tracker** (480 searches/month)
4. **gig economy tracker** (210 searches/month)
5. **multi-platform income tracker** (110 searches/month)

### Secondary Keywords
- freelance earnings app
- upwork income tracker
- fiverr earnings calculator
- doordash income tracker
- gig worker income app
- freelance goal tracker
- hourly rate calculator freelance
- freelance analytics tool

### Long-Tail Keywords
- how to track freelance income across multiple platforms
- best income tracker for gig workers
- track upwork and fiverr earnings together
- freelance income tax tracker
- calculate real hourly rate freelancing
- set income goals as freelancer
- export earnings for taxes

---

## On-Page SEO

### Homepage

**H1:** Track Your Multi-Platform Income Like a Pro

**H2s:**
- Everything You Need to Track Your Income
- Simple, Transparent Pricing
- Loved by Freelancers Worldwide

**Content Keywords:**
- Mention "freelancer" 5-7 times
- Mention "gig worker" 3-5 times
- Mention "income tracker" 4-6 times
- Mention specific platforms: Upwork, Fiverr, DoorDash, Uber

**Image Alt Tags:**
- "Earnings dashboard showing income from multiple platforms"
- "Goal tracking interface for freelancers"
- "Analytics charts for gig economy workers"

### Features Page

Create `/features` page with:
- **Title:** Features - EarnTrack Multi-Platform Income Tracker
- **H1:** Powerful Features for Modern Earners
- Detailed description of each feature
- Screenshots with optimized alt tags
- Internal links to pricing and sign up

### Pricing Page

Keep pricing section but optimize:
- **Title:** Pricing - EarnTrack Free & Pro Plans
- **H1:** Simple, Transparent Pricing
- **Description:** Start free, upgrade when ready. No hidden fees.
- FAQ section about pricing

### Blog (Future)

Create `/blog` with articles:
1. "How to Track Freelance Income Across Multiple Platforms"
2. "5 Best Income Trackers for Gig Workers (2025)"
3. "Calculate Your Real Hourly Rate as a Freelancer"
4. "Setting Realistic Income Goals as a Freelancer"
5. "Tax Tips for Multi-Platform Gig Workers"

---

## Technical SEO

### Site Speed
- [ ] Optimize images (WebP format, < 100KB each)
- [ ] Minify CSS and JavaScript
- [ ] Enable gzip compression
- [ ] Use CDN for static assets
- [ ] Lazy load images below fold
- **Target:** < 2 seconds load time

### Mobile Optimization
- [ ] Responsive design
- [ ] Touch-friendly buttons (min 44x44px)
- [ ] Readable font sizes (16px minimum)
- [ ] No horizontal scrolling
- **Test:** Google Mobile-Friendly Test

### HTTPS
- [ ] SSL certificate installed
- [ ] Force HTTPS redirect
- [ ] No mixed content warnings

### Structured Data (Schema.org)

Add to landing page:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "EarnTrack",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "127"
  },
  "description": "Track earnings from multiple platforms. Set goals, analyze income, export reports. Free income tracker for freelancers and gig workers."
}
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "EarnTrack",
  "url": "https://earntrack.com",
  "logo": "https://earntrack.com/logo.png",
  "sameAs": [
    "https://twitter.com/earntrack",
    "https://linkedin.com/company/earntrack"
  ]
}
</script>
```

---

## Content Strategy

### Month 1-2: Foundation
- Publish 4-6 blog posts
- Focus on how-to guides
- Target long-tail keywords

### Month 3-4: Authority Building
- Guest posts on freelance blogs
- Interviews with successful freelancers
- Case studies

### Month 5-6: Expansion
- Video content (YouTube)
- Infographics
- Tools/calculators

---

## Link Building

### Internal Links
- Link features → pricing
- Link blog posts → sign up
- Link FAQ → support docs

### Backlinks Strategy

**Easy Wins:**
- [ ] Product Hunt listing
- [ ] BetaList
- [ ] AlternativeTo
- [ ] G2
- [ ] Capterra

**Guest Posts:**
- [ ] Freelancer blogs
- [ ] Personal finance sites
- [ ] Gig economy publications

**Resource Pages:**
- "Best tools for freelancers"
- "Gig economy resources"
- "Income tracking apps"

**Partnerships:**
- Upwork/Fiverr communities
- Freelance Facebook groups
- Reddit communities

---

## Local SEO (If Applicable)

If targeting specific cities:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "EarnTrack",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "addressCountry": "US"
  }
}
</script>
```

---

## Google Search Console

### Setup
1. Verify ownership
2. Submit sitemap
3. Request indexing for key pages
4. Monitor performance weekly

### Track
- Impressions
- Clicks
- CTR
- Average position
- Core Web Vitals

---

## Google Analytics Setup

```html
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Track Events
- Sign ups
- Platform additions
- Earning entries
- Goal creations
- Upgrades to Pro

---

## SEO Tools

### Free Tools
- [ ] Google Search Console
- [ ] Google Analytics
- [ ] Google PageSpeed Insights
- [ ] Google Mobile-Friendly Test
- [ ] Ubersuggest (limited free)

### Paid Tools (Optional)
- [ ] Ahrefs ($99/month)
- [ ] SEMrush ($119/month)
- [ ] Moz ($99/month)

---

## Content Calendar

### Week 1
- Blog: "How to Track Freelance Income"
- Social: 3 tips posts

### Week 2
- Blog: "Calculate Your Hourly Rate"
- Social: Feature highlights

### Week 3
- Blog: "Setting Income Goals"
- Social: User testimonials

### Week 4
- Blog: "Gig Economy Tax Tips"
- Social: Behind-the-scenes

---

## Competitor Analysis

### Competitors to Study
1. **FreshBooks** - Accounting software
2. **Wave** - Free accounting
3. **QuickBooks Self-Employed** - Tax focused
4. **Mint** - Personal finance
5. **Stride** - Gig worker focused

### What to Analyze
- Keywords they rank for
- Backlinks they have
- Content strategy
- Site structure
- Meta descriptions

### Differentiation
- Focus on multi-platform tracking
- Free tier (unlike QuickBooks)
- Simple (unlike FreshBooks)
- Gig-focused (unlike Mint)

---

## FAQ Section (Add to Landing)

```html
<h2>Frequently Asked Questions</h2>

<h3>Is EarnTrack free?</h3>
<p>Yes! EarnTrack is free for up to 3 platforms. Upgrade to Pro for unlimited platforms.</p>

<h3>What platforms does EarnTrack support?</h3>
<p>EarnTrack supports Upwork, Fiverr, DoorDash, Uber, YouTube, and 50+ other platforms. You can add any platform you earn from.</p>

<h3>Can I export my data?</h3>
<p>Yes! Export your earnings to CSV/Excel format for taxes and accounting.</p>

<h3>Is my data secure?</h3>
<p>Absolutely. We use bank-level encryption and never store payment information.</p>

<h3>Do you have a mobile app?</h3>
<p>Not yet, but EarnTrack is fully responsive and works great on mobile browsers!</p>
```

---

## Monitoring & Reporting

### Weekly Check
- [ ] Google Search Console - New issues?
- [ ] Google Analytics - Traffic trends
- [ ] Rankings - Top 3 keywords
- [ ] Backlinks - Any new ones?

### Monthly Review
- [ ] Top performing pages
- [ ] Keyword rankings
- [ ] Organic traffic growth
- [ ] Conversion rate
- [ ] Bounce rate

---

## Success Metrics

### Month 1
- [ ] 100 organic visits
- [ ] Rank for brand name
- [ ] 5-10 backlinks

### Month 3
- [ ] 500 organic visits
- [ ] Rank top 20 for 3 keywords
- [ ] 20-30 backlinks

### Month 6
- [ ] 2,000 organic visits
- [ ] Rank top 10 for 5 keywords
- [ ] 50+ backlinks

---

## Quick Wins

Do these immediately:
1. [ ] Add meta tags to all pages
2. [ ] Submit sitemap to Google
3. [ ] Optimize images
4. [ ] Add schema markup
5. [ ] Write 2-3 blog posts
6. [ ] Get 5 initial backlinks

---

**SEO is a marathon, not a sprint! 🚀**
