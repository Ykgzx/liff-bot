# AI Chat Setup Guide

## Current Status

The AI Chat page is ready to use with the following configuration options:

### Priority Order (in the chat API):
1. **Firestore FAQ** (Electronics Q&A) - ✓ Implemented, needs seeding
2. **Dialogflow** - Optional advanced NLU
3. **OpenAI** - Fallback general AI

---

## Quick Start (FAQ-Only Mode)

### Step 1: Ensure Firestore Credentials Are Set

Option A (Recommended): Use service account JSON as base64
```bash
# Convert your service account JSON to base64
$serviceAccountPath = "path/to/serviceAccountKey.json"
$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($serviceAccountPath))
echo "FIREBASE_SERVICE_ACCOUNT_BASE64=$base64"
```

Then add to `.env`:
```env
FIREBASE_SERVICE_ACCOUNT_BASE64=your-base64-encoded-service-account
FIRESTORE_PROJECT_ID=your-firebase-project-id
```

Option B: Use Application Default Credentials
```bash
export GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
export FIRESTORE_PROJECT_ID=your-firebase-project-id
```

### Step 2: Seed the Electronics FAQ Data

```bash
# Start the dev server
npm run dev

# In another terminal, seed the FAQ (one-time only)
curl -X POST http://localhost:3000/api/seed-faq

# Or with an optional security token
curl -X POST http://localhost:3000/api/seed-faq \
  -H "Authorization: Bearer your-seed-token"
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully seeded 10 electronics FAQs",
  "data": { "success": true, "count": 10 }
}
```

### Step 3: Test the Chat

Open the AI Chat page (`/ai-chat`) and ask electronics-related questions:
- "What is the warranty period?"
- "How long does shipping take?"
- "Can I return electronics?"
- "Do you have refurbished items?"

The chat will answer from the FAQ database.

---

## Optional: Add OpenAI Integration

To add general AI responses (for questions not in FAQ):

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Add to `.env`:
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

3. Restart the dev server

Now the chat will:
1. Check FAQ first
2. If no match, use OpenAI for general responses

---

## Optional: Add Dialogflow Integration

For advanced natural language understanding and intents:

1. Create a Dialogflow ES agent in Google Cloud
2. Generate an OAuth2 access token:
```bash
gcloud auth application-default print-access-token
```

3. Add to `.env`:
```env
DIALOGFLOW_PROJECT_ID=your-dialogflow-project-id
DIALOGFLOW_TOKEN=your-oauth2-access-token
```

4. Restart the dev server

The chat will now:
1. Check FAQ first (fast, deterministic)
2. If no FAQ match, use Dialogflow (NLU-based)
3. Fallback to OpenAI if Dialogflow not configured

---

## FAQ API Endpoints

### Seed FAQ Data
```
POST /api/seed-faq
Response: { "success": true, "message": "...", "data": { "count": 10 } }
```

### Search FAQ
```
GET /api/seed-faq?query=warranty
Response: { "success": true, "data": { "id": "...", "question": "...", "answer": "..." } }
```

---

## Firestore Collections Structure

### FAQ Collection
```
collection("FAQ")
├── id: string
├── question: string
├── answer: string
├── category: string (warranty|shipping|payment|returns|support|etc)
├── keywords: string[]
└── createdAt: timestamp
```

### User Collection (for points system)
```
collection("User")
├── id: string
├── lineId: string (unique)
├── name: string
├── picture: string
├── totalPoints: number
└── createdAt: timestamp
```

### Code Collection (for redemption)
```
collection("Code")
├── id: string
├── code: string (unique)
├── points: number
├── usedBy: string (lineId)
└── usedAt: timestamp
```

### Point Collection (transaction history)
```
collection("Point")
├── id: string
├── lineId: string
├── points: number
├── type: string (earn|redeem|etc)
├── description: string
└── date: timestamp
```

---

## Troubleshooting

### "Service Temporarily Unavailable" Error
- Check that FIRESTORE_PROJECT_ID and credentials are set
- Ensure Firestore database is created in Google Cloud
- Run seed API to populate FAQ data

### FAQ Search Not Returning Results
- Verify FAQ data was seeded: `GET /api/seed-faq?query=warranty`
- Check Firestore console for FAQ collection
- Adjust keyword matching threshold in `app/utils/faqSearch.ts` (currently 2)

### OpenAI/Dialogflow Not Working
- Verify API keys/tokens are correct and not placeholders
- Check .env file is loaded properly
- Restart dev server after changing .env

---

## Current 10 Electronics FAQs

1. **Warranty** - 1-year manufacturer warranty coverage
2. **Refurbished** - Discounted refurbished items available
3. **Payment** - Credit cards, digital wallets, installments
4. **Shipping** - 5-7 business days standard, express available
5. **Returns** - 30-day money-back guarantee
6. **Power** - Universal voltage 100-240V, adapters available
7. **Selection** - Product selector tool with filters
8. **Support** - 24/7 customer support in multiple languages
9. **Setup** - Free setup assistance for 30 days
10. **Best Sellers** - Headphones, smart home, chargers, accessories

---

## Next Steps

1. Set up Firestore credentials
2. Seed the FAQ data
3. Test the chat with electronics questions
4. (Optional) Add OpenAI or Dialogflow for enhanced responses
