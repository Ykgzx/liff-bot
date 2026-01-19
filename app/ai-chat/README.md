# AI Chat Infrastructure

This directory contains the AI-powered chat and Q&A feature for the Next.js application.

## Setup Complete

The following infrastructure has been set up:

### Dependencies Installed
- **Vercel AI SDK** (`ai`): For streaming AI responses and chat management
- **OpenAI SDK** (`openai`): For integration with OpenAI's GPT models
- **Testing Libraries**: Jest, fast-check, @testing-library/react for comprehensive testing

### Configuration Files
- **Environment Variables**: OpenAI API key configuration in `.env`
- **TypeScript Interfaces**: Complete type definitions in `app/types/chat.ts`
- **Configuration**: Chat settings and constants in `app/config/chat.ts`
- **Utilities**: Helper functions in `app/utils/chat.ts`

### Testing Setup
- **Jest Configuration**: Configured for TypeScript and React testing
- **Property-Based Testing**: fast-check library for comprehensive property testing
- **Unit Tests**: Basic utility function tests implemented

## Environment Variables Required

Add your OpenAI API key to the `.env` file:

```
OPENAI_API_KEY=your_actual_openai_api_key_here
```

## Next Steps

The infrastructure is ready for implementing:
1. AI chat API route (`/app/api/chat/route.ts`)
2. Chat page components (`/app/ai-chat/page.tsx`)
3. Navigation integration
4. Message components and UI

## Testing

Run tests with:
```bash
npm test
npm run test:watch  # For watch mode
```

## Architecture

The AI chat feature follows the existing Next.js application patterns and integrates seamlessly with:
- Existing authentication (LINE LIFF)
- Current navigation structure
- Application styling and theming
- Local storage for persistence