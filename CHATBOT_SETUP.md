# AI Chatbot Setup Instructions

## Environment Configuration

To enable the AI chatbot functionality, you need to configure the OpenRouter API key in your Convex environment.

### Steps:

1. **Access Convex Dashboard**
   - Go to https://dashboard.convex.dev/
   - Navigate to your project: `youthful-wolf-545`

2. **Add Environment Variable**
   - Go to Settings → Environment Variables
   - Add a new environment variable:
     - **Name**: `OPENROUTER_API_KEY`
     - **Value**: `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`

3. **Deploy Changes**
   - The environment variable will be available to your Convex functions immediately
   - No need to redeploy your functions

### Testing the Chatbot

Once the environment variable is configured:

1. **Start the development server**: `npm run dev`
2. **Open the website** in your browser
3. **Click the floating chat button** in the bottom-right corner
4. **Test with sample questions**:
   - "Tell me about your team"
   - "What projects have you built?"
   - "Who is Reyansh Niranjan?"
   - "What is EduScrapeApp?"

### Features

- **Portfolio Context**: The chatbot has access to all your team, project, and update information
- **Real-time Chat**: Messages are sent to OpenRouter's Claude 3.5 Sonnet model
- **Persistent Sessions**: Chat history is maintained during the session
- **Responsive Design**: Works on both desktop and mobile devices

### Troubleshooting

If the chatbot is not working:

1. **Check Environment Variable**: Ensure `OPENROUTER_API_KEY` is set in Convex dashboard
2. **Check Console**: Look for any error messages in the browser console
3. **Check Network**: Verify that API calls to OpenRouter are being made
4. **API Key Validity**: Ensure the OpenRouter API key is valid and has sufficient credits

### Security Notes

- The API key is stored securely in Convex environment variables
- It's never exposed to the client-side code
- All API calls are made through Convex actions on the server side
