#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface VapiCallRequest {
  phoneNumber: string;
}

interface VapiCallResponse {
  id: string;
  status: string;
  message?: string;
}

class VapiMCPServer {
  private server: Server;
  private vapiApiKey: string;
  private assistantId: string;
  private port: number;
  private mcpApiKey: string;

  constructor() {
    this.vapiApiKey = process.env.VAPI_API_KEY || '';
    this.assistantId = process.env.ANDY || 'cde00b8a-3ebf-4d4f-8587-7e8fec8e5fda';
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.mcpApiKey = process.env.MCP_API_KEY || ''; // Optional API key for MCP access
    
    if (!this.vapiApiKey) {
      throw new Error('VAPI_API_KEY environment variable is required');
    }

    this.server = new Server(
      {
        name: 'vapi-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'trigger_vapi_call',
            description: 'Trigger an outbound phone call using Vapi AI assistant (Andy)',
            inputSchema: {
              type: 'object',
              properties: {
                phoneNumber: {
                  type: 'string',
                  description: 'Phone number to call (include country code, e.g., +1234567890)',
                },
              },
              required: ['phoneNumber'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'trigger_vapi_call') {
        return await this.handleVapiCall(request.params.arguments);
      }
      
      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  private async handleVapiCall(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const { phoneNumber } = args as VapiCallRequest;

      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }

      const callData = {
        assistantId: this.assistantId,
        customer: {
          number: phoneNumber,
        },
      };

      const response = await fetch('https://api.vapi.ai/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.vapiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vapi API error: ${response.status} - ${errorText}`);
      }

      const result: VapiCallResponse = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: `Successfully triggered Vapi call!\n\nCall ID: ${result.id}\nStatus: ${result.status}\nPhone Number: ${phoneNumber}\nAssistant ID: ${this.assistantId}${result.message ? `\nMessage: ${result.message}` : ''}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error triggering Vapi call: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  async start() {
    const app = express();
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        assistantId: this.assistantId,
        server: 'vapi-mcp-server'
      });
    });

    // Root endpoint with MCP info
    app.get('/', (req, res) => {
      res.json({
        name: 'Vapi MCP Server',
        version: '1.0.0',
        description: 'MCP server for triggering Vapi outbound calls',
        transport: 'SSE (Server-Sent Events)',
        endpoint: '/sse',
        assistantId: this.assistantId,
        tools: ['trigger_vapi_call']
      });
    });

    // MCP SSE endpoint
    app.get('/sse', async (req, res) => {
      // Optional API key authentication
      if (this.mcpApiKey) {
        const authHeader = req.headers.authorization;
        const apiKey = authHeader?.replace('Bearer ', '') || req.query.apiKey as string;
        
        if (apiKey !== this.mcpApiKey) {
          return res.status(401).json({ error: 'Invalid API key' });
        }
      }
      
      // Set proper SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      const transport = new SSEServerTransport('/sse', res);
      await this.server.connect(transport);
    });

    app.listen(this.port, () => {
      console.log(`Vapi MCP Server running on port ${this.port}`);
      console.log(`Assistant ID: ${this.assistantId}`);
      console.log(`MCP SSE endpoint: http://localhost:${this.port}/sse`);
      console.log(`Health check: http://localhost:${this.port}/health`);
    });
  }
}

// Start the server
const server = new VapiMCPServer();
server.start().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});