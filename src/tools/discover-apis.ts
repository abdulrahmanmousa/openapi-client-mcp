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
            text: `❌ **No OpenAPI specifications found in ${workspacePath}**\n\n**What to check:**\n1. Ensure you have OpenAPI/Swagger files with extensions .yaml, .yml, or .json\n2. Verify the files contain valid OpenAPI specifications (version 2.0 or 3.x)\n3. Check file permissions and accessibility\n\n**Common filenames to look for:**\n- openapi.yaml, openapi.json\n- swagger.yaml, swagger.json\n- api-spec.yaml, api-docs.json\n- Any file with OpenAPI schema inside\n\n**Next steps:**\n1. Try placing an OpenAPI file in your project root\n2. Use recursive=true to search subdirectories\n3. Check if you have remote APIs with include_remote=true`,
          } as TextContent,
        ],
      };
    }

    let response = `✅ **Discovered ${apis.length} OpenAPI specification${
      apis.length > 1 ? "s" : ""
    }**\n\n`;

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

    response += `## 🚀 Quick Start Guide\n\n`;
    response += `Now that APIs are discovered, follow these steps:\n\n`;
    response += `**Step 1 - Explore Operations:**\n`;
    response += `\`\`\`\nlist_operations api_source="${apis[0].path}"\n\`\`\`\n\n`;
    response += `**Step 2 - Get Operation Details:**\n`;
    response += `\`\`\`\ndescribe_api api_source="${apis[0].path}" operation_id="OPERATION_ID"\n\`\`\`\n\n`;
    response += `**Step 3 - Configure Authentication (if needed):**\n`;
    response += `\`\`\`\nmanage_auth api_source="${apis[0].path}" auth_type="apiKey" config='{"headerName": "X-API-Key", "apiKey": "your-key"}'\n\`\`\`\n\n`;
    response += `**Step 4 - Make API Calls:**\n`;
    response += `\`\`\`\ncall_api api_source="${apis[0].path}" operation_id="OPERATION_ID" parameters='{"param": "value"}'\n\`\`\`\n\n`;
    response += `💡 **Tip:** Use the exact \`api_source\` paths shown above in subsequent tool calls.`;

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
