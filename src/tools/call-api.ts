import {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import * as path from "path";
import type { AuthConfig, CallApiParams } from "../types/index.js";
import { OpenApiDiscovery } from "../utils/discovery.js";
import { formatSchema } from "../utils/formatters.js";
import { getHttpClient } from "./manage-auth.js";

export async function callApi(params: CallApiParams): Promise<CallToolResult> {
  try {
    const discovery = new OpenApiDiscovery();
    const httpClient = getHttpClient();

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
            text: `❌ **Failed to parse OpenAPI specification from: ${params.docs_path}**\n\n**Common issues:**\n1. File doesn't exist or path is incorrect\n2. File doesn't contain valid OpenAPI/Swagger specification\n3. File format is not JSON or YAML\n4. Network issues (for remote URLs)\n\n**Solutions:**\n1. Run \`discover_apis\` first to find available APIs\n2. Use the exact \`docs_path\` path from discover_apis results\n3. Verify file exists and is accessible\n4. Check file contains proper OpenAPI schema`,
          } as TextContent,
        ],
      };
    }

    // Find the requested operation
    const operation = apiInfo.operations.find(
      (op) => op.operationId === params.operation_id
    );
    if (!operation) {
      const availableOps = apiInfo.operations
        .map((op) => op.operationId)
        .slice(0, 10)
        .join(", ");
      const moreOpsText =
        apiInfo.operations.length > 10
          ? `\n\n**Note:** Showing first 10 of ${apiInfo.operations.length} available operations. Use \`list_operations docs_path="${params.docs_path}"\` to see all operations.`
          : "";

      return {
        content: [
          {
            type: "text",
            text: `❌ **Operation '${params.operation_id}' not found in API specification**\n\n**Available operations:** ${availableOps}${moreOpsText}\n\n**Next steps:**\n1. Use \`list_operations docs_path="${params.docs_path}"\` to see all operations with descriptions\n2. Use exact operation ID (case-sensitive)\n3. Check spelling and formatting of operation ID`,
          } as TextContent,
        ],
      };
    }

    // Validate required parameters
    const missingParams: string[] = [];
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (
          param.required &&
          (!params.parameters || params.parameters[param.name] === undefined)
        ) {
          missingParams.push(`${param.name} (${param.in})`);
        }
      }
    }

    if (
      operation.requestBody?.required &&
      (!params.parameters || !params.parameters.body)
    ) {
      missingParams.push("body (request body)");
    }

    if (missingParams.length > 0) {
      let response = `Missing required parameters for operation '${params.operation_id}':\n`;
      response += missingParams.map((p) => `  - ${p}`).join("\n");
      response += `\n\nOperation details:\n`;
      response += `**${operation.method}** ${operation.path}\n`;
      if (operation.summary) {
        response += `${operation.summary}\n`;
      }
      if (operation.description) {
        response += `\n${operation.description}\n`;
      }

      if (operation.parameters && operation.parameters.length > 0) {
        response += `\n**Parameters:**\n`;
        for (const param of operation.parameters) {
          response += `  - \`${param.name}\` (${param.in}) - ${
            param.required ? "required" : "optional"
          }`;
          if (param.description) {
            response += ` - ${param.description}`;
          }
          response += `\n`;
        }
      }

      if (operation.requestBody) {
        response += `\n**Request Body:** ${
          operation.requestBody.required ? "required" : "optional"
        }\n`;
        if (operation.requestBody.description) {
          response += `${operation.requestBody.description}\n`;
        }
        response += `Content-Type: ${operation.requestBody.contentType}\n`;
      }

      return {
        content: [
          {
            type: "text",
            text: response,
          } as TextContent,
        ],
      };
    }

    // Determine base URL - prioritize provided base_url, then use OpenAPI servers
    let baseUrl = params.base_url || apiInfo.servers?.[0];
    if (!baseUrl) {
      return {
        content: [
          {
            type: "text",
            text: `No server URL found. Please either:\n1. Ensure the OpenAPI specification includes server information, or\n2. Provide a base_url parameter in your API call`,
          } as TextContent,
        ],
      };
    }

    // Setup authentication - use managed auth or provided auth
    let authConfig: AuthConfig | undefined = httpClient.getAuthConfig(
      params.docs_path
    );

    if (params.auth_config && !authConfig) {
      // Use provided auth config if no managed auth is set
      authConfig = {
        type: params.auth_config.type as AuthConfig["type"],
        config: params.auth_config,
      };
    }

    // Make the API call
    console.log(
      `Calling ${operation.method} ${operation.path} with parameters:`,
      params.parameters
    );
    const result = await httpClient.callOperation(
      baseUrl,
      operation,
      params.parameters,
      authConfig
    );

    // Format response
    let response = `## API Call Result\n\n`;
    response += `**Operation:** ${params.operation_id}\n`;
    response += `**Method:** ${operation.method}\n`;
    response += `**Path:** ${operation.path}\n`;
    response += `**Status:** ${result.success ? "✅ Success" : "❌ Failed"}\n`;
    response += `**Status Code:** ${result.statusCode}\n`;
    response += `**Execution Time:** ${result.executionTime}ms\n\n`;

    if (result.error) {
      response += `**Error:** ${result.error}\n\n`;
    }

    if (result.headers) {
      response += `**Response Headers:**\n`;
      for (const [key, value] of Object.entries(result.headers)) {
        response += `  ${key}: ${value}\n`;
      }
      response += `\n`;
    }

    if (result.data !== undefined) {
      response += `**Response Data:**\n`;
      if (typeof result.data === "string") {
        response += `\`\`\`\n${result.data}\n\`\`\`\n`;
      } else {
        response += `\`\`\`json\n${formatSchema(result.data)}\n\`\`\`\n`;
      }
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
    console.error("Error calling API:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error calling API: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        } as TextContent,
      ],
    };
  }
}
