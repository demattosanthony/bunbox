# Bunbox Builder

An AI-powered application builder that creates bunbox apps through natural conversation. Similar to Vercel's v0, but for the bunbox framework and fully open source.

## Features

- **Chat Interface**: Describe what you want to build and watch it get created
- **Full File System Access**: The AI agent can create, modify, and manage files directly
- **Session Persistence**: Conversations are saved so you can continue where you left off
- **Project Management**: View and manage all your created projects
- **Self-Hostable**: Deploy on your own server and keep full control

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime
- Anthropic API key

### Installation

1. Clone the repository and navigate to the app:

```bash
cd apps/bunbox-builder
```

2. Install dependencies:

```bash
bun install
```

3. Create a `.env` file with your Anthropic API key:

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

4. Start the development server:

```bash
bun run dev
```

5. Open http://localhost:3001 in your browser

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (required) | - |
| `PROJECTS_DIR` | Directory where generated projects are stored | `./projects` |
| `DATABASE_PATH` | SQLite database file path | `./data/bunbox-builder.db` |

## How It Works

1. **Chat with the AI**: Describe the app you want to build in natural language
2. **Watch it create**: The AI uses tools to create files, set up the project structure, and write code
3. **Iterate**: Ask for changes, additions, or fixes and the AI will modify the code
4. **Run your app**: Navigate to the project directory and run it with bunbox

## Architecture

```
apps/bunbox-builder/
├── app/
│   ├── page.tsx              # Main chat interface
│   ├── projects/             # Projects management
│   ├── project/[id]/         # Individual project view
│   ├── components/           # React components
│   └── api/                  # Backend API routes
│       ├── chat/             # Chat streaming endpoint
│       ├── sessions/         # Session management
│       └── projects/         # Project CRUD
├── lib/
│   ├── agent/                # AI agent integration
│   │   ├── client.ts         # Anthropic API client
│   │   └── prompt.ts         # System prompt with bunbox knowledge
│   └── db/                   # SQLite database layer
└── bunbox.config.ts
```

## API Endpoints

### Chat
- `POST /api/chat` - Send a message and get a streaming response

### Sessions
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create a new session
- `GET /api/sessions/:id` - Get session with messages
- `DELETE /api/sessions/:id` - Delete a session

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

## Security Considerations

- **API Key Protection**: Never expose your Anthropic API key to the client
- **File System Access**: The agent has access to the projects directory - consider sandboxing in production
- **Rate Limiting**: Consider adding rate limits for production deployments

## License

MIT
