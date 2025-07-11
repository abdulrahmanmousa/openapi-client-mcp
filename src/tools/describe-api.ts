import {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import * as path from "path";
import type { DescribeApiParams } from "../types/index.js";
import { OpenApiDiscovery } from "../utils/discovery.js";
import { formatOperationDetails } from "../utils/formatters.js";

export async function describeApi(
  params: DescribeApiParams
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

    // If specific operation is requested
    if (params.operation_id) {
      const operation = apiInfo.operations.find(
        (op) => op.operationId === params.operation_id
      );

      if (!operation) {
        const availableOps = apiInfo.operations
          .map((op) => op.operationId)
          .join(", ");
        return {
          content: [
            {
              type: "text",
              text: `Operation '${params.operation_id}' not found in API specification.\n\nAvailable operations: ${availableOps}`,
            } as TextContent,
          ],
        };
      }

      // Detailed operation description
      let response = formatOperationDetails(operation, params.docs_path);
      return {
        content: [
          {
            type: "text",
            text: response,
          } as TextContent,
        ],
      };
    }

    // General API description
    let response = `# ${apiInfo.title}\n\n`;
    response += `**Version:** ${apiInfo.version}\n`;
    response += `**Source:** ${params.docs_path}\n\n`;

    if (apiInfo.description) {
      response += `## Description\n${apiInfo.description}\n\n`;
    }

    if (apiInfo.servers && apiInfo.servers.length > 0) {
      response += `## Base URLs\n`;
      for (const server of apiInfo.servers) {
        response += `- ${server}\n`;
      }
      response += `\n`;
    }

    response += `## Overview\n`;
    response += `- **Total Operations:** ${apiInfo.operations.length}\n`;

    // Group by HTTP methods
    const methodCounts: Record<string, number> = {};
    for (const op of apiInfo.operations) {
      methodCounts[op.method] = (methodCounts[op.method] || 0) + 1;
    }

    response += `- **HTTP Methods:** `;
    response += Object.entries(methodCounts)
      .map(([method, count]) => `${method} (${count})`)
      .join(", ");
    response += `\n`;

    // Group by tags
    const tagCounts: Record<string, number> = {};
    for (const op of apiInfo.operations) {
      const tag = op.tags?.[0] || "General";
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    if (Object.keys(tagCounts).length > 1) {
      response += `- **Categories:** `;
      response += Object.entries(tagCounts)
        .map(([tag, count]) => `${tag} (${count})`)
        .join(", ");
      response += `\n`;
    }
    response += `\n`;

    // Quick operation list
    response += `## Available Operations\n\n`;

    for (const [tag, count] of Object.entries(tagCounts)) {
      response += `### ${tag} (${count} operations)\n`;
      const tagOps = apiInfo.operations.filter(
        (op) => (op.tags?.[0] || "General") === tag
      );

      for (const op of tagOps.slice(0, 10)) {
        // Show first 10 per tag
        response += `- **\`${op.operationId}\`** - ${op.method} ${op.path}`;
        if (op.summary) {
          response += ` - ${op.summary}`;
        }
        response += `\n`;
      }

      if (tagOps.length > 10) {
        response += `- ... and ${tagOps.length - 10} more operations\n`;
      }
      response += `\n`;
    }

    response += `## Next Steps\n\n`;
    response += `1. **List all operations**: \`list_operations docs_path="${params.docs_path}"\`\n`;
    response += `2. **Describe specific operation**: \`describe_api docs_path="${params.docs_path}" operation_id="OPERATION_ID"\`\n`;
    response += `3. **Call an operation**: \`call_api docs_path="${params.docs_path}" operation_id="OPERATION_ID"\`\n`;

    if (apiInfo.operations.length > 0) {
      response += `\n**Quick start** - Try calling the first operation:\n`;
      response += `\`\`\`\n`;
      response += `call_api docs_path="${params.docs_path}" operation_id="${apiInfo.operations[0].operationId}"\n`;
      response += `\`\`\``;
    }

    return {
      content: [
        {
          type: "text",
          text: response,
        } as TextContent,
      ],
    };
  } catch (error) {
    console.error("Error describing API:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error describing API: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        } as TextContent,
      ],
    };
  }
}
