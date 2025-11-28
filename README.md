# ClearWrite ✍️

ClearWrite is an intelligent writing assistant that provides real-time grammar checking, style suggestions, and AI-powered text enhancement and summarization.

## Features

- 📝 **Rich Text Editor** - Powered by TipTap for a smooth writing experience
- ✅ **Real-time Grammar Checking** - Catch errors as you type
- 💡 **Style Suggestions** - Improve your writing clarity and tone
- 🤖 **AI Text Enhancement** - Enhance your text with AI-powered vocabulary and clarity improvements
- 📋 **AI Summarization** - Get concise summaries of your text
- 🎨 **Modern UI** - Clean, responsive interface built with Tailwind CSS

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Editor**: TipTap
- **AI**: Google Gemini AI
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API Key

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
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |
| `GEMINI_MODEL` | The Gemini model to use (e.g., `gemini-2.5-flash`) | Yes |

## Deployment on Vercel

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add the following environment variables in Vercel project settings:
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `GEMINI_MODEL` - The model name (e.g., `gemini-2.5-flash`)
4. Deploy!

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
ClearWrite/
├── public/              # Static assets
├── src/
│   ├── assets/          # Images and other assets
│   ├── components/      # React components
│   │   ├── Editor.tsx   # Main editor component
│   │   └── Sidebar.tsx  # Sidebar component
│   ├── services/        # API services
│   │   ├── aiService.ts # Gemini AI integration
│   │   └── grammarService.ts # Grammar checking
│   ├── App.tsx          # Main App component
│   ├── index.css        # Global styles
│   ├── index.tsx        # Entry point
│   └── types.ts         # TypeScript types
├── .env.local           # Environment variables (not committed)
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## License

MIT License - feel free to use this project for your own purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
