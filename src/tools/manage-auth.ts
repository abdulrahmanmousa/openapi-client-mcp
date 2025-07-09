import {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import type { ManageAuthParams } from "../types/index.js";
import { ApiHttpClient } from "../utils/http-client.js";

// Global HTTP client instance to persist auth configs
let httpClientInstance: ApiHttpClient | null = null;

function getHttpClient(): ApiHttpClient {
  if (!httpClientInstance) {
    httpClientInstance = new ApiHttpClient();
  }
  return httpClientInstance;
}

export async function manageAuth(
  params: ManageAuthParams
): Promise<CallToolResult> {
  try {
    const httpClient = getHttpClient();

    // Validate auth configuration
    const authConfig = {
      type: params.auth_type,
      config: params.config,
    };

    // Validate required fields based on auth type
    const validationErrors: string[] = [];

    switch (params.auth_type) {
      case "apiKey":
        if (!params.config.headerName)
          validationErrors.push(
            "headerName is required for API key authentication"
          );
        if (!params.config.apiKey)
          validationErrors.push(
            "apiKey is required for API key authentication"
          );
        break;

      case "bearer":
        if (!params.config.token)
          validationErrors.push("token is required for bearer authentication");
        break;

      case "basic":
        if (!params.config.username)
          validationErrors.push(
            "username is required for basic authentication"
          );
        if (!params.config.password)
          validationErrors.push(
            "password is required for basic authentication"
          );
        break;

      case "oauth2":
        if (!params.config.accessToken)
          validationErrors.push(
            "accessToken is required for OAuth2 authentication"
          );
        break;
    }

    if (validationErrors.length > 0) {
      let response = `❌ **Authentication Configuration Error**\n\n`;
      response += `The following required fields are missing:\n`;
      response += validationErrors.map((error) => `- ${error}`).join("\n");
      response += `\n\n**Authentication Type:** ${params.auth_type}\n\n`;

      response += `**Required Configuration:**\n`;
      switch (params.auth_type) {
        case "apiKey":
          response += `- \`headerName\`: The header name for the API key (e.g., "X-API-Key", "Authorization")\n`;
          response += `- \`apiKey\`: Your API key value\n`;
          response += `\n**Example:**\n`;
          response += `\`\`\`\n`;
          response += `manage_auth api_source="${params.api_source}" auth_type="apiKey" config='{\n`;
          response += `  "headerName": "X-API-Key",\n`;
          response += `  "apiKey": "your-api-key-here"\n`;
          response += `}'\n`;
          response += `\`\`\``;
          break;

        case "bearer":
          response += `- \`token\`: Your bearer token\n`;
          response += `\n**Example:**\n`;
          response += `\`\`\`\n`;
          response += `manage_auth api_source="${params.api_source}" auth_type="bearer" config='{\n`;
          response += `  "token": "your-bearer-token-here"\n`;
          response += `}'\n`;
          response += `\`\`\``;
          break;

        case "basic":
          response += `- \`username\`: Your username\n`;
          response += `- \`password\`: Your password\n`;
          response += `\n**Example:**\n`;
          response += `\`\`\`\n`;
          response += `manage_auth api_source="${params.api_source}" auth_type="basic" config='{\n`;
          response += `  "username": "your-username",\n`;
          response += `  "password": "your-password"\n`;
          response += `}'\n`;
          response += `\`\`\``;
          break;

        case "oauth2":
          response += `- \`accessToken\`: Your OAuth2 access token\n`;
          response += `\n**Example:**\n`;
          response += `\`\`\`\n`;
          response += `manage_auth api_source="${params.api_source}" auth_type="oauth2" config='{\n`;
          response += `  "accessToken": "your-oauth2-token-here"\n`;
          response += `}'\n`;
          response += `\`\`\``;
          break;
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

    // Store the authentication configuration
    httpClient.setAuthConfig(params.api_source, authConfig);

    let response = `✅ **Authentication Configuration Saved**\n\n`;
    response += `**API Source:** ${params.api_source}\n`;
    response += `**Authentication Type:** ${params.auth_type}\n\n`;

    switch (params.auth_type) {
      case "apiKey":
        response += `**Configuration:**\n`;
        response += `- Header Name: \`${params.config.headerName}\`\n`;
        response += `- API Key: \`${params.config.apiKey.substring(
          0,
          8
        )}...\` (masked)\n`;
        break;

      case "bearer":
        response += `**Configuration:**\n`;
        response += `- Bearer Token: \`${params.config.token.substring(
          0,
          8
        )}...\` (masked)\n`;
        break;

      case "basic":
        response += `**Configuration:**\n`;
        response += `- Username: \`${params.config.username}\`\n`;
        response += `- Password: \`***\` (masked)\n`;
        break;

      case "oauth2":
        response += `**Configuration:**\n`;
        response += `- Access Token: \`${params.config.accessToken.substring(
          0,
          8
        )}...\` (masked)\n`;
        break;
    }

    response += `\n**Status:** Authentication is now configured for this API source.\n`;
    response += `All subsequent API calls using \`call_api\` with this API source will automatically use the configured authentication.\n\n`;

    response += `**Next Steps:**\n`;
    response += `1. Test the authentication by making an API call:\n`;
    response += `   \`call_api api_source="${params.api_source}" operation_id="OPERATION_ID"\`\n`;
    response += `2. Use \`list_operations\` to see available operations for this API\n`;
    response += `3. If you need to update the authentication, run \`manage_auth\` again with new credentials\n\n`;

    response += `**Security Note:** Authentication credentials are stored in memory only and will be lost when the MCP server restarts.`;

    return {
      content: [
        {
          type: "text",
          text: response,
        } as TextContent,
      ],
    };
  } catch (error) {
    console.error("Error managing authentication:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error managing authentication: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        } as TextContent,
      ],
    };
  }
}

// Export the HTTP client getter for use in other tools
export { getHttpClient };
