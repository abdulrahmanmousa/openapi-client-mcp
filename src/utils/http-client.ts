import fetch, { RequestInit as NodeRequestInit, Response } from "node-fetch";
import type {
  ApiCallResult,
  AuthConfig,
  OperationInfo,
  RequestBodyInfo,
} from "../types/index.js";

export class ApiHttpClient {
  private authConfigs: Map<string, AuthConfig> = new Map();

  constructor() {
    this.loadAuthFromSessions();
  }

  // Load authentication configs from saved sessions
  private loadAuthFromSessions(): void {
    try {
      // Import sessionManager dynamically to avoid circular dependencies
      import("./session-manager.js").then(({ sessionManager }) => {
        const sessions = sessionManager.listSessions();
        sessions.forEach((session) => {
          if (session.authConfig && session.openApiPath) {
            this.authConfigs.set(session.openApiPath, session.authConfig);
            // Also set for base URL in case that's used as api_source
            this.authConfigs.set(session.baseUrl, session.authConfig);
          }
        });
      });
    } catch (error) {
      console.warn("Failed to load auth configs from sessions:", error);
    }
  }

  async callOperation(
    baseUrl: string,
    operation: OperationInfo,
    parameters: Record<string, any> = {},
    authConfig?: AuthConfig
  ): Promise<ApiCallResult> {
    const startTime = Date.now();

    try {
      const { url, options } = this.buildRequest(
        baseUrl,
        operation,
        parameters,
        authConfig
      );

      console.log(`Making ${operation.method} request to: ${url}`);
      console.log("Request options:", JSON.stringify(options, null, 2));

      const response = await fetch(url, options);
      const executionTime = Date.now() - startTime;

      const result = await this.processResponse(response, executionTime);

      console.log(
        `Response status: ${result.statusCode}, execution time: ${result.executionTime}ms`
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error("API call failed:", error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        executionTime,
      };
    }
  }

  private buildRequest(
    baseUrl: string,
    operation: OperationInfo,
    parameters: Record<string, any>,
    authConfig?: AuthConfig
  ): { url: string; options: NodeRequestInit } {
    let url = this.buildUrl(baseUrl, operation, parameters);
    const options: NodeRequestInit = {
      method: operation.method,
      headers: this.buildHeaders(operation, parameters, authConfig),
    };

    // Add request body if needed
    if (
      operation.requestBody &&
      ["POST", "PUT", "PATCH"].includes(operation.method)
    ) {
      options.body = this.buildRequestBody(operation.requestBody, parameters);
    }

    return { url, options };
  }

  private buildUrl(
    baseUrl: string,
    operation: OperationInfo,
    parameters: Record<string, any>
  ): string {
    let path = operation.path;
    const queryParams: string[] = [];

    // Replace path parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (param.in === "path" && parameters[param.name] !== undefined) {
          path = path.replace(
            `{${param.name}}`,
            encodeURIComponent(String(parameters[param.name]))
          );
        } else if (
          param.in === "query" &&
          parameters[param.name] !== undefined
        ) {
          queryParams.push(
            `${encodeURIComponent(param.name)}=${encodeURIComponent(
              String(parameters[param.name])
            )}`
          );
        }
      }
    }

    // Ensure baseUrl doesn't end with slash and path starts with slash
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    let fullUrl = `${cleanBaseUrl}${cleanPath}`;

    if (queryParams.length > 0) {
      fullUrl += `?${queryParams.join("&")}`;
    }

    return fullUrl;
  }

  private buildHeaders(
    operation: OperationInfo,
    parameters: Record<string, any>,
    authConfig?: AuthConfig
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "openapi-client-mcp/1.0.0",
    };

    // Add header parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (param.in === "header" && parameters[param.name] !== undefined) {
          headers[param.name] = String(parameters[param.name]);
        }
      }
    }

    // Add authentication headers
    if (authConfig) {
      this.addAuthHeaders(headers, authConfig);
    }

    return headers;
  }

  private addAuthHeaders(
    headers: Record<string, string>,
    authConfig: AuthConfig
  ): void {
    switch (authConfig.type) {
      case "apiKey":
        if (authConfig.config.headerName && authConfig.config.apiKey) {
          headers[authConfig.config.headerName] = authConfig.config.apiKey;
        }
        break;

      case "bearer":
        if (authConfig.config.token) {
          headers["Authorization"] = `Bearer ${authConfig.config.token}`;
        }
        break;

      case "basic":
        if (authConfig.config.username && authConfig.config.password) {
          const credentials = Buffer.from(
            `${authConfig.config.username}:${authConfig.config.password}`
          ).toString("base64");
          headers["Authorization"] = `Basic ${credentials}`;
        }
        break;

      case "oauth2":
        if (authConfig.config.accessToken) {
          headers["Authorization"] = `Bearer ${authConfig.config.accessToken}`;
        }
        break;
    }
  }

  private buildRequestBody(
    requestBody: RequestBodyInfo,
    parameters: Record<string, any>
  ): string {
    if (
      !requestBody.required &&
      !Object.keys(parameters).some((key) => key.startsWith("body_"))
    ) {
      return JSON.stringify({});
    }

    // Extract body parameters (parameters starting with 'body_' or direct body object)
    const bodyData: Record<string, any> = {};

    // If there's a direct 'body' parameter, use it
    if (parameters.body && typeof parameters.body === "object") {
      return JSON.stringify(parameters.body);
    }

    // Otherwise, collect parameters that start with 'body_'
    for (const [key, value] of Object.entries(parameters)) {
      if (key.startsWith("body_")) {
        const bodyKey = key.substring(5); // Remove 'body_' prefix
        bodyData[bodyKey] = value;
      }
    }

    return JSON.stringify(bodyData);
  }

  private async processResponse(
    response: Response,
    executionTime: number
  ): Promise<ApiCallResult> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let data: any;
    const contentType = response.headers.get("content-type") || "";

    try {
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (error) {
      data = `Failed to parse response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }

    return {
      success: response.ok,
      statusCode: response.status,
      data,
      error: response.ok
        ? undefined
        : `HTTP ${response.status}: ${response.statusText}`,
      headers,
      executionTime,
    };
  }

  setAuthConfig(apiSource: string, authConfig: AuthConfig): void {
    this.authConfigs.set(apiSource, authConfig);
  }

  getAuthConfig(apiSource: string): AuthConfig | undefined {
    return this.authConfigs.get(apiSource);
  }

  removeAuthConfig(apiSource: string): void {
    this.authConfigs.delete(apiSource);
  }

  // Public method to reload auth configs from sessions
  reloadAuthFromSessions(): void {
    this.loadAuthFromSessions();
  }

  listAuthConfigs(): Record<string, AuthConfig> {
    const configs: Record<string, AuthConfig> = {};
    for (const [key, value] of this.authConfigs.entries()) {
      configs[key] = value;
    }
    return configs;
  }
}
