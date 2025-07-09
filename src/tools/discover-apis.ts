import {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import type { DiscoverApisParams } from "../types/index.js";
import { OpenApiDiscovery } from "../utils/discovery.js";

export async function discoverApis(
  params: DiscoverApisParams
): Promise<CallToolResult> {
  try {
    const discovery = new OpenApiDiscovery();
    const workspacePath = params.workspace_path || process.cwd();

    console.log(`Discovering OpenAPI files in: ${workspacePath}`);
    const apis = await discovery.discoverApis(
      workspacePath,
      params.recursive,
      params.include_remote
    );

    if (apis.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No OpenAPI specifications found in ${workspacePath}.\n\nTo get started:\n1. Make sure you have OpenAPI/Swagger files with extensions .yaml, .yml, or .json\n2. Ensure the files contain valid OpenAPI specifications\n3. Try placing a file named 'openapi.yaml' or 'swagger.json' in your project root`,
          } as TextContent,
        ],
      };
    }

    let response = `## Discovered ${apis.length} OpenAPI specification${
      apis.length > 1 ? "s" : ""
    }\n\n`;

    for (const api of apis) {
      response += `### ${api.title} (v${api.version})\n`;
      response += `**Path:** \`${api.path}\`\n`;

      if (api.description) {
        response += `**Description:** ${api.description}\n`;
      }

      if (api.servers && api.servers.length > 0) {
        response += `**Servers:**\n`;
        for (const server of api.servers) {
          response += `  - ${server}\n`;
        }
      }

      response += `**Operations:** ${api.operations.length} available\n`;

      if (api.operations.length > 0) {
        response += `**Available Operations:**\n`;
        const operationsByTag: Record<string, typeof api.operations> = {};

        for (const op of api.operations) {
          const tag = op.tags?.[0] || "General";
          if (!operationsByTag[tag]) {
            operationsByTag[tag] = [];
          }
          operationsByTag[tag].push(op);
        }

        for (const [tag, operations] of Object.entries(operationsByTag)) {
          response += `  **${tag}:**\n`;
          for (const op of operations.slice(0, 5)) {
            // Limit to first 5 per tag
            response += `    - \`${op.operationId}\` (${op.method} ${op.path})`;
            if (op.summary) {
              response += ` - ${op.summary}`;
            }
            response += `\n`;
          }
          if (operations.length > 5) {
            response += `    ... and ${operations.length - 5} more\n`;
          }
        }
      }

      response += `\n---\n\n`;
    }

    response += `## Next Steps\n\n`;
    response += `You can now use these APIs with the following tools:\n\n`;
    response += `1. **List Operations**: Use \`list_operations\` to see all available operations for an API\n`;
    response += `2. **Describe API**: Use \`describe_api\` to get detailed information about specific operations\n`;
    response += `3. **Call API**: Use \`call_api\` to execute API operations\n`;
    response += `4. **Manage Auth**: Use \`manage_auth\` to configure authentication for APIs that require it\n\n`;
    response += `Example: To list all operations for ${apis[0].title}, use:\n`;
    response += `\`\`\`\nlist_operations api_source="${apis[0].path}"\n\`\`\``;

    return {
      content: [
        {
          type: "text",
          text: response,
        } as TextContent,
      ],
    };
  } catch (error) {
    console.error("Error discovering APIs:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error discovering OpenAPI specifications: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        } as TextContent,
      ],
    };
  }
}
