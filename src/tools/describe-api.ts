import {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import * as path from "path";
import type { DescribeApiParams } from "../types/index.js";
import { OpenApiDiscovery } from "../utils/discovery.js";

export async function describeApi(
  params: DescribeApiParams
): Promise<CallToolResult> {
  try {
    const discovery = new OpenApiDiscovery();

    // Parse API specification
    let apiInfo;
    if (
      params.api_source.startsWith("http://") ||
      params.api_source.startsWith("https://")
    ) {
      apiInfo = await discovery.parseOpenApiUrl(params.api_source);
    } else {
      // Handle relative paths
      const fullPath = path.isAbsolute(params.api_source)
        ? params.api_source
        : path.resolve(process.cwd(), params.api_source);
      apiInfo = await discovery.parseOpenApiFile(fullPath);
    }

    if (!apiInfo) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to parse OpenAPI specification from: ${params.api_source}\n\nPlease ensure:\n1. The file exists and is accessible\n2. The file contains valid OpenAPI/Swagger specification\n3. The file format is JSON or YAML`,
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
      let response = `# ${operation.operationId}\n\n`;
      response += `**${operation.method}** \`${operation.path}\`\n\n`;

      if (operation.summary) {
        response += `## Summary\n${operation.summary}\n\n`;
      }

      if (
        operation.description &&
        operation.description !== operation.summary
      ) {
        response += `## Description\n${operation.description}\n\n`;
      }

      if (operation.tags && operation.tags.length > 0) {
        response += `**Tags:** ${operation.tags.join(", ")}\n\n`;
      }

      // Parameters
      if (operation.parameters && operation.parameters.length > 0) {
        response += `## Parameters\n\n`;

        const paramsByLocation: Record<string, typeof operation.parameters> =
          {};
        for (const param of operation.parameters) {
          if (!paramsByLocation[param.in]) {
            paramsByLocation[param.in] = [];
          }
          paramsByLocation[param.in].push(param);
        }

        for (const [location, params] of Object.entries(paramsByLocation)) {
          response += `### ${
            location.charAt(0).toUpperCase() + location.slice(1)
          } Parameters\n\n`;

          for (const param of params) {
            response += `#### \`${param.name}\`\n`;
            response += `- **Required:** ${param.required ? "Yes" : "No"}\n`;

            if (param.schema) {
              response += `- **Type:** ${param.schema.type || "any"}\n`;
              if (param.schema.format) {
                response += `- **Format:** ${param.schema.format}\n`;
              }
              if (param.schema.enum) {
                response += `- **Allowed Values:** ${param.schema.enum.join(
                  ", "
                )}\n`;
              }
              if (param.schema.minimum !== undefined) {
                response += `- **Minimum:** ${param.schema.minimum}\n`;
              }
              if (param.schema.maximum !== undefined) {
                response += `- **Maximum:** ${param.schema.maximum}\n`;
              }
              if (param.schema.pattern) {
                response += `- **Pattern:** \`${param.schema.pattern}\`\n`;
              }
              if (param.schema.example !== undefined) {
                response += `- **Example:** \`${param.schema.example}\`\n`;
              }
            }

            if (param.description) {
              response += `- **Description:** ${param.description}\n`;
            }
            response += `\n`;
          }
        }
      }

      // Request Body
      if (operation.requestBody) {
        response += `## Request Body\n\n`;
        response += `- **Required:** ${
          operation.requestBody.required ? "Yes" : "No"
        }\n`;
        response += `- **Content-Type:** \`${operation.requestBody.contentType}\`\n`;

        if (operation.requestBody.description) {
          response += `- **Description:** ${operation.requestBody.description}\n`;
        }

        if (operation.requestBody.schema) {
          response += `\n**Schema:**\n`;
          response += `\`\`\`json\n${JSON.stringify(
            operation.requestBody.schema,
            null,
            2
          )}\n\`\`\`\n`;
        }
        response += `\n`;
      }

      // Responses
      if (operation.responses && Object.keys(operation.responses).length > 0) {
        response += `## Responses\n\n`;

        for (const [status, resp] of Object.entries(operation.responses)) {
          response += `### ${status}\n`;
          response += `${resp.description}\n`;

          if (resp.contentType) {
            response += `**Content-Type:** \`${resp.contentType}\`\n`;
          }

          if (resp.schema) {
            response += `\n**Schema:**\n`;
            response += `\`\`\`json\n${JSON.stringify(
              resp.schema,
              null,
              2
            )}\n\`\`\`\n`;
          }
          response += `\n`;
        }
      }

      // Usage example
      response += `## Usage Example\n\n`;
      response += `\`\`\`\n`;
      response += `call_api api_source="${params.api_source}" operation_id="${operation.operationId}"`;

      if (operation.parameters && operation.parameters.length > 0) {
        response += ` parameters='{\n`;
        const exampleParams: string[] = [];

        for (const param of operation.parameters) {
          if (param.required) {
            let exampleValue = "value";
            if (param.schema) {
              if (param.schema.type === "integer") exampleValue = "123";
              else if (param.schema.type === "boolean") exampleValue = "true";
              else if (param.schema.type === "array")
                exampleValue = '["item1", "item2"]';
              else if (param.schema.enum)
                exampleValue = `"${param.schema.enum[0]}"`;
              else if (param.schema.example)
                exampleValue = JSON.stringify(param.schema.example);
              else exampleValue = `"example_${param.name}"`;
            }
            exampleParams.push(
              `  "${param.name}": ${exampleValue}  // ${
                param.description || "Required parameter"
              }`
            );
          }
        }

        response += exampleParams.join(",\n");
        response += `\n}'`;
      }

      response += `\n\`\`\`\n\n`;

      response += `## 🚀 Ready to Call This Operation?\n\n`;
      response += `**Step 1 - Set up authentication (if needed):**\n`;
      response += `\`\`\`\nmanage_auth api_source="${params.api_source}" auth_type="apiKey" config='{"headerName": "X-API-Key", "apiKey": "your-key"}'\n\`\`\`\n\n`;
      response += `**Step 2 - Execute the operation:**\n`;
      response += `Copy the usage example above and customize the parameters for your needs.\n\n`;
      response += `**Step 3 - Explore related operations:**\n`;
      response += `\`\`\`\nlist_operations api_source="${params.api_source}"`;
      if (operation.tags && operation.tags.length > 0) {
        response += ` tag="${operation.tags[0]}"`;
      }
      response += `\n\`\`\``;

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
    response += `**Source:** ${params.api_source}\n\n`;

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
    response += `1. **List all operations**: \`list_operations api_source="${params.api_source}"\`\n`;
    response += `2. **Describe specific operation**: \`describe_api api_source="${params.api_source}" operation_id="OPERATION_ID"\`\n`;
    response += `3. **Call an operation**: \`call_api api_source="${params.api_source}" operation_id="OPERATION_ID"\`\n`;

    if (apiInfo.operations.length > 0) {
      response += `\n**Quick start** - Try calling the first operation:\n`;
      response += `\`\`\`\n`;
      response += `call_api api_source="${params.api_source}" operation_id="${apiInfo.operations[0].operationId}"\n`;
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
