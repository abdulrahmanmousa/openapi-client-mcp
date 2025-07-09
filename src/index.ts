#!/usr/bin/env node

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
              "Discover OpenAPI specifications in the workspace or a specific directory. This tool automatically finds and analyzes OpenAPI/Swagger files.",
            inputSchema: DiscoverApisSchema.shape,
          },
          {
            name: "call_api",
            description:
              "Call an API operation from a discovered OpenAPI specification. This is the main tool for executing API requests.",
            inputSchema: CallApiSchema.shape,
          },
          {
            name: "list_operations",
            description:
              "List all available operations from an OpenAPI specification with filtering options by tag or HTTP method.",
            inputSchema: ListOperationsSchema.shape,
          },
          {
            name: "describe_api",
            description:
              "Get detailed information about an OpenAPI specification or a specific operation including parameters, responses, and usage examples.",
            inputSchema: DescribeApiSchema.shape,
          },
          {
            name: "manage_auth",
            description:
              "Configure authentication for API calls. Supports API key, Bearer token, Basic auth, and OAuth2 authentication methods.",
            inputSchema: ManageAuthSchema.shape,
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

          return {
            content: [
              {
                type: "text",
                text: `Invalid parameters for tool '${name}': ${issues}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Error executing tool '${name}': ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
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
