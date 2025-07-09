import {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import type { InitApiParams } from "../types/index.js";
import { sessionManager } from "../utils/session-manager.js";

export async function initApi(params: InitApiParams): Promise<CallToolResult> {
  try {
    let response = `🚀 **Initializing API Session**\n\n`;

    // Step 1: Check if session exists
    let session = sessionManager.getSessionByBaseUrl(params.base_url);

    if (session) {
      response += `✅ **Found existing session for this API**\n`;
      response += `**Session:** ${session.name}\n`;
      response += `**Base URL:** ${session.baseUrl}\n`;
      response += `**Last used:** ${new Date(
        session.lastUsed
      ).toLocaleString()}\n\n`;

      // Set as active session
      sessionManager.setActiveSession(session.id);

      response += `## 🎉 Session Ready!\n\n`;
      response += `**Active Session:** ${session.name} (${session.id})\n`;
      response += `**Base URL:** ${session.baseUrl}\n`;

      if (session.openApiPath) {
        response += `**OpenAPI Spec:** ${session.openApiPath}\n`;
        response += `**✅ Ready to call APIs!**\n\n`;

        response += `## 🚀 What's Next?\n\n`;
        response += `**1. Explore available operations:**\n`;
        response += `\`\`\`\nlist_operations docs_path="${session.openApiPath}"\n\`\`\`\n\n`;
        response += `**2. Get details about a specific operation:**\n`;
        response += `\`\`\`\ndescribe_api docs_path="${session.openApiPath}" operation_id="OPERATION_ID"\n\`\`\`\n\n`;
        response += `**3. Call an operation:**\n`;
        response += `\`\`\`\ncall_api docs_path="${session.openApiPath}" operation_id="OPERATION_ID"\n\`\`\``;
      } else {
        response += `**OpenAPI Spec:** Will be discovered when needed\n\n`;
        response += `## 🚀 What's Next?\n\n`;
        response += `**1. Discover and explore operations:**\n`;
        response += `\`\`\`\nlist_operations docs_path="${session.baseUrl}"\n\`\`\`\n`;
        response += `(This will auto-discover the OpenAPI spec and show operations)\n\n`;
      }

      return {
        content: [{ type: "text", text: response } as TextContent],
      };
    }

    // Step 2: Create new session
    response += `� **Creating new API session**\n`;
    session = sessionManager.createSession(params.base_url, params.name);
    response += `**Session ID:** ${session.id}\n`;
    response += `**Name:** ${session.name}\n`;
    response += `**Base URL:** ${session.baseUrl}\n\n`;

    // Step 3: Handle OpenAPI path if provided
    let openApiPath: string | undefined;

    if (params.openapi_path) {
      openApiPath = params.openapi_path.startsWith("http")
        ? params.openapi_path
        : new URL(params.openapi_path, params.base_url).toString();

      response += `📄 **OpenAPI spec provided:** ${openApiPath}\n`;
      sessionManager.updateSession(session.id, { openApiPath });
    } else {
      response += `📋 **OpenAPI spec will be auto-discovered when first used**\n`;
    }

    // Step 4: Check for existing auth config (if session was recreated)
    const existingAuth = sessionManager.getAuthConfig(session.id);
    if (existingAuth) {
      response += `🔐 **Authentication:** Previously configured (${existingAuth.type})\n`;
    } else {
      response += `🔓 **Authentication:** Not configured yet\n`;
    }

    // Step 5: Success summary and next steps
    response += `\n## 🎉 API Session Created!\n\n`;
    response += `**Active Session:** ${session.name} (${session.id})\n`;
    response += `**Base URL:** ${session.baseUrl}\n`;

    if (openApiPath) {
      response += `**OpenAPI Spec:** ${openApiPath}\n\n`;
      response += `## 🚀 What's Next?\n\n`;
      response += `**1. Explore available operations:**\n`;
      response += `\`\`\`\nlist_operations docs_path="${openApiPath}"\n\`\`\`\n\n`;
      response += `**2. Get details about a specific operation:**\n`;
      response += `\`\`\`\ndescribe_api docs_path="${openApiPath}" operation_id="OPERATION_ID"\n\`\`\`\n\n`;
      response += `**3. Call an operation:**\n`;
      response += `\`\`\`\ncall_api docs_path="${openApiPath}" operation_id="OPERATION_ID"\n\`\`\`\n\n`;
    } else {
      response += `**OpenAPI Spec:** Will be discovered automatically\n\n`;
      response += `## 🚀 What's Next?\n\n`;
      response += `**1. Discover and explore operations:**\n`;
      response += `\`\`\`\nlist_operations docs_path="${session.baseUrl}"\n\`\`\`\n`;
      response += `(This will auto-discover the OpenAPI spec and show operations)\n\n`;
    }

    response += `**💡 Pro tip:** Your session is automatically saved and will persist across MCP server restarts!\n\n`;
    response += `**🔧 If authentication is needed:**\n`;
    if (openApiPath) {
      response += `\`\`\`\nmanage_auth docs_path="${openApiPath}" auth_type="apiKey" config='{"headerName": "X-API-Key", "apiKey": "YOUR_KEY"}'\n\`\`\``;
    } else {
      response += `Use the \`manage_auth\` tool with the discovered OpenAPI spec path`;
    }

    return {
      content: [{ type: "text", text: response } as TextContent],
    };
  } catch (error) {
    console.error("Error initializing API:", error);
    return {
      content: [
        {
          type: "text",
          text: `❌ **Error initializing API session**\n\n${
            error instanceof Error ? error.message : "Unknown error"
          }\n\n**Common issues:**\n1. Invalid base URL format\n2. Network connectivity problems\n3. CORS restrictions\n4. Invalid OpenAPI specification`,
        } as TextContent,
      ],
    };
  }
}
