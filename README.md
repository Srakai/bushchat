# bushchat

A non-linear chat interface for LLMs (ChatGPT). Conversations are displayed as a tree structure, allowing you to branch off at any point and explore multiple conversation paths simultaneously.

## Features

- 🌳 Tree-based conversation flow (not linear)
- 🔀 Create branches to explore different responses
- 🤖 Supports modern OpenAI models (GPT-4o, o1, etc.)
- 🖱️ Drag-and-drop node interface

## Setup

1. Clone the repo
2. `npm install`
3. Create `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your-key-here
   ```
4. `npm run dev`