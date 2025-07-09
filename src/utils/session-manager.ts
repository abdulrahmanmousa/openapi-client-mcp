import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { AuthConfig } from "../types/index.js";

export interface ApiSession {
  id: string;
  name: string;
  baseUrl: string;
  openApiPath?: string;
  authConfig?: AuthConfig;
  lastUsed: string;
  createdAt: string;
  metadata?: {
    title?: string;
    version?: string;
    description?: string;
  };
}

export interface SessionStorage {
  sessions: Record<string, ApiSession>;
  activeSessionId?: string;
}

export class SessionManager {
  private sessionFile: string;
  private storage: SessionStorage = { sessions: {} };

  constructor() {
    // Store sessions in user's home directory
    const configDir = path.join(os.homedir(), ".openapi-client-mcp");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    this.sessionFile = path.join(configDir, "sessions.json");
    this.loadSessions();
  }

  private loadSessions(): void {
    try {
      if (fs.existsSync(this.sessionFile)) {
        const data = fs.readFileSync(this.sessionFile, "utf-8");
        this.storage = JSON.parse(data);
      } else {
        this.storage = { sessions: {} };
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      this.storage = { sessions: {} };
    }
  }

  private saveSessions(): void {
    try {
      fs.writeFileSync(this.sessionFile, JSON.stringify(this.storage, null, 2));
    } catch (error) {
      console.error("Error saving sessions:", error);
    }
  }

  createSession(baseUrl: string, name?: string): ApiSession {
    const id = this.generateSessionId(baseUrl);
    const session: ApiSession = {
      id,
      name: name || this.extractApiName(baseUrl),
      baseUrl,
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.storage.sessions[id] = session;
    this.storage.activeSessionId = id;
    this.saveSessions();

    return session;
  }

  updateSession(
    sessionId: string,
    updates: Partial<ApiSession>
  ): ApiSession | null {
    const session = this.storage.sessions[sessionId];
    if (!session) return null;

    Object.assign(session, updates, { lastUsed: new Date().toISOString() });
    this.saveSessions();

    return session;
  }

  getSession(sessionId: string): ApiSession | null {
    return this.storage.sessions[sessionId] || null;
  }

  getSessionByBaseUrl(baseUrl: string): ApiSession | null {
    const normalizedUrl = this.normalizeBaseUrl(baseUrl);
    return (
      Object.values(this.storage.sessions).find(
        (session) => this.normalizeBaseUrl(session.baseUrl) === normalizedUrl
      ) || null
    );
  }

  getActiveSession(): ApiSession | null {
    if (!this.storage.activeSessionId) return null;
    return this.getSession(this.storage.activeSessionId);
  }

  setActiveSession(sessionId: string): boolean {
    if (!this.storage.sessions[sessionId]) return false;

    this.storage.activeSessionId = sessionId;
    this.storage.sessions[sessionId].lastUsed = new Date().toISOString();
    this.saveSessions();

    return true;
  }

  listSessions(): ApiSession[] {
    return Object.values(this.storage.sessions).sort(
      (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    );
  }

  deleteSession(sessionId: string): boolean {
    if (!this.storage.sessions[sessionId]) return false;

    delete this.storage.sessions[sessionId];

    if (this.storage.activeSessionId === sessionId) {
      // Set most recently used session as active
      const sessions = this.listSessions();
      this.storage.activeSessionId =
        sessions.length > 0 ? sessions[0].id : undefined;
    }

    this.saveSessions();
    return true;
  }

  setAuthConfig(sessionId: string, authConfig: AuthConfig): boolean {
    const session = this.storage.sessions[sessionId];
    if (!session) return false;

    session.authConfig = authConfig;
    session.lastUsed = new Date().toISOString();
    this.saveSessions();

    return true;
  }

  getAuthConfig(sessionId: string): AuthConfig | null {
    const session = this.storage.sessions[sessionId];
    return session?.authConfig || null;
  }

  private generateSessionId(baseUrl: string): string {
    const normalized = this.normalizeBaseUrl(baseUrl);
    const hash = Buffer.from(normalized)
      .toString("base64")
      .replace(/[+/=]/g, "")
      .substring(0, 8);
    return `session_${hash}_${Date.now().toString(36)}`;
  }

  private normalizeBaseUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(
        /\/$/,
        ""
      );
    } catch {
      return url;
    }
  }

  private extractApiName(baseUrl: string): string {
    try {
      const parsed = new URL(baseUrl);
      const hostname = parsed.hostname;

      // Extract meaningful name from hostname
      if (hostname.includes("api.")) {
        return hostname.replace("api.", "").split(".")[0];
      }

      return hostname.split(".")[0];
    } catch {
      return "API";
    }
  }

  // Auto-discover OpenAPI spec from common endpoints
  async discoverOpenApiSpec(baseUrl: string): Promise<string | null> {
    const commonPaths = [
      "/openapi.json",
      "/openapi.yaml",
      "/swagger.json",
      "/swagger.yaml",
      "/api-docs",
      "/api/docs",
      "/docs/openapi.json",
      "/docs/swagger.json",
      "/v1/openapi.json",
      "/v2/openapi.json",
      "/v3/openapi.json",
    ];

    for (const specPath of commonPaths) {
      try {
        const specUrl = new URL(specPath, baseUrl).toString();
        const response = await fetch(specUrl, {
          method: "GET",
          headers: { Accept: "application/json, application/yaml, text/yaml" },
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("json") || contentType.includes("yaml")) {
            return specUrl;
          }
        }
      } catch {
        // Continue to next path
      }
    }

    return null;
  }
}

// Global session manager instance
export const sessionManager = new SessionManager();
