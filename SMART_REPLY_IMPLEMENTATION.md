# AI-Powered Smart Reply Suggestions Implementation

## Overview
A comprehensive smart reply suggestion system for customer service tickets that uses AI and template-based suggestions to help agents respond quickly and effectively.

## Features Implemented

### Backend Components

#### 1. Database Schema (`/app/backend/prisma/schema.prisma`)

Added the following models:

- **SuggestedReply**: Stores AI and template-based reply suggestions
  - Links to ticket messages
  - Tracks confidence scores (0-100)
  - Records acceptance for learning
  - Supports both AI and template sources

- **ReplyTemplate**: Library of reusable reply templates
  - Organized by category
  - Tracks usage count for popularity
  - Can be team-specific or global
  - Auto-learns from accepted suggestions

- **SuggestionSource** enum: AI or TEMPLATE

#### 2. Smart Reply Service (`/app/backend/src/services/smart-reply.service.ts`)

Intelligent suggestion generation with multiple strategies:

**AI-Powered Suggestions:**
- Analyzes message sentiment (positive, neutral, negative, urgent)
- Reviews ticket history and conversation context
- Considers customer interaction history
- Generates contextually appropriate responses
- Uses OpenAI GPT-4o-mini for generation

**Template-Based Suggestions:**
- Matches templates by ticket category
- Ranks by popularity (usage count)
- Adjusts confidence based on sentiment matching
- Falls back when AI is unavailable

**Learning System:**
- Tracks accepted suggestions
- Increments template usage counts
- Improves future recommendations

**Key Methods:**
- `generateSuggestions()` - Main entry point for getting suggestions
- `acceptSuggestion()` - Track when suggestions are used
- `getTemplates()` - Retrieve template library
- `createTemplate()` - Add new templates
- `getSuggestionStats()` - Analytics on suggestion performance

#### 3. Smart Reply Controller (`/app/backend/src/controllers/smart-reply.controller.ts`)

REST API endpoints:

```
GET    /api/v1/smart-reply/suggestions/:messageId?ticketId=xxx  - Get suggestions for a message
GET    /api/v1/smart-reply/templates                            - List all templates
POST   /api/v1/smart-reply/templates                            - Create new template
PUT    /api/v1/smart-reply/templates/:id                        - Update template
DELETE /api/v1/smart-reply/templates/:id                        - Delete template
POST   /api/v1/smart-reply/:id/accept                           - Mark suggestion as accepted
GET    /api/v1/smart-reply/stats                                - Get statistics
```

All endpoints include:
- Authentication required
- UUID validation
- Error handling
- Request validation with Zod

### Frontend Components

#### SmartReplySuggestions Component (`/app/frontend/src/components/SmartReplySuggestions.tsx`)

React component with modern UX:

**Features:**
- Auto-fetches suggestions on mount
- Displays 2-3 suggestions with confidence scores
- Color-coded confidence levels (green=80+, yellow=60-79, orange=<60)
- Source indicators (AI sparkle icon, template emoji)
- One-click insertion into message box
- Copy to clipboard functionality
- Refresh suggestions button
- Loading and error states
- Gradient purple/blue design

**Props:**
```typescript
interface SmartReplySuggestionsProps {
  messageId: string;      // ID of the customer message
  ticketId: string;       // ID of the ticket
  onSelect: (suggestion: string) => void;  // Callback when suggestion selected
  className?: string;     // Optional CSS classes
}
```

## Usage Example

### In a Ticket Reply Interface:

```tsx
import { useState } from 'react';
import SmartReplySuggestions from './components/SmartReplySuggestions';

function TicketReplyBox({ ticketId, latestMessageId }) {
  const [replyText, setReplyText] = useState('');

  const handleSuggestionSelect = (suggestion: string) => {
    // Insert suggestion into reply box
    setReplyText(suggestion);
  };

  return (
    <div>
      {/* Smart Reply Suggestions */}
      <SmartReplySuggestions
        messageId={latestMessageId}
        ticketId={ticketId}
        onSelect={handleSuggestionSelect}
        className="mb-4"
      />

      {/* Reply Text Area */}
      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Type your reply or select a suggestion above..."
        className="w-full p-3 border rounded-lg"
        rows={6}
      />

      <button
        onClick={() => sendReply(replyText)}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Send Reply
      </button>
    </div>
  );
}
```

### Creating Templates via API:

```typescript
// Create a new template
const response = await fetch('http://localhost:3001/api/v1/smart-reply/templates', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Order Status Inquiry',
    content: 'Thank you for reaching out. I\'ve checked your order status and can confirm that it is currently being processed. You should receive a shipping confirmation within 24 hours.',
    category: 'order-inquiry'
  })
});
```

## Configuration

### Environment Variables

Add to `/app/backend/.env`:

```env
# OpenAI Configuration (for AI suggestions)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL_NAME=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
OPENAI_MAX_TOKENS=1000         # Optional, defaults to 1000
```

### Frontend Configuration

