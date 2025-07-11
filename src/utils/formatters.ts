import { stringify as flattedStringify } from "flatted";
import { safeClone } from "./safe-clone.js";
import type { OperationInfo } from "../types/index.js";

export function formatSchema(schema: any): string {
  return flattedStringify(safeClone(schema));
}

export function formatParameters(parameters: any[]): string {
  if (!parameters || parameters.length === 0) return '';
  let out = '## Parameters\n\n';
  const paramsByLocation: Record<string, typeof parameters> = {};
  for (const param of parameters) {
    if (!paramsByLocation[param.in]) paramsByLocation[param.in] = [];
    paramsByLocation[param.in].push(param);
  }
  for (const [location, params] of Object.entries(paramsByLocation)) {
    out += `### ${location.charAt(0).toUpperCase() + location.slice(1)} Parameters\n\n`;
    for (const param of params) {
      out += `#### \`${param.name}\`\n`;
      out += `- **Required:** ${param.required ? "Yes" : "No"}\n`;
      if (param.schema) {
        out += `- **Type:** ${param.schema.type || "any"}\n`;
        if (param.schema.format) out += `- **Format:** ${param.schema.format}\n`;
        if (param.schema.enum) out += `- **Allowed Values:** ${param.schema.enum.join(", ")}\n`;
        if (param.schema.minimum !== undefined) out += `- **Minimum:** ${param.schema.minimum}\n`;
        if (param.schema.maximum !== undefined) out += `- **Maximum:** ${param.schema.maximum}\n`;
        if (param.schema.pattern) out += `- **Pattern:** \`${param.schema.pattern}\`\n`;
        if (param.schema.example !== undefined) out += `- **Example:** \`${param.schema.example}\`\n`;
      }
      if (param.description) out += `- **Description:** ${param.description}\n`;
      out += `\n`;
    }
  }
  return out;
}

export function formatRequestBody(requestBody: any): string {
  if (!requestBody) return '';
  let out = '## Request Body\n\n';
  out += `- **Required:** ${requestBody.required ? "Yes" : "No"}\n`;
  out += `- **Content-Type:** \`${requestBody.contentType}\`\n`;
  if (requestBody.description) out += `- **Description:** ${requestBody.description}\n`;
  if (requestBody.schema) {
    out += `\n**Schema:**\n`;
    out += `
  json
${formatSchema(requestBody.schema)}
  \n`;
  }
  out += '\n';
  return out;
}

export function formatResponses(responses: Record<string, any>): string {
  if (!responses || Object.keys(responses).length === 0) return '';
  let out = '## Responses\n\n';
  for (const [status, resp] of Object.entries(responses)) {
    out += `### ${status}\n`;
    out += `${resp.description}\n`;
    if (resp.contentType) out += `**Content-Type:** \`${resp.contentType}\`\n`;
    if (resp.schema) {
      out += `\n**Schema:**\n`;
      out += `
  json
${formatSchema(resp.schema)}
  \n`;
    }
    out += '\n';
  }
  return out;
}

export function formatUsageExample(operation: OperationInfo, docsPath: string): string {
  let out = '## Usage Example\n\n';
  out += '```
';
  out += `call_api docs_path="${docsPath}" operation_id="${operation.operationId}"`;
  if (operation.parameters && operation.parameters.length > 0) {
    out += ` parameters='{
`;
    const exampleParams: string[] = [];
    for (const param of operation.parameters) {
      if (param.required) {
        let exampleValue = "value";
        if (param.schema) {
          if (param.schema.type === "integer") exampleValue = "123";
          else if (param.schema.type === "boolean") exampleValue = "true";
          else if (param.schema.type === "array") exampleValue = '["item1", "item2"]';
          else if (param.schema.enum) exampleValue = `"${param.schema.enum[0]}"`;
          else if (param.schema.example) exampleValue = flattedStringify(safeClone(param.schema.example));
          else exampleValue = `"example_${param.name}"`;
        }
        exampleParams.push(`  "${param.name}": ${exampleValue}  // ${param.description || "Required parameter"}`);
      }
    }
    out += exampleParams.join(",\n");
    out += `\n}'`;
  }
  out += '\n```
\n';
  return out;
}

export function formatOperationDetails(operation: OperationInfo, docsPath: string): string {
  let response = `# ${operation.operationId}\n\n`;
  response += `**${operation.method}** \`${operation.path}\`\n\n`;
  if (operation.summary) response += `## Summary\n${operation.summary}\n\n`;
  if (operation.description && operation.description !== operation.summary) response += `## Description\n${operation.description}\n\n`;
  if (operation.tags && operation.tags.length > 0) response += `**Tags:** ${operation.tags.join(", ")}\n\n`;
  response += formatParameters(operation.parameters);
  response += formatRequestBody(operation.requestBody);
  response += formatResponses(operation.responses);
  response += formatUsageExample(operation, docsPath);
  return response;
} 