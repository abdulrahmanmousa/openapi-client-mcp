import {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import * as path from "path";
import type { ListOperationsParams } from "../types/index.js";
import { OpenApiDiscovery } from "../utils/discovery.js";
import {
  formatParameters,
  formatQueryParameters,
  formatRequestBody,
  formatUsageExample,
} from "../utils/formatters.js";

export async function listOperations(
  params: ListOperationsParams
): Promise<CallToolResult> {
  try {
    const discovery = new OpenApiDiscovery();

    // Parse API specification
    let apiInfo;
    if (
      params.docs_path.startsWith("http://") ||
      params.docs_path.startsWith("https://")
    ) {
      apiInfo = await discovery.parseOpenApiUrl(params.docs_path);
    } else {
      // Handle relative paths
      const fullPath = path.isAbsolute(params.docs_path)
        ? params.docs_path
        : path.resolve(process.cwd(), params.docs_path);
      apiInfo = await discovery.parseOpenApiFile(fullPath);
    }

    if (!apiInfo) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to parse OpenAPI specification from: ${params.docs_path}\n\nPlease ensure:\n1. The file exists and is accessible\n2. The file contains valid OpenAPI/Swagger specification\n3. The file format is JSON or YAML`,
          } as TextContent,
        ],
      };
    }

    // Filter operations based on provided criteria
    let operations = apiInfo.operations;

    if (params.tag) {
      operations = operations.filter(
        (op) =>
          op.tags &&
          op.tags.some((tag) =>
            tag.toLowerCase().includes(params.tag!.toLowerCase())
          )
      );
    }

    if (params.method) {
      operations = operations.filter(
        (op) => op.method.toLowerCase() === params.method!.toLowerCase()
      );
    }

    if (operations.length === 0) {
      let message = `No operations found`;
      if (params.tag || params.method) {
        message += ` matching criteria`;
        if (params.tag) message += ` (tag: ${params.tag})`;
        if (params.method) message += ` (method: ${params.method})`;
      }
      message += ` in ${apiInfo.title}.`;

      return {
        content: [
          {
            type: "text",
            text: message,
          } as TextContent,
        ],
      };
    }

    // Group operations by tag
    const operationsByTag: Record<string, typeof operations> = {};
    for (const op of operations) {
      const tag = op.tags?.[0] || "General";
      if (!operationsByTag[tag]) {
        operationsByTag[tag] = [];
      }
      operationsByTag[tag].push(op);
    }

    // Format response
    let response = `# ${apiInfo.title} - API Operations\n\n`;
    response += `**Version:** ${apiInfo.version}\n`;
    if (apiInfo.description) {
      response += `**Description:** ${apiInfo.description}\n`;
    }
    response += `**Total Operations:** ${operations.length}\n\n`;

    if (apiInfo.servers && apiInfo.servers.length > 0) {
      response += `**Base URLs:**\n`;
      for (const server of apiInfo.servers) {
        response += `  - ${server}\n`;
      }
      response += `\n`;
    }

    // List operations by tag
    for (const [tag, tagOperations] of Object.entries(operationsByTag)) {
      response += `## ${tag}\n\n`;

      for (const op of tagOperations) {
        response += `### \`${op.operationId}\`\n`;
        response += `**${op.method}** \`${op.path}\`\n\n`;
        if (op.summary) {
          response += `${op.summary}\n\n`;
        }
        if (op.description && op.description !== op.summary) {
          response += `${op.description}\n\n`;
        }
        response += formatParameters(op.parameters ?? []);
        response += formatRequestBody(op.requestBody);
        response += formatUsageExample(op, params.docs_path);
        response += formatQueryParameters(op.parameters ?? []);
        response += `---\n\n`;
      }
    }

    response += `## 🚀 Next Steps\n\n`;
    response += `**Ready to use this API? Here's your action plan:**\n\n`;
    response += `**1. Get operation details (recommended):**\n`;
    response += `\`\`\`\ndescribe_api docs_path="${params.docs_path}" operation_id="OPERATION_ID"\n\`\`\`\n\n`;
    response += `**2. Set up authentication (if required):**\n`;
    response += `\`\`\`\nmanage_auth docs_path="${params.docs_path}" auth_type="apiKey" config='{"headerName": "X-API-Key", "apiKey": "your-key"}'\n\`\`\`\n\n`;
    response += `**3. Execute an operation:**\n`;
    response += `\`\`\`\ncall_api docs_path="${params.docs_path}" operation_id="${operations[0].operationId}"\n\`\`\`\n\n`;
    response += `💡 **Pro tip:** Use \`describe_api\` first to understand parameter requirements before calling operations.`;

    return {
      content: [
        {
          type: "text",
          text: response,
        } as TextContent,
      ],
    };
  } catch (error) {
    console.error("Error listing operations:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error listing operations: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        } as TextContent,
      ],
    };
  }
}
