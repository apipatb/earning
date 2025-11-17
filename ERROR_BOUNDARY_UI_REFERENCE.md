# ErrorBoundary UI Reference Guide

## Visual Layout

### Production Mode - Light Theme

```
╔════════════════════════════════════════════════════════════════╗
║                  🔶 GRADIENT HEADER (Orange → Red)             ║
║                                                                ║
║                     ┌─────────────────┐                        ║
║                     │                 │                        ║
║                     │    ⚠️ ICON      │                        ║
║                     │   (Warning)     │                        ║
║                     │                 │                        ║
║                     └─────────────────┘                        ║
║                                                                ║
║              Oops! Something went wrong                        ║
║                 Don't worry, we're on it                       ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                       WHITE CONTENT AREA                        ║
║                                                                ║
║    The application encountered an unexpected error.            ║
║    Our team has been automatically notified and will           ║
║    investigate the issue.                                      ║
║                                                                ║
║    ┌────────────────────────────────────────────────────┐     ║
║    │  ┌──────────────┐    ┌──────────────────┐         │     ║
║    │  │  🔄 TRY      │    │  ✉ CONTACT       │         │     ║
║    │  │   AGAIN      │    │    SUPPORT        │         │     ║
║    │  └──────────────┘    └──────────────────┘         │     ║
║    └────────────────────────────────────────────────────┘     ║
║                                                                ║
║    ─────────────────────────────────────────────────────       ║
║                                                                ║
║    If the problem persists, please contact our support         ║
║    team with details about what you were doing when this       ║
║    error occurred.                                             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

### Development Mode - Additional Error Details

```
╔════════════════════════════════════════════════════════════════╗
║                  🔶 GRADIENT HEADER (Orange → Red)             ║
║              Oops! Something went wrong                        ║
║                 Don't worry, we're on it                       ║
╠════════════════════════════════════════════════════════════════╣
║                       WHITE CONTENT AREA                        ║
║                                                                ║
║    The application encountered an unexpected error.            ║
║    Our team has been automatically notified...                 ║
║                                                                ║
║    ┌──────────────────────────────────────────────────┐       ║
║    │ 🔴 ERROR DETAILS (DEVELOPMENT MODE ONLY)         │       ║
║    ├──────────────────────────────────────────────────┤       ║
║    │                                                  │       ║
║    │ Error Type:                                      │       ║
║    │ ┌────────────────────────────────────────────┐  │       ║
║    │ │ TypeError: Cannot read properties of      │  │       ║
║    │ │ undefined (reading 'name')                 │  │       ║
║    │ └────────────────────────────────────────────┘  │       ║
║    │                                                  │       ║
║    │ Stack Trace:                                     │       ║
║    │ ┌────────────────────────────────────────────┐  │       ║
║    │ │ at Dashboard.render (Dashboard.tsx:45:12) │  │ ⬆️    ║
║    │ │ at processChild (react-dom.js:1234:5)     │  │ │     ║
║    │ │ at updateFunctionComponent (...)          │  │ │     ║
║    │ │ at beginWork (react-dom.js:5678:10)       │  │ │     ║
║    │ │ at performUnitOfWork (...)                │  │ Scroll║
║    │ │ ... (more stack trace)                    │  │ │     ║
║    │ └────────────────────────────────────────────┘  │ ⬇️    ║
║    │                                                  │       ║
║    │ Component Stack:                                 │       ║
║    │ ┌────────────────────────────────────────────┐  │       ║
║    │ │ in Dashboard (at App.tsx:191)             │  │ ⬆️    ║
║    │ │ in Suspense (at App.tsx:190)              │  │ │     ║
║    │ │ in ErrorBoundary (at App.tsx:189)         │  │ Scroll║
║    │ │ in Route (at App.tsx:186)                 │  │ │     ║
║    │ │ ... (more component stack)                │  │ ⬇️    ║
║    │ └────────────────────────────────────────────┘  │       ║
║    └──────────────────────────────────────────────────┘       ║
║                                                                ║
║    ┌──────────────┐    ┌──────────────────┐                  ║
║    │  🔄 TRY      │    │  ✉ CONTACT       │                  ║
║    │   AGAIN      │    │    SUPPORT        │                  ║
║    └──────────────┘    └──────────────────┘                  ║
║                                                                ║
║    ─────────────────────────────────────────────────────       ║
║    If the problem persists...                                  ║
╚════════════════════════════════════════════════════════════════╝
```

## Color Scheme

### Light Mode

#### Header
- **Background:** Linear gradient from `#f97316` (orange-500) to `#ef4444` (red-500)
- **Text:** White (`#ffffff`)
- **Icon Background:** White with 20% opacity (`rgba(255, 255, 255, 0.2)`)

