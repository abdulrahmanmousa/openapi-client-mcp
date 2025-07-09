import type { OpenAPIV2, OpenAPIV3 } from "openapi-types";
import { z } from "zod";

// Tool parameter schemas
export const DiscoverApisSchema = z.object({
  workspace_path: z
    .string()
    .optional()
    .describe("Optional: specific path to search for OpenAPI files"),
  recursive: z
    .boolean()
    .default(true)
    .describe("Whether to search recursively in subdirectories"),
  include_remote: z
    .boolean()
    .default(false)
    .describe("Whether to include remote OpenAPI URLs"),
});

export const CallApiSchema = z.object({
  api_source: z
    .string()
    .describe(
      'Path to OpenAPI file or URL (e.g., "petstore.yaml", "https://api.example.com/openapi.json")'
    ),
  operation_id: z
    .string()
    .describe(
      'The operationId from the OpenAPI spec (e.g., "listPets", "createUser")'
    ),
  parameters: z
    .record(z.any())
    .optional()
    .describe("Parameters for the API operation"),
  auth_config: z
    .record(z.string())
    .optional()
    .describe("Authentication configuration (api keys, tokens, etc.)"),
  base_url: z.string().optional().describe("Base URL for the API"),
});

export const DescribeApiSchema = z.object({
  api_source: z.string().describe("Path to OpenAPI file or URL"),
  operation_id: z
    .string()
    .optional()
    .describe("Optional: specific operation to describe"),
});

export const ListOperationsSchema = z.object({
  api_source: z.string().describe("Path to OpenAPI file or URL"),
  tag: z.string().optional().describe("Optional: filter operations by tag"),
  method: z
    .string()
    .optional()
    .describe("Optional: filter operations by HTTP method"),
});

export const ManageAuthSchema = z.object({
  api_source: z.string().describe("Path to OpenAPI file or URL"),
  auth_type: z
    .enum(["apiKey", "bearer", "basic", "oauth2"])
    .describe("Type of authentication"),
  config: z.record(z.string()).describe("Authentication configuration"),
});

// Type definitions
export type DiscoverApisParams = z.infer<typeof DiscoverApisSchema>;
export type CallApiParams = z.infer<typeof CallApiSchema>;
export type DescribeApiParams = z.infer<typeof DescribeApiSchema>;
export type ListOperationsParams = z.infer<typeof ListOperationsSchema>;
export type ManageAuthParams = z.infer<typeof ManageAuthSchema>;

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
