import type { OpenAPIV2, OpenAPIV3 } from "openapi-types";
import { z } from "zod";

// Tool parameter schemas
export const DiscoverApisSchema = z.object({
  workspace_path: z
    .string()
    .optional()
    .describe(
      "Optional: Absolute or relative path to search for OpenAPI files. Defaults to current working directory. Examples: '/home/user/project', './api-specs', '../docs'"
    ),
  recursive: z
    .boolean()
    .default(true)
    .describe(
      "Whether to search recursively in subdirectories. Set to false to only search in the specified directory. Default: true"
    ),
  include_remote: z
    .boolean()
    .default(false)
    .describe(
      "Whether to include remote OpenAPI URLs from configuration files or documentation. Default: false"
    ),
});

export const CallApiSchema = z.object({
  docs_path: z
    .string()
    .describe(
      "REQUIRED: Path to OpenAPI file or URL. When user provides a specific OpenAPI file/URL, use it directly - no need to discover first. Can be absolute path (/home/user/api.yaml), relative path (./openapi.json), filename in current directory (petstore.yaml), or full URL (https://api.example.com/openapi.json)."
    ),
  operation_id: z
    .string()
    .describe(
      'REQUIRED: The exact operationId from the OpenAPI specification. Use list_operations tool to see all available operation IDs. Examples: "listPets", "createUser", "getUserById", "updatePost"'
    ),
  parameters: z
    .record(z.any())
    .optional()
    .describe(
      'Optional: JSON object containing parameters for the API operation. Include path parameters (id, userId), query parameters (limit, filter), header parameters (X-Custom-Header), and request body (use \'body\' key). Example: {"id": 123, "limit": 10, "body": {"name": "John"}}'
    ),
  auth_config: z
    .record(z.string())
    .optional()
    .describe(
      'Optional: Authentication configuration for one-time use. Prefer using manage_auth tool to set persistent authentication. Format: {"type": "apiKey", "headerName": "X-API-Key", "apiKey": "your-key"}'
    ),
  base_url: z
    .string()
    .optional()
    .describe(
      "Optional: Override the base URL from OpenAPI specification. Use full URL with protocol. Example: 'https://api.staging.example.com' or 'http://localhost:3000'"
    ),
});

export const DescribeApiSchema = z.object({
  docs_path: z
    .string()
    .describe(
      "REQUIRED: Path to OpenAPI file or URL. When user provides a specific OpenAPI file/URL, use it directly - no need to discover first. Same format as call_api tool."
    ),
  operation_id: z
    .string()
    .optional()
    .describe(
      "Optional: Specific operation ID to get detailed information about. If omitted, returns general API overview. Use list_operations to see available operation IDs."
    ),
});

export const ListOperationsSchema = z.object({
  docs_path: z
    .string()
    .describe(
      "REQUIRED: Path to OpenAPI file or URL. When user provides a specific OpenAPI file/URL, use it directly - no need to discover first. Same format as call_api tool."
    ),
  tag: z
    .string()
    .optional()
    .describe(
      "Optional: Filter operations by OpenAPI tag/category. Examples: 'users', 'pets', 'authentication'. Case-insensitive partial matching."
    ),
  method: z
    .string()
    .optional()
    .describe(
      "Optional: Filter operations by HTTP method. Valid values: 'get', 'post', 'put', 'patch', 'delete', 'head', 'options'. Case-insensitive."
    ),
});

export const ManageAuthSchema = z.object({
  docs_path: z
    .string()
    .describe(
      "REQUIRED: Path to OpenAPI file or URL that this authentication applies to. When user provides a specific OpenAPI file/URL, use it directly. Each API source can have its own authentication configuration."
    ),
  auth_type: z
    .enum(["apiKey", "bearer", "basic", "oauth2"])
    .describe(
      "REQUIRED: Type of authentication method. 'apiKey' for API key in header, 'bearer' for Bearer token, 'basic' for username/password, 'oauth2' for OAuth2 access token."
    ),
  config: z
    .record(z.string())
    .describe(
      'REQUIRED: Authentication configuration object. For apiKey: {"headerName": "X-API-Key", "apiKey": "your-key"}. For bearer: {"token": "your-token"}. For basic: {"username": "user", "password": "pass"}. For oauth2: {"accessToken": "your-token"}.'
    ),
});

export const InitApiSchema = z.object({
  base_url: z
    .string()
    .describe(
      "REQUIRED: Base URL of the API (e.g., 'https://api.example.com', 'http://localhost:3000'). This is the main endpoint where your API is hosted."
    ),
  name: z
    .string()
    .optional()
    .describe(
      "Optional: Custom name for this API session. If not provided, will be auto-generated from the base URL."
    ),
  openapi_path: z
    .string()
    .optional()
    .describe(
      "Optional: Specific path to OpenAPI specification if auto-discovery fails. Can be relative path ('/docs/openapi.json') or full URL."
    ),
  force_rediscover: z
    .boolean()
    .default(false)
    .describe(
      "Optional: Force re-discovery of OpenAPI spec even if already cached. Useful when API spec has been updated."
    ),
});

export const ManageSessionSchema = z.object({
  action: z
    .enum(["list", "activate", "delete", "info"])
    .describe(
      "REQUIRED: Action to perform. 'list' shows all sessions, 'activate' sets active session, 'delete' removes session, 'info' shows session details."
    ),
  session_id: z
    .string()
    .optional()
    .describe(
      "Optional: Session ID for activate, delete, or info actions. Not needed for 'list' action. Use manage_session action='list' to see available session IDs."
    ),
});

// Type definitions
export type DiscoverApisParams = z.infer<typeof DiscoverApisSchema>;
export type CallApiParams = z.infer<typeof CallApiSchema>;
export type DescribeApiParams = z.infer<typeof DescribeApiSchema>;
export type ListOperationsParams = z.infer<typeof ListOperationsSchema>;
export type ManageAuthParams = z.infer<typeof ManageAuthSchema>;
export type InitApiParams = z.infer<typeof InitApiSchema>;
export type ManageSessionParams = z.infer<typeof ManageSessionSchema>;

// OpenAPI related types
export type OpenAPIDocument = OpenAPIV3.Document | OpenAPIV2.Document;

export interface ApiInfo {
  path: string;
  title: string;
  version: string;
  description?: string;
  servers?: string[];
  isRemote: boolean;
  operations: OperationInfo[];
}

export interface OperationInfo {
  operationId: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterInfo[];
  requestBody?: RequestBodyInfo;
  responses?: Record<string, ResponseInfo>;
}

export interface ParameterInfo {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  required: boolean;
  schema: any;
  description?: string;
}

export interface RequestBodyInfo {
  required: boolean;
  contentType: string;
  schema: any;
  description?: string;
}

export interface ResponseInfo {
  description: string;
  contentType?: string;
  schema?: any;
}

export interface AuthConfig {
  type: "apiKey" | "bearer" | "basic" | "oauth2";
  config: Record<string, string>;
}

export interface ApiCallResult {
  success: boolean;
  statusCode?: number;
  data?: any;
  error?: string;
  headers?: Record<string, string>;
  executionTime?: number;
}
