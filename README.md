# ClearWrite ✍️

<img width="1920" height="921" alt="image" src="https://github.com/user-attachments/assets/473bc089-bf88-46a6-9010-8079fd0fd626" />
</br></br>
ClearWrite is an intelligent writing assistant that provides real-time grammar checking, style suggestions, and AI-powered text enhancement and summarization.

## Features

- 📝 **Rich Text Editor** - Powered by TipTap for a smooth writing experience
- ✅ **Real-time Grammar Checking** - Catch errors as you type
- 💡 **Style Suggestions** - Improve your writing clarity and tone
- 🤖 **AI Text Enhancement** - Enhance your text with AI-powered vocabulary and clarity improvements
- 📋 **AI Summarization** - Get concise summaries of your text
- ⚙️ **Multiple AI Providers** - Choose between Google Gemini or Longcat AI (server-side)
- 🔒 **Secure API Keys** - API keys kept safe on server, never exposed to client
- 🎨 **Modern UI** - Clean, responsive interface built with Tailwind CSS

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Editor**: TipTap
- **AI**: Google Gemini AI / Longcat AI (configurable)
- **Serverless**: Vercel Functions
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- AI Provider API Key (Google Gemini or Longcat)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MithunWijayasiri/ClearWrite.git
   cd ClearWrite
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:
   
   **For Gemini (Default):**
   ```env
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```
   
   **For Longcat:**
   ```env
   AI_PROVIDER=longcat
   LONGCAT_API_KEY=your_longcat_api_key_here
   LONGCAT_MODEL=LongCat-Flash-Chat
   LONGCAT_ENDPOINT=https://api.longcat.chat/openai
   ```
   
   > **Security Note:** These variables are server-side only and will never be exposed to the client.

4. Start the development server:
   ```bash
   npx vercel dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

**All environment variables are server-side only for security.** API keys are never exposed to the client.

### Common Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|----------|
| `AI_PROVIDER` | AI provider to use (`gemini` or `longcat`) | No | `gemini` |

### Gemini Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes (if using Gemini) |
| `GEMINI_MODEL` | The Gemini model to use (e.g., `gemini-2.5-flash`) | Yes (if using Gemini) |

### Longcat Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|----------|
| `LONGCAT_API_KEY` | Your Longcat API key | Yes (if using Longcat) | - |
| `LONGCAT_MODEL` | The Longcat model to use (e.g., `LongCat-Flash-Chat`) | Yes (if using Longcat) | - |
| `LONGCAT_ENDPOINT` | Longcat API endpoint | No | `https://api.longcat.chat/openai` |

## Deployment on Vercel

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings based on your chosen AI provider:
   
   **For Gemini:**
   - `AI_PROVIDER` - Set to `gemini`
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `GEMINI_MODEL` - The Gemini model name to use
   
   **For Longcat:**
   - `AI_PROVIDER` - Set to `longcat`
   - `LONGCAT_API_KEY` - Your Longcat API key
   - `LONGCAT_MODEL` - The Longcat model name
   - `LONGCAT_ENDPOINT` - (Optional) Custom endpoint URL
   
   > **Note:** These are server-side environment variables in Vercel. They will NOT be exposed to the client.
4. Deploy!

## Scripts

| Command | Description |
|---------|-------------|
| `npx vercel dev` | Start development server with serverless functions |
| `npm run dev` | Start Vite dev server only (no API) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
ClearWrite/
├── api/                 # Vercel serverless functions
│   └── ai.ts            # AI endpoint (enhance & summarize)
├── public/              # Static assets
├── src/
│   ├── assets/          # Images and other assets
│   ├── components/      # React components
│   │   ├── Editor.tsx   # Main editor component
│   │   └── Sidebar.tsx  # Sidebar component
│   ├── services/        # API services
│   │   ├── aiService.ts # Client-side API calls to serverless functions
│   │   └── grammarService.ts # Grammar checking
│   ├── App.tsx          # Main App component
│   ├── index.css        # Global styles
│   ├── index.tsx        # Entry point
│   └── types.ts         # TypeScript types
├── .env.local           # Environment variables (not committed)
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vercel.json          # Vercel configuration
└── vite.config.ts
```

## License

MIT License - feel free to use this project for your own purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
