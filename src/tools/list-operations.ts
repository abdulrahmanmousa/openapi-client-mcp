import {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import * as path from "path";
import type { ListOperationsParams } from "../types/index.js";
import { OpenApiDiscovery } from "../utils/discovery.js";

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

        // Parameters
        if (op.parameters && op.parameters.length > 0) {
          response += `**Parameters:**\n`;
          for (const param of op.parameters) {
            response += `  - \`${param.name}\` (${param.in}) - ${
              param.required ? "**required**" : "optional"
            }`;
            if (param.description) {
              response += ` - ${param.description}`;
            }
            response += `\n`;
          }
          response += `\n`;
        }

        // Request body
        if (op.requestBody) {
          response += `**Request Body:** ${
            op.requestBody.required ? "**required**" : "optional"
          }\n`;
          if (op.requestBody.description) {
            response += `  ${op.requestBody.description}\n`;
          }
          response += `  Content-Type: \`${op.requestBody.contentType}\`\n\n`;
        }

        // Responses
        if (op.responses && Object.keys(op.responses).length > 0) {
          response += `**Responses:**\n`;
          for (const [status, resp] of Object.entries(op.responses)) {
            response += `  - **${status}**: ${resp.description}`;
            if (resp.contentType) {
              response += ` (\`${resp.contentType}\`)`;
            }
            response += `\n`;
          }
          response += `\n`;
        }

        response += `**Usage Example:**\n`;
        response += `\`\`\`\n`;
        response += `call_api docs_path="${params.docs_path}" operation_id="${op.operationId}"`;

        // Add example parameters
        if (op.parameters && op.parameters.length > 0) {
          response += ` parameters='{\n`;
          const exampleParams: string[] = [];
          for (const param of op.parameters.slice(0, 3)) {
            // Show first 3 params
            let exampleValue = "value";
            if (param.schema) {
              if (param.schema.type === "integer") exampleValue = "123";
              else if (param.schema.type === "boolean") exampleValue = "true";
              else if (param.schema.type === "array")
                exampleValue = '["item1", "item2"]';
              else if (param.schema.enum)
                exampleValue = `"${param.schema.enum[0]}"`;
              else exampleValue = `"example_${param.name}"`;
            }
            exampleParams.push(`  "${param.name}": ${exampleValue}`);
          }
          response += exampleParams.join(",\n");
          if (op.parameters.length > 3) {
            response += `,\n  // ... other parameters`;
          }
          response += `\n}'`;
        }

        response += `\n\`\`\`\n\n`;
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
