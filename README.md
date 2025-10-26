# Vapi MCP Server

A Model Context Protocol (MCP) server for triggering outbound phone calls using the Vapi AI platform. Deployed on Railway with HTTP/SSE transport for remote access.

## Features

- **MCP Protocol**: Full MCP server implementation with HTTP/SSE transport
- **Single Tool**: `trigger_vapi_call` - Triggers outbound calls using the ANDY assistant
- **Remote Access**: Deployable on Railway for cloud access
- **SSE Transport**: Server-Sent Events for bidirectional MCP communication

## MCP Tool

### `trigger_vapi_call`
Triggers an outbound phone call using your configured Vapi assistant (Andy).

**Parameters:**
- `phoneNumber` (required): Phone number to call (include country code, e.g., +1234567890)

**Example MCP Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "trigger_vapi_call",
    "arguments": {
      "phoneNumber": "+1234567890"
    }
  }
}
```

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local` file:**
   ```
   VAPI_API_KEY=your_vapi_api_key
   ANDY=cde00b8a-3ebf-4d4f-8587-7e8fec8e5fda
   ```

3. **Build and run:**
   ```bash
   npm run build
   npm start
   ```

4. **Test the MCP server:**
   ```bash
   # Health check
   curl http://localhost:3000/health
   
   # MCP SSE endpoint
   curl http://localhost:3000/sse
   ```

## Railway Deployment

### Method 1: Railway CLI (Recommended)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize Railway project:**
   ```bash
   railway init
   ```

4. **Set environment variables:**
   ```bash
   railway variables set VAPI_API_KEY=your_vapi_api_key
   railway variables set ANDY=cde00b8a-3ebf-4d4f-8587-7e8fec8e5fda
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

### Method 2: Railway Dashboard

1. **Connect Repository:**
   - Go to [Railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

2. **Set Environment Variables:**
   - Go to your project → Variables tab
   - Add:
     - `VAPI_API_KEY`: Your Vapi API key
     - `ANDY`: `cde00b8a-3ebf-4d4f-8587-7e8fec8e5fda`

3. **Deploy:**
   - Railway will automatically build and deploy
   - Get your public URL from the deployment

## Usage with MCP Clients

Once deployed, you can connect to the MCP server using any MCP-compatible client:

### Connecting to Remote MCP Server

**SSE Endpoint:** `https://YOUR_RAILWAY_URL/sse`

The server implements the MCP protocol over Server-Sent Events (SSE), allowing remote clients to:
- List available tools
- Call the `trigger_vapi_call` tool
- Receive responses via SSE stream

### Example Client Connection

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Connect to your Railway-deployed MCP server
const transport = new SSEClientTransport('https://YOUR_RAILWAY_URL/sse');
const client = new Client({
  name: 'vapi-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Trigger a call
const result = await client.callTool({
  name: 'trigger_vapi_call',
  arguments: {
    phoneNumber: '+1234567890'
  }
});

console.log('Call result:', result);
```

## API Endpoints

- `GET /` - Server information and MCP details
- `GET /health` - Health check for Railway monitoring
- `GET /sse` - MCP Server-Sent Events endpoint

## Environment Variables

- `VAPI_API_KEY`: Your Vapi API key (required)
- `ANDY`: Assistant ID for calls (defaults to `cde00b8a-3ebf-4d4f-8587-7e8fec8e5fda`)
- `PORT`: Server port (Railway sets this automatically)

## Vapi Integration

The server integrates with Vapi's API:
- **Endpoint**: `POST https://api.vapi.ai/call`
- **Authentication**: Bearer token using `VAPI_API_KEY`
- **Payload**: `{ "assistantId": "cde00b8a-3ebf-4d4f-8587-7e8fec8e5fda", "customer": { "number": "+1234567890" } }`

## Troubleshooting

- **Check logs**: `railway logs` (if using CLI) or view in Railway dashboard
- **Health check**: Visit `https://YOUR_RAILWAY_URL/health` to verify deployment
- **MCP endpoint**: Test `https://YOUR_RAILWAY_URL/sse` for MCP connectivity
- **Environment variables**: Ensure `VAPI_API_KEY` is set correctly
- **Phone number format**: Include country code (e.g., `+1234567890`)

## MCP Protocol Details

This server implements the Model Context Protocol (MCP) specification:
- **Transport**: Server-Sent Events (SSE)
- **Protocol**: JSON-RPC 2.0 over SSE
- **Capabilities**: Tools
- **Tools**: `trigger_vapi_call`