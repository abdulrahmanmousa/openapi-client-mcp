import {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import type { ManageSessionParams } from "../types/index.js";
import { sessionManager } from "../utils/session-manager.js";

export async function manageSession(
  params: ManageSessionParams
): Promise<CallToolResult> {
  try {
    let response = "";

    switch (params.action) {
      case "list":
        response = await handleListSessions();
        break;
      case "activate":
        response = await handleActivateSession(params.session_id);
        break;
      case "delete":
        response = await handleDeleteSession(params.session_id);
        break;
      case "info":
        response = await handleSessionInfo(params.session_id);
        break;
      default:
        response = `❌ **Unknown action:** ${params.action}\n\n**Available actions:**\n- list: Show all saved sessions\n- activate: Set a session as active\n- delete: Remove a session\n- info: Show detailed session information`;
    }

    return {
      content: [{ type: "text", text: response } as TextContent],
    };
  } catch (error) {
    console.error("Error managing session:", error);
    return {
      content: [
        {
          type: "text",
          text: `❌ **Error managing session**\n\n${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        } as TextContent,
      ],
    };
  }
}

async function handleListSessions(): Promise<string> {
  const sessions = sessionManager.listSessions();
  const activeSession = sessionManager.getActiveSession();

  if (sessions.length === 0) {
    return `📋 **No API sessions found**\n\n**To start calling APIs:**\n1. Initialize a new API: \`init_api base_url="https://api.example.com"\`\n2. Or discover local APIs: \`discover_apis\`\n\n**Once you have sessions, you can call APIs directly!**`;
  }

  let response = `📋 **Available API Sessions (${sessions.length})**\n\n`;
  response += `**🚀 Ready to call APIs! Choose a session below:**\n\n`;

  for (const session of sessions) {
    const isActive = activeSession?.id === session.id;
    const activeIndicator = isActive ? " 🟢 **ACTIVE**" : "";

    response += `### ${session.name}${activeIndicator}\n`;
    response += `**ID:** ${session.id}\n`;
    response += `**Base URL:** ${session.baseUrl}\n`;

    if (session.openApiPath) {
      response += `**OpenAPI:** ${session.openApiPath}\n`;
    }

    if (session.authConfig) {
      response += `**Auth:** ${session.authConfig.type} (configured)\n`;
    }

    if (session.metadata?.title) {
      response += `**API Title:** ${session.metadata.title}\n`;
    }

    if (session.metadata?.version) {
      response += `**Version:** ${session.metadata.version}\n`;
    }

    response += `**Created:** ${new Date(
      session.createdAt
    ).toLocaleString()}\n`;
    response += `**Last Used:** ${new Date(
      session.lastUsed
    ).toLocaleString()}\n\n`;

    response += `**Quick Actions:**\n`;
    if (!isActive) {
      response += `- Activate: \`manage_session action="activate" session_id="${session.id}"\`\n`;
    }
    response += `- Details: \`manage_session action="info" session_id="${session.id}"\`\n`;
    response += `- Delete: \`manage_session action="delete" session_id="${session.id}"\`\n\n`;
    response += `---\n\n`;
  }

  response += `## 🚀 Quick Start with Any Session\n\n`;
  response += `**1. Activate a session:**\n`;
  response += `\`\`\`\nmanage_session action="activate" session_id="SESSION_ID"\n\`\`\`\n\n`;
  response += `**2. List operations:**\n`;
  response += `\`\`\`\nlist_operations docs_path="OPENAPI_PATH"\n\`\`\`\n\n`;
  response += `**3. Call an operation:**\n`;
  response += `\`\`\`\ncall_api docs_path="OPENAPI_PATH" operation_id="OPERATION_ID"\n\`\`\``;

  return response;
}

async function handleActivateSession(sessionId?: string): Promise<string> {
  if (!sessionId) {
    return `❌ **Session ID required**\n\nUsage: \`manage_session action="activate" session_id="SESSION_ID"\`\n\nUse \`manage_session action="list"\` to see available sessions.`;
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return `❌ **Session not found:** ${sessionId}\n\nUse \`manage_session action="list"\` to see available sessions.`;
  }

  const success = sessionManager.setActiveSession(sessionId);
  if (!success) {
    return `❌ **Failed to activate session:** ${sessionId}`;
  }

  let response = `✅ **Session activated successfully**\n\n`;
  response += `**Active Session:** ${session.name}\n`;
  response += `**Base URL:** ${session.baseUrl}\n`;

  if (session.openApiPath) {
    response += `**OpenAPI Spec:** ${session.openApiPath}\n`;
  }

  if (session.authConfig) {
    response += `**Authentication:** ${session.authConfig.type} (configured)\n`;
  }

  response += `\n**Next steps:**\n`;
  if (session.openApiPath) {
    response += `1. \`list_operations docs_path="${session.openApiPath}"\`\n`;
    response += `2. \`call_api docs_path="${session.openApiPath}" operation_id="OPERATION_ID"\``;
  } else {
    response += `1. \`init_api base_url="${session.baseUrl}"\` (to discover OpenAPI spec)\n`;
    response += `2. Then use list_operations and call_api`;
  }

  return response;
}

async function handleDeleteSession(sessionId?: string): Promise<string> {
  if (!sessionId) {
    return `❌ **Session ID required**\n\nUsage: \`manage_session action="delete" session_id="SESSION_ID"\`\n\nUse \`manage_session action="list"\` to see available sessions.`;
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return `❌ **Session not found:** ${sessionId}\n\nUse \`manage_session action="list"\` to see available sessions.`;
  }

  const success = sessionManager.deleteSession(sessionId);
  if (!success) {
    return `❌ **Failed to delete session:** ${sessionId}`;
  }

  let response = `✅ **Session deleted successfully**\n\n`;
  response += `**Deleted:** ${session.name} (${session.baseUrl})\n\n`;

  const remainingSessions = sessionManager.listSessions();
  if (remainingSessions.length > 0) {
    response += `**Remaining sessions:** ${remainingSessions.length}\n`;
    const activeSession = sessionManager.getActiveSession();
    if (activeSession) {
      response += `**Active session:** ${activeSession.name}`;
    } else {
      response += `**No active session** - use \`manage_session action="activate"\` to set one`;
    }
  } else {
    response += `**No sessions remaining.** Use \`init_api\` to create a new session.`;
  }

  return response;
}

async function handleSessionInfo(sessionId?: string): Promise<string> {
  if (!sessionId) {
    return `❌ **Session ID required**\n\nUsage: \`manage_session action="info" session_id="SESSION_ID"\`\n\nUse \`manage_session action="list"\` to see available sessions.`;
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return `❌ **Session not found:** ${sessionId}\n\nUse \`manage_session action="list"\` to see available sessions.`;
  }

  const isActive = sessionManager.getActiveSession()?.id === session.id;

  let response = `📋 **Session Details**\n\n`;
  response += `**Name:** ${session.name}${isActive ? " 🟢 **ACTIVE**" : ""}\n`;
  response += `**ID:** ${session.id}\n`;
  response += `**Base URL:** ${session.baseUrl}\n`;

  if (session.openApiPath) {
    response += `**OpenAPI Spec:** ${session.openApiPath}\n`;
  } else {
    response += `**OpenAPI Spec:** Not discovered\n`;
  }

  if (session.authConfig) {
    response += `**Authentication Type:** ${session.authConfig.type}\n`;

    // Show masked auth config
    const maskedConfig = { ...session.authConfig.config };
    Object.keys(maskedConfig).forEach((key) => {
      if (
        key.toLowerCase().includes("key") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("password")
      ) {
        maskedConfig[key] = maskedConfig[key].substring(0, 4) + "***";
      }
    });
    response += `**Auth Config:** ${JSON.stringify(maskedConfig)}\n`;
  } else {
    response += `**Authentication:** Not configured\n`;
  }

  if (session.metadata) {
    response += `\n**API Metadata:**\n`;
    if (session.metadata.title)
      response += `- Title: ${session.metadata.title}\n`;
    if (session.metadata.version)
      response += `- Version: ${session.metadata.version}\n`;
    if (session.metadata.description)
      response += `- Description: ${session.metadata.description}\n`;
  }

  response += `\n**Timeline:**\n`;
  response += `- Created: ${new Date(session.createdAt).toLocaleString()}\n`;
  response += `- Last Used: ${new Date(session.lastUsed).toLocaleString()}\n\n`;

  response += `**Available Actions:**\n`;
  if (!isActive) {
    response += `- \`manage_session action="activate" session_id="${session.id}"\`\n`;
  }
  response += `- \`manage_session action="delete" session_id="${session.id}"\`\n\n`;

  if (session.openApiPath) {
    response += `**Quick API Operations:**\n`;
    response += `- \`list_operations docs_path="${session.openApiPath}"\`\n`;
    response += `- \`describe_api docs_path="${session.openApiPath}"\`\n`;
    response += `- \`call_api docs_path="${session.openApiPath}" operation_id="OPERATION_ID"\``;
  } else {
    response += `**Setup Required:**\n`;
    response += `- \`init_api base_url="${session.baseUrl}"\` (to discover OpenAPI spec)`;
  }

  return response;
}