#### Content Area
- **Background:** White (`#ffffff`)
- **Primary Text:** Gray-700 (`#374151`)
- **Secondary Text:** Gray-600 (`#4b5563`)
- **Border:** Gray-200 (`#e5e7eb`)

#### Error Details Panel (Dev Only)
- **Background:** Red-50 (`#fef2f2`)
- **Border:** Red-300 (`#fca5a1`) - 2px
- **Heading:** Red-900 (`#7f1d1d`)
- **Text:** Red-900 (`#7f1d1d`)
- **Code Background:** Red-100 (`#fee2e2`)
- **Code Border:** Red-200 (`#fecaca`)

#### Buttons
- **Try Again:**
  - Background: Blue-600 (`#2563eb`)
  - Hover: Blue-700 (`#1d4ed8`)
  - Active: Blue-800 (`#1e40af`)
  - Text: White
  - Shadow: Large shadow with hover effect

- **Contact Support:**
  - Background: White
  - Hover: Gray-50 (`#f9fafb`)
  - Border: Gray-300 (`#d1d5db`) - 2px
  - Text: Gray-700 (`#374151`)
  - Shadow: Medium shadow with hover effect

### Dark Mode

#### Header
- **Background:** Same gradient (orange-500 to red-500)
- **Text:** White
- **Icon Background:** Same (white with 20% opacity)

#### Content Area
- **Background:** Gray-800 (`#1f2937`)
- **Primary Text:** Gray-300 (`#d1d5db`)
- **Secondary Text:** Gray-400 (`#9ca3af`)
- **Border:** Gray-700 (`#374151`)

#### Error Details Panel (Dev Only)
- **Background:** Red-900 with 20% opacity (`rgba(127, 29, 29, 0.2)`)
- **Border:** Red-700 (`#b91c1c`)
- **Heading:** Red-200 (`#fecaca`)
- **Text:** Red-100 (`#fee2e2`)
- **Code Background:** Red-900 with 40% opacity
- **Code Border:** Red-800 (`#991b1b`)

#### Buttons
- **Try Again:**
  - Same as light mode
  - Focus ring: Blue-800 (`#1e40af`)

- **Contact Support:**
  - Background: Gray-700 (`#374151`)
  - Hover: Gray-600 (`#4b5563`)
  - Border: Gray-600 (`#4b5563`)
  - Text: Gray-200 (`#e5e7eb`)
  - Focus ring: Gray-600

## Spacing and Layout

### Container
- **Max Width:** 2xl (672px)
- **Padding:** 8 (2rem / 32px)
- **Border Radius:** 2xl (1rem / 16px)
- **Shadow:** 2xl shadow

### Header Section
- **Padding:** 6 (1.5rem / 24px)
- **Icon Size:** 16 (4rem / 64px)
- **Icon Padding:** 4 (1rem / 16px)
- **Title Font:** 3xl (1.875rem) bold
- **Subtitle Font:** lg (1.125rem)
- **Spacing:** 4 (1rem) between elements

### Content Section
- **Padding:** 8 (2rem / 32px)
- **Message Spacing:** 8 (2rem) bottom margin
- **Text Font:** lg (1.125rem) for primary, base (1rem) for secondary

