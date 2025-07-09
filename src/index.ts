#!/usr/bin/env node

/**
 * Universal OpenAPI MCP Server
 * 
 * TOOL SELECTION DECISION TREE (PRIORITY ORDER):
 * 
 * 1. User wants to call/use APIs (MOST COMMON):
 *    → manage_session action="list" (check existing sessions first)
 *    → If session exists: use session's OpenAPI spec for operations
 *    → If no session: init_api to create new session
 *    → Then: list_operations → describe_api → call_api
 * 
 * 2. User provides new API base URL:
 *    → init_api (discovers OpenAPI spec, sets up session, detects auth)
 *    → Then follow operations workflow above
 * 
 * 3. User provides specific OpenAPI spec URL/path directly:
 *    → list_operations (to see what's available)
 *    → describe_api (for parameter details)  
 *    → call_api (to execute operations)
 * 
 * 4. User mentions authentication/credentials:
 *    → manage_auth (configure auth for the API)
 *    → Then proceed with other tools
 * 
 * 5. User asks to find local API files (OPTIONAL/RARE):
 *    → discover_apis (scan directories for OpenAPI specs)
 *    → Then follow operations workflow
 * 
 * KEYWORDS THAT INDICATE TOOL CHOICE:
 * - "call the API", "use the backend", "make request" → manage_session (check sessions first!)
 * - "work with https://api.example.com" → init_api
 * - "use this OpenAPI spec", "here's the spec URL" → list_operations
 * - "what can I do", "show operations", "endpoints" → list_operations  
 * - "how do I call", "parameters needed", "details" → describe_api
 * - "call X operation", "execute Y", "test endpoint Z" → call_api
 * - "API key", "token", "auth", "credentials" → manage_auth
 * - "my saved APIs", "switch API", "sessions" → manage_session
 * - "find local APIs", "scan for specs" → discover_apis (RARE)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { callApi } from "./tools/call-api.js";
import { describeApi } from "./tools/describe-api.js";
import { discoverApis } from "./tools/discover-apis.js";
import { initApi } from "./tools/init-api.js";
import { listOperations } from "./tools/list-operations.js";
import { manageAuth } from "./tools/manage-auth.js";
import { manageSession } from "./tools/manage-session.js";
import {
  CallApiSchema,
  DescribeApiSchema,
  DiscoverApisSchema,
  InitApiSchema,
  ListOperationsSchema,
  ManageAuthSchema,
  ManageSessionSchema,
  type CallApiParams,
  type DescribeApiParams,
  type DiscoverApisParams,
  type InitApiParams,
  type ListOperationsParams,
  type ManageAuthParams,
  type ManageSessionParams,
} from "./types/index.js";

class UniversalOpenApiMcp {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "openapi-client-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "init_api",
            description:
              "🚀 SMART START: Initialize API session with auto-discovery and authentication setup. USE WHEN: User provides a base URL and wants to get started quickly. This is the MAIN TOOL when user says 'use this API', 'work with https://api.example.com', or provides any base URL. Automatically discovers OpenAPI spec, sets up session, detects auth requirements, and provides next steps. ONE-STOP tool for API onboarding.",
            inputSchema: InitApiSchema.shape,
          },
          {
            name: "manage_session",
            description:
              "📁 SESSION MANAGER: Manage saved API sessions (list, activate, delete, info). PRIORITY USE: When user wants to call APIs or use backends - CHECK SESSIONS FIRST! Shows all saved sessions with their OpenAPI specs and auth status. Essential first step when user says 'call the API', 'use the backend', or wants to make requests.",
            inputSchema: ManageSessionSchema.shape,
          },
          {
            name: "discover_apis",
            description:
              "🔍 OPTIONAL FILE SCANNER: Find OpenAPI specs in local directories. RARELY NEEDED - only use when user specifically asks to 'find local API files' or 'scan workspace for specs'. Most users provide OpenAPI URLs directly or use init_api with base URLs. This is a secondary utility tool, not part of the main workflow.",
            inputSchema: DiscoverApisSchema.shape,
          },
          {
            name: "list_operations",
            description:
              "📋 OPERATION EXPLORER: Show all operations from an OpenAPI spec. PRIMARY USE: When user provides OpenAPI spec URL/path directly and asks 'what can I do' OR after using init_api to explore discovered operations. Shows operation IDs, methods, paths by category. This is a CORE tool for working with known OpenAPI specifications.",
            inputSchema: ListOperationsSchema.shape,
          },
          {
            name: "describe_api",
            description:
              "📖 PARAMETER GUIDE: Get detailed info about API or specific operation from OpenAPI spec. PRIMARY USE: When user has OpenAPI spec and needs parameter details, request/response schemas, or examples before making calls. Without operation_id: gives API overview. With operation_id: shows detailed parameter requirements. Essential for understanding how to call operations.",
            inputSchema: DescribeApiSchema.shape,
          },
          {
            name: "manage_auth",
            description:
              "🔐 AUTH CONFIGURATOR: Configure API authentication. USE WHEN: User mentions API keys, tokens, authentication, or API calls fail with auth errors (401/403). Usually called after init_api detects auth requirements. Set up once per API source, persists for subsequent calls. Handles API key, Bearer, Basic, OAuth2.",
            inputSchema: ManageAuthSchema.shape,
          },
          {
            name: "call_api",
            description:
              "🚀 API EXECUTOR: Make actual API requests using OpenAPI specs. PRIMARY USE: When user wants to execute specific API operations, test endpoints, or get real data. Requires docs_path (OpenAPI spec URL/path) and operation_id. This is the main ACTION tool for calling APIs defined in OpenAPI specifications.",
            inputSchema: CallApiSchema.shape,
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "init_api":
            const initParams = InitApiSchema.parse(args) as InitApiParams;
            return await initApi(initParams);

          case "manage_session":
            const sessionParams = ManageSessionSchema.parse(
              args
            ) as ManageSessionParams;
            return await manageSession(sessionParams);

          case "discover_apis":
            const discoverParams = DiscoverApisSchema.parse(
              args
            ) as DiscoverApisParams;
            return await discoverApis(discoverParams);

          case "call_api":
            const callParams = CallApiSchema.parse(args) as CallApiParams;
            return await callApi(callParams);

          case "list_operations":
            const listParams = ListOperationsSchema.parse(
              args
            ) as ListOperationsParams;
            return await listOperations(listParams);

          case "describe_api":
            const describeParams = DescribeApiSchema.parse(
              args
            ) as DescribeApiParams;
            return await describeApi(describeParams);

          case "manage_auth":
            const authParams = ManageAuthSchema.parse(args) as ManageAuthParams;
            return await manageAuth(authParams);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);

        // If it's a validation error, provide helpful feedback
        if (error instanceof Error && error.name === "ZodError") {
          const zodError = error as any;
          const issues = zodError.issues
            .map((issue: any) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", ");
          let helpText = `\n\n**🎯 When to use this tool:**\n`;

          switch (name) {
            case "init_api":
              helpText += `- User provides API base URL: "work with https://api.example.com"\n`;
              helpText += `- User says "use this API", "connect to API", "initialize API"\n`;
              helpText += `**Examples:**\n`;
              helpText += `- \`init_api base_url="https://api.example.com"\`\n`;
              helpText += `- \`init_api base_url="http://localhost:3000" name="My Local API"\``;
              break;

            case "manage_session":
              helpText += `- User wants to call APIs: "call the backend", "use the API", "make requests"\n`;
              helpText += `- ALWAYS CHECK SESSIONS FIRST when user wants to use APIs\n`;
              helpText += `**Examples:**\n`;
              helpText += `- \`manage_session action="list"\` (check existing sessions)\n`;
              helpText += `- \`manage_session action="activate" session_id="session_123"\``;
              break;

            case "discover_apis":
              helpText += `- User specifically asks: "find local API files", "scan workspace for specs"\n`;
              helpText += `- RARELY NEEDED - most users provide OpenAPI URLs directly\n`;
              helpText += `**Examples:**\n`;
              helpText += `- \`discover_apis\` (searches current directory)\n`;
              helpText += `- \`discover_apis workspace_path="/path/to/apis"\`\n`;
              helpText += `**💡 Tip:** Usually better to use init_api with base URL instead`;
              break;

            case "list_operations":
              helpText += `- User provides OpenAPI spec URL/path and asks "what can I do"\n`;
              helpText += `- PRIMARY TOOL for exploring known OpenAPI specifications\n`;
              helpText += `**Examples:**\n`;
              helpText += `- \`list_operations docs_path="https://api.example.com/openapi.json"\`\n`;
              helpText += `- \`list_operations docs_path="./petstore.yaml" tag="pets"\``;
              break;

            case "call_api":
              helpText += `- User wants to execute/test a specific API operation\n`;
              helpText += `- User says "call X", "execute Y", "test endpoint Z"\n`;
              helpText += `**Examples:**\n`;
              helpText += `- \`call_api docs_path="api.yaml" operation_id="listUsers"\`\n`;
              helpText += `- \`call_api docs_path="https://api.com/spec.json" operation_id="getUser" parameters='{"id": 123}'\``;
              break;

            case "describe_api":
              helpText += `- User asks "how do I call X", "what parameters does Y need"\n`;
              helpText += `- User needs details before making a call\n`;
              helpText += `**Examples:**\n`;
              helpText += `- \`describe_api docs_path="openapi.yaml"\` (API overview)\n`;
              helpText += `- \`describe_api docs_path="api.yaml" operation_id="createUser"\` (operation details)`;
              break;

            case "manage_auth":
              helpText += `- User mentions API keys, tokens, authentication\n`;
              helpText += `- API calls fail with 401/403 errors\n`;
              helpText += `**Examples:**\n`;
              helpText += `- \`manage_auth docs_path="api.yaml" auth_type="apiKey" config='{"headerName": "X-API-Key", "apiKey": "key123"}'\`\n`;
              helpText += `- \`manage_auth docs_path="api.yaml" auth_type="bearer" config='{"token": "token123"}'\``;
              break;
          }

          return {
            content: [
              {
                type: "text",
                text: `❌ **Invalid parameters for tool '${name}'**\n\nValidation errors: ${issues}${helpText}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `❌ **Error executing tool '${name}'**\n\n${
                error instanceof Error ? error.message : "Unknown error"
              }\n\n**🤖 Smart Tool Selection Guide:**\n\n**When user wants to call APIs/backends (MOST COMMON):**\n- 1st: Use \`manage_session action="list"\` to check existing sessions\n- 2nd: If session exists, use its OpenAPI spec for operations\n- 3rd: If no session, use \`init_api base_url="..."\` to create one\n\n**When user provides new API base URL:**\n- Use \`init_api base_url="https://api.example.com"\` - ONE tool does it all!\n- This auto-discovers OpenAPI spec, sets up session, detects auth\n\n**When user provides OpenAPI spec directly:**\n- Use \`list_operations\` to see what's available\n- Use \`call_api\` to execute operations\n\n**💡 Pro tip:** Always check sessions FIRST when user wants to call APIs!`,
            },
          ],
        };
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      console.log("Shutting down Universal OpenAPI MCP server...");
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error("Universal OpenAPI MCP server started");
    console.error("Ready to discover and work with OpenAPI specifications!");
  }
}

// Create and run the server
const server = new UniversalOpenApiMcp();
server.run().catch((error) => {
  console.error("Failed to start Universal OpenAPI MCP server:", error);
  process.exit(1);
});
