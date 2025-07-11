// Uses @redocly/openapi-core bundle/bundleFromString for robust dereferencing.
import { bundle, bundleFromString, createConfig } from "@redocly/openapi-core";
import chokidar, { type FSWatcher } from "chokidar";
import * as fs from "fs/promises";
import { glob } from "glob";
import * as yaml from "js-yaml";
import fetch from "node-fetch";
import * as path from "path";
import type {
  ApiInfo,
  OpenAPIDocument,
  OperationInfo,
} from "../types/index.js";

export class OpenApiDiscovery {
  private watchers: Map<string, FSWatcher> = new Map();

  async discoverApis(
    workspacePath: string = process.cwd(),
    recursive: boolean = true,
    includeRemote: boolean = false
  ): Promise<ApiInfo[]> {
    const apiFiles = await this.findOpenApiFiles(workspacePath, recursive);
    const apis: ApiInfo[] = [];

    for (const filePath of apiFiles) {
      try {
        const apiInfo = await this.parseOpenApiFile(filePath);
        if (apiInfo) {
          apis.push(apiInfo);
        }
      } catch (error) {
        console.error(`Failed to parse OpenAPI file ${filePath}:`, error);
      }
    }

    return apis;
  }

  private async findOpenApiFiles(
    dir: string,
    recursive: boolean
  ): Promise<string[]> {
    const patterns = [
      "**/*.{yaml,yml,json}",
      "**/openapi.{yaml,yml,json}",
      "**/swagger.{yaml,yml,json}",
      "**/api-docs.{yaml,yml,json}",
    ];

    const options = {
      cwd: dir,
      absolute: true,
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
      dot: false,
    };

    if (!recursive) {
      options.ignore.push("**/**");
    }

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, options);
      files.push(...matches);
    }

    // Filter for actual OpenAPI files
    const openApiFiles: string[] = [];
    for (const file of [...new Set(files)]) {
      if (await this.isOpenApiFile(file)) {
        openApiFiles.push(file);
      }
    }

    return openApiFiles;
  }

  private async isOpenApiFile(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, "utf8");
      const parsed = this.parseContent(content);

      return !!(
        parsed &&
        typeof parsed === "object" &&
        (parsed.openapi || // OpenAPI 3.x
          parsed.swagger || // Swagger 2.x
          (parsed.info && (parsed.paths || parsed.components)))
      );
    } catch {
      return false;
    }
  }

  async parseOpenApiFile(filePath: string): Promise<ApiInfo | null> {
    try {
      const config = await createConfig({});
      const {
        bundle: { parsed },
      } = await bundle({ ref: filePath, config, dereference: true });
      if (!parsed) return null;
      return this.extractApiInfo(parsed, filePath);
    } catch (error) {
      console.error(`Error parsing OpenAPI file ${filePath}:`, error);
      return null;
    }
  }

  async parseOpenApiUrl(url: string): Promise<ApiInfo | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const content = await response.text();
      const config = await createConfig({});
      const {
        bundle: { parsed },
      } = await bundleFromString({
        source: content,
        config,
        dereference: true,
      });
      if (!parsed) return null;
      return this.extractApiInfo(parsed, url, true);
    } catch (error) {
      console.error(`Error fetching OpenAPI from URL ${url}:`, error);
      return null;
    }
  }

  private parseContent(content: string): any {
    try {
      // Try JSON first
      return JSON.parse(content);
    } catch {
      try {
        // Try YAML
        return yaml.load(content);
      } catch {
        return null;
      }
    }
  }

  private extractApiInfo(
    spec: OpenAPIDocument,
    source: string,
    isRemote: boolean = false
  ): ApiInfo {
    const operations = this.extractOperations(spec);
    const servers = this.extractServers(spec);
    const info = spec.info || {};
    return {
      path: source,
      title: info.title,
      version: info.version,
      description: info.description,
      servers,
      isRemote,
      operations,
    };
  }

  private extractOperations(spec: OpenAPIDocument): OperationInfo[] {
    const operations: OperationInfo[] = [];
    if (!spec.paths) {
      return operations;
    }
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem || typeof pathItem !== "object") continue;
      const methods = [
        "get",
        "post",
        "put",
        "delete",
        "patch",
        "head",
        "options",
        "trace",
      ];
      for (const method of methods) {
        const operation = (pathItem as any)[method];
        if (!operation) continue;
        operations.push({
          operationId:
            operation.operationId ||
            `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
          path,
          method: method.toUpperCase(),
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags,
          parameters: this.extractParameters(
            operation.parameters,
            pathItem.parameters
          ),
          requestBody: this.extractRequestBody(operation.requestBody),
          responses: this.extractResponses(operation.responses),
        });
      }
    }
    return operations;
  }

  private extractParameters(
    operationParams: any[] = [],
    pathParams: any[] = []
  ): any[] {
    const allParams = [...(pathParams || []), ...(operationParams || [])];
    return allParams.map((param) => ({
      name: param.name,
      in: param.in,
      required: param.required || param.in === "path",
      schema: param.schema || { type: param.type },
      description: param.description,
    }));
  }

  private extractRequestBody(requestBody: any): any {
    if (!requestBody) return undefined;
    const content = requestBody.content;
    if (!content) return undefined;
    const contentType = Object.keys(content)[0];
    const mediaType = content[contentType];
    return {
      required: requestBody.required || false,
      contentType,
      schema: mediaType.schema,
      description: requestBody.description,
    };
  }

  private extractResponses(responses: any): Record<string, any> {
    if (!responses) return {};
    const extracted: Record<string, any> = {};
    for (const [status, response] of Object.entries(responses)) {
      if (!response || typeof response !== "object") continue;
      const resp = response as any;
      let contentType: string | undefined;
      let schema: any;
      if (resp.content) {
        contentType = Object.keys(resp.content)[0];
        const mediaType = resp.content[contentType];
        schema = mediaType?.schema;
      }
      extracted[status] = {
        description: resp.description || "No description",
        contentType,
        schema,
      };
    }
    return extracted;
  }

  private extractServers(spec: OpenAPIDocument): string[] {
    const servers = (spec as any).servers;
    if (servers && Array.isArray(servers)) {
      return servers.map((server: any) => server.url);
    }
    const host = (spec as any).host;
    if (host) {
      const protocol = (spec as any).schemes?.[0] || "https";
      const basePath = (spec as any).basePath || "";
      return [`${protocol}://${host}${basePath}`];
    }
    return [];
  }

  startWatching(
    workspacePath: string,
    callback: (apiInfo: ApiInfo[]) => void
  ): void {
    if (this.watchers.has(workspacePath)) {
      return;
    }

    const watcher = chokidar.watch(["**/*.{yaml,yml,json}"], {
      cwd: workspacePath,
      ignored: ["**/node_modules/**", "**/dist/**", "**/build/**"],
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on("add", async (filePath) => {
      const fullPath = path.resolve(workspacePath, filePath);
      if (await this.isOpenApiFile(fullPath)) {
        const apis = await this.discoverApis(workspacePath);
        callback(apis);
      }
    });

    watcher.on("change", async (filePath) => {
      const fullPath = path.resolve(workspacePath, filePath);
      if (await this.isOpenApiFile(fullPath)) {
        const apis = await this.discoverApis(workspacePath);
        callback(apis);
      }
    });

    watcher.on("unlink", async (filePath) => {
      const apis = await this.discoverApis(workspacePath);
      callback(apis);
    });

    this.watchers.set(workspacePath, watcher);
  }

  stopWatching(workspacePath: string): void {
    const watcher = this.watchers.get(workspacePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(workspacePath);
    }
  }

  dispose(): void {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
  }
}