Add to `/app/frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

## Database Migration

To create the database tables, run:

```bash
cd /home/user/earning/app/backend
npx prisma migrate dev --name add_smart_reply_suggestions
```

This will create:
- `suggested_replies` table
- `reply_templates` table
- Required indexes for performance

## How It Works

### Suggestion Generation Flow

1. **Customer sends message** → Creates `TicketMessage` with sentiment analysis
2. **Agent opens ticket** → Frontend displays `SmartReplySuggestions` component
3. **Component fetches suggestions** → Calls GET `/api/v1/smart-reply/suggestions/:messageId`
4. **Service generates suggestions**:
   - **AI Path**: Analyzes sentiment, ticket context, customer history → Calls OpenAI → Returns 2-3 AI suggestions
   - **Template Path**: Matches category and sentiment → Returns relevant templates
5. **Results ranked by confidence** → Displayed to agent
6. **Agent selects suggestion** → Calls POST `/api/v1/smart-reply/:id/accept`
7. **System learns** → Increments template usage count, marks suggestion as accepted

### Intelligence Features

**Sentiment-Aware:**
- Detects negative sentiment → Suggests apologetic, empathetic responses
- Detects positive sentiment → Suggests thank you and follow-up responses
- Detects urgent sentiment → Prioritizes immediate action responses

**Context-Aware:**
- Analyzes last 10 messages in ticket
- Reviews customer's previous tickets
- Matches ticket category and priority

**Self-Improving:**
- Tracks which suggestions are accepted
- Promotes frequently-used templates
- Learns from agent behavior

## API Documentation

### Get Suggestions

```http
GET /api/v1/smart-reply/suggestions/:messageId?ticketId=xxx&limit=3
Authorization: Bearer <token>

Response:
{
  "suggestions": [
    {
      "id": "uuid",
      "suggestion": "Thank you for your patience...",
      "confidence": 85,
      "source": "AI",
      "templateId": null
    }
  ],
  "count": 3
}
```

### Accept Suggestion

```http
POST /api/v1/smart-reply/:id/accept
Authorization: Bearer <token>

Response:
{
  "message": "Suggestion accepted successfully"
}
```

### List Templates

```http
GET /api/v1/smart-reply/templates?category=order-inquiry
Authorization: Bearer <token>

Response:
{
  "templates": [
    {
      "id": "uuid",
      "title": "Order Status Inquiry",
      "content": "Thank you for...",
      "category": "order-inquiry",
      "usageCount": 24
    }
  ],
  "count": 1
}
```

### Get Statistics

```http
GET /api/v1/smart-reply/stats?ticketId=xxx
Authorization: Bearer <token>

Response:
{
  "totalSuggestions": 150,
  "acceptedSuggestions": 98,
  "acceptanceRate": 65.33,
  "aiSuggestions": 90,
  "templateSuggestions": 60
}
```

## File Structure

```
/home/user/earning/
├── app/
│   ├── backend/
│   │   ├── prisma/
│   │   │   └── schema.prisma (updated)
│   │   └── src/
│   │       ├── controllers/
│   │       │   └── smart-reply.controller.ts (new)
│   │       ├── routes/
│   │       │   └── smart-reply.routes.ts (new)
│   │       ├── services/
│   │       │   └── smart-reply.service.ts (new)
│   │       └── server.ts (updated)
│   └── frontend/
│       └── src/
│           └── components/
│               └── SmartReplySuggestions.tsx (new)
```

## Performance Optimizations

1. **Caching**: Suggestions are stored in DB to avoid regenerating for same message
2. **Indexes**: Optimized queries with indexes on messageId, confidence, source
3. **Rate Limiting**: Applied at API level (inherits from server config)
4. **Lazy Loading**: Frontend only fetches when component mounts

## Future Enhancements

- **Multi-language support**: Detect customer language and generate localized suggestions
- **A/B Testing**: Test different suggestion strategies
- **Fine-tuning**: Train custom model on accepted suggestions
- **Canned responses**: Quick access to most-used templates
- **Suggestion editing**: Allow agents to modify before sending
- **Analytics dashboard**: Track suggestion performance over time

## Testing

### Manual Testing Steps

1. **Create a test ticket** with customer message
2. **Open ticket reply interface** with SmartReplySuggestions component
3. **Verify suggestions appear** with correct confidence scores
4. **Click "Use This Reply"** and verify text is inserted
5. **Send reply** and check suggestion is marked as accepted
6. **Create templates** via API and verify they appear in suggestions

### Example Test Data

```sql
-- Insert test template
INSERT INTO reply_templates (id, title, content, category, usage_count)
VALUES (
  gen_random_uuid(),
  'General Thank You',
  'Thank you for contacting us. We appreciate your business and will respond shortly.',
  'general',
  0
);
```

## Troubleshooting

**No suggestions appearing:**
- Check OpenAI API key is set
- Verify ticket and message IDs are valid
- Check browser console for errors
- Verify backend is running on port 3001

**Low confidence scores:**
- Check if templates match ticket category
- Verify sentiment analysis is working
- Add more relevant templates

**AI not generating suggestions:**
- Confirm OPENAI_API_KEY is set
- Check OpenAI API quota/limits
- Review backend logs for errors

## Dependencies

### Backend
- `@prisma/client` - Database ORM
- `openai` - AI suggestion generation
- `express` - Web framework
- `zod` - Request validation

### Frontend
- `react` - UI framework
- `axios` - HTTP client
- `lucide-react` - Icons

## License

This implementation follows the same license as the EarnTrack platform.