### Error Details Panel
- **Padding:** 4 (1rem / 16px)
- **Inner Padding:** 2-3 (0.5-0.75rem)
- **Border:** 2px solid
- **Border Radius:** lg (0.5rem)
- **Spacing:** 3-4 (0.75-1rem) between sections
- **Max Height:**
  - Stack Trace: 64 (16rem / 256px)
  - Component Stack: 48 (12rem / 192px)
- **Scrollbar:** Auto on overflow

### Buttons
- **Padding:** x: 8 (2rem), y: 3 (0.75rem)
- **Font:** Semibold
- **Border Radius:** lg (0.5rem)
- **Gap:** 4 (1rem / 16px) between buttons
- **Layout:** Column on mobile, row on desktop (sm breakpoint)

### Footer Text
- **Margin Top:** 8 (2rem)
- **Padding Top:** 6 (1.5rem)
- **Border Top:** 1px solid
- **Font:** sm (0.875rem)

## Typography

### Font Families
- **Default:** System font stack
- **Code/Stack:** Monospace font family

### Font Sizes
- **Title:** 3xl (1.875rem / 30px)
- **Subtitle:** lg (1.125rem / 18px)
- **Body:** lg (1.125rem / 18px) for main, base (1rem / 16px) for secondary
- **Error Details:** xs (0.75rem / 12px) for code/stack
- **Footer:** sm (0.875rem / 14px)

### Font Weights
- **Title:** Bold (700)
- **Buttons:** Semibold (600)
- **Labels:** Semibold (600)
- **Body:** Normal (400)

## Icons

### Warning Icon (Header)
- **Source:** Heroicons outline
- **Type:** Exclamation Triangle
- **Size:** 16 (4rem / 64px)
- **Stroke Width:** 2px
- **Color:** White

### Refresh Icon (Try Again Button)
- **Source:** Heroicons outline
- **Type:** Arrows Rotate
- **Size:** 5 (1.25rem / 20px)
- **Stroke Width:** 2px
- **Color:** White

### Email Icon (Contact Support Button)
- **Source:** Heroicons outline
- **Type:** Envelope
- **Size:** 5 (1.25rem / 20px)
- **Stroke Width:** 2px
- **Color:** Current text color

## Responsive Behavior

### Mobile (< 640px)
- Buttons stack vertically
- Full width buttons
- Reduced padding: 4 (1rem) instead of 8
- Icon size maintained
- Font sizes maintained

### Desktop (≥ 640px)
- Buttons in horizontal row
- Side-by-side layout
- Full padding: 8 (2rem)
- All features visible

## Accessibility

### Keyboard Navigation
- All buttons are keyboard accessible
- Tab order: Try Again → Contact Support
- Focus rings visible on all interactive elements

### Screen Readers
- Semantic HTML structure
- Clear heading hierarchy
- Descriptive button text
- Error messages announced

### Color Contrast
- All text meets WCAG AA standards
- Error details have high contrast
- Focus states clearly visible

## Animation and Transitions

### Button Hover Effects
- Transform: translateY(-2px) - subtle lift
- Shadow: Enhanced shadow on hover
- Transition: 200ms ease-in-out
- Color transition: Same duration

### No Loading States
- Errors appear immediately
- No fade-in animations
- Instant feedback for user actions

## States

### Normal State
- Error UI displayed
- Both buttons enabled
- Error details visible (dev mode)

### Hover State
- Button background darkens
- Button shadow increases
- Cursor changes to pointer
- Button lifts slightly

### Active State
- Button background further darkened
- Button pressed down slightly
- Shadow reduced

### Focus State
- Prominent focus ring
- Maintained accessibility
- Clear visual indication

## Usage Examples

### Minimal Error
```
Title: "Oops! Something went wrong"
Message: "Network error. Please check your connection."
Actions: Try Again, Contact Support
```

### Validation Error
```
Title: "Oops! Something went wrong"
Message: "Invalid data. Please check your input."
Actions: Try Again
```

### Critical Error
```
Title: "Oops! Something went wrong"
Message: "Critical system error. Please contact support."
Actions: Contact Support
(Try Again button might be hidden for unrecoverable errors)
```

---

This reference guide provides complete visual specifications for implementing or customizing the ErrorBoundary UI component.
