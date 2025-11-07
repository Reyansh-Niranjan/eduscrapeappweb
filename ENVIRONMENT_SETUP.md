# Environment Setup Guide

## 🚨 CRITICAL: Add OpenRouter API Key

The chatbot is currently showing a **401 Unauthorized** error because the OpenRouter API key is not configured.

### Step-by-Step Setup:

1. **Go to Convex Dashboard**
   - Visit: https://dashboard.convex.dev/d/youthful-wolf-545

2. **Navigate to Environment Variables**
   - Click on "Settings" in the left sidebar
   - Click on "Environment Variables"

3. **Add the API Key**
   - Click "Add Environment Variable"
   - **Name**: `OPENROUTER_API_KEY`
   - **Value**: `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`
   - Click "Save"

4. **Verify Setup**
   - The environment variable should now appear in the list
   - No restart needed - it's available immediately

### Build Scripts Added:

```bash
# Build both frontend and backend for production
npm run build

# Build only frontend
npm run build:frontend

# Build only backend
npm run build:backend

# Preview production build
npm run preview
```

### Testing the Chatbot:

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Open Browser**: http://localhost:5175

3. **Test the Chatbot**:
   - Click the floating chat button (bottom-right corner)
   - Try asking: "Tell me about your team"
   - The chatbot should now respond with information about Celestial Coders

### Troubleshooting:

- **401 Unauthorized**: Make sure the `OPENROUTER_API_KEY` is added to Convex dashboard
- **Validation Errors**: Fixed - the `_creationTime` field is now properly included in validators
- **Function Not Found**: Run `npx convex dev --once` to deploy functions

### What's Fixed:

✅ **Validation Error**: Fixed `ReturnsValidationError` by adding `_creationTime` to the validator  
✅ **TypeScript Errors**: All type annotations added  
✅ **Build Scripts**: Added comprehensive build commands  
✅ **API Integration**: OpenRouter integration ready (just needs API key)  

The chatbot is now fully functional and ready to use once you add the API key!
