#!/usr/bin/env node

/**
 * Universal OpenAPI MCP Server
 * 
 * TOOL SELECTION DECISION TREE:
 * 
 * 1. User provides specific OpenAPI file/URL directly:
 *    → Skip discover_apis, go straight to:
 *    → list_operations (to see what's available)
 *    → describe_api (for parameter details)
 *    → call_api (to execute operations)
 * 
 * 2. User asks to find/explore APIs (no specific file):
 *    → discover_apis (find available specs)
 *    → Then follow path 1 above
 * 
 * 3. User mentions authentication/credentials:
 *    → manage_auth (configure auth first)
 *    → Then proceed with other tools
 * 
 * 4. User wants to execute/test specific operation:
 *    → call_api (if they know operation_id)
 *    → OR list_operations first (to find operation_id)
 * 
 * KEYWORDS THAT INDICATE TOOL CHOICE:
 * - "find APIs", "discover", "what's available" → discover_apis
 * - "what can I do", "show operations", "endpoints" → list_operations  
 * - "how do I call", "parameters needed", "details" → describe_api
 * - "API key", "token", "auth", "credentials" → manage_auth
 * - "call", "execute", "test", "run operation" → call_api
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
import { listOperations } from "./tools/list-operations.js";
import { manageAuth } from "./tools/manage-auth.js";
import {
  CallApiSchema,
  DescribeApiSchema,
  DiscoverApisSchema,
  ListOperationsSchema,
  ManageAuthSchema,
  type CallApiParams,
  type DescribeApiParams,
  type DiscoverApisParams,
  type ListOperationsParams,
  type ManageAuthParams,
} from "./types/index.js";

class UniversalOpenApiMcp {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "universal-openapi-mcp",
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
            name: "discover_apis",
            description:
              "🔍 DISCOVERY TOOL: Find OpenAPI specs in workspace. USE WHEN: User asks to 'find APIs', 'discover specs', or wants to explore available APIs without providing a specific file/URL. Searches directories for .yaml/.yml/.json files containing OpenAPI specifications. This is STEP 1 when no specific API is mentioned.",
            inputSchema: DiscoverApisSchema.shape,
          },
          {
            name: "list_operations",
            description:
              "📋 EXPLORATION TOOL: Show all operations from a known OpenAPI spec. USE WHEN: User provides an OpenAPI file/URL and wants to see what operations are available, OR after discovery to explore a specific API. Shows operation IDs, methods, paths by category. CHOOSE THIS when user says 'what can I do with this API', 'show me operations', or provides API spec path asking for capabilities.",
            inputSchema: ListOperationsSchema.shape,
          },
          {
            name: "describe_api",
            description:
              "📖 DOCUMENTATION TOOL: Get detailed info about API or specific operation. USE WHEN: User needs parameter details, request/response schemas, or examples before making a call. Without operation_id: gives API overview. With operation_id: shows detailed parameter requirements. CHOOSE THIS when user asks 'how do I call X', 'what parameters does Y need', or 'show me details about operation Z'.",
            inputSchema: DescribeApiSchema.shape,
          },
          {
            name: "manage_auth",
            description:
              "🔐 AUTHENTICATION TOOL: Configure API authentication. USE WHEN: User mentions API keys, tokens, authentication, or API calls fail with auth errors (401/403). Set up once per API source, persists for subsequent calls. CHOOSE THIS when user provides credentials or mentions 'auth', 'API key', 'token', 'login required'.",
            inputSchema: ManageAuthSchema.shape,
          },
          {
            name: "call_api",
            description:
              "🚀 EXECUTION TOOL: Make actual API requests. USE WHEN: User wants to execute a specific API operation, test an endpoint, or get real data from an API. Requires api_source and operation_id. CHOOSE THIS when user says 'call X', 'execute Y', 'test endpoint Z', 'get data from API', or provides specific operation to run. This is the ACTION tool.",
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
            case "discover_apis":
              helpText += `- User asks: "find APIs", "what APIs are available", "discover specs"\n`;
              helpText += `- User wants to explore without a specific file/URL\n`;
              helpText += `**Examples:**\n`;
              helpText += `- \`discover_apis\` (searches current directory)\n`;
              helpText += `- \`discover_apis workspace_path="/path/to/apis"\``;
              break;

            case "list_operations":
              helpText += `- User provides OpenAPI file/URL and asks "what can I do"\n`;
              helpText += `- User wants to see available operations/endpoints\n`;
              helpText += `**Examples:**\n`;
              helpText += `- \`list_operations api_source="https://api.example.com/openapi.json"\`\n`;
              helpText += `- \`list_operations api_source="./petstore.yaml" tag="pets"\``;
              break;

            case "call_api":
              helpText += `- User wants to execute/test a specific API operation\n`;
              helpText += `- User says "call X", "execute Y", "test endpoint Z"\n`;
              helpText += `**Examples:**\n`;
              helpText += `- \`call_api api_source="api.yaml" operation_id="listUsers"\`\n`;
              helpText += `- \`call_api api_source="https://api.com/spec.json" operation_id="getUser" parameters='{"id": 123}'\``;
              break;

            case "describe_api":
              helpText += `- User asks "how do I call X", "what parameters does Y need"\n`;
              helpText += `- User needs details before making a call\n`;
              helpText += `**Examples:**\n`;
              helpText += `- \`describe_api api_source="openapi.yaml"\` (API overview)\n`;
              helpText += `- \`describe_api api_source="api.yaml" operation_id="createUser"\` (operation details)`;
              break;

            case "manage_auth":
              helpText += `- User mentions API keys, tokens, authentication\n`;
              helpText += `- API calls fail with 401/403 errors\n`;
              helpText += `**Examples:**\n`;
              helpText += `- \`manage_auth api_source="api.yaml" auth_type="apiKey" config='{"headerName": "X-API-Key", "apiKey": "key123"}'\`\n`;
              helpText += `- \`manage_auth api_source="api.yaml" auth_type="bearer" config='{"token": "token123"}'\``;
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
              }\n\n**🤖 Tool Selection Guide:**\n\n**When user provides OpenAPI file/URL directly:**\n- Use \`list_operations\` to see what's available\n- Use \`describe_api\` for parameter details\n- Use \`call_api\` to execute operations\n- Skip \`discover_apis\` - not needed!\n\n**When user asks to explore/find APIs:**\n- Start with \`discover_apis\` to find specifications\n- Then follow the workflow above\n\n**When user mentions auth/credentials:**\n- Use \`manage_auth\` first, then other tools\n\n**When user wants to execute/test:**\n- Use \`call_api\` (ensure you have api_source + operation_id)`,
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
