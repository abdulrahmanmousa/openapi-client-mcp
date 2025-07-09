# Universal OpenAPI MCP - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is an MCP (Model Context Protocol) server project that provides universal OpenAPI integration capabilities.

## Project Overview

- **Type**: MCP Server (TypeScript)
- **Purpose**: Universal Dynamic OpenAPI MCP that works with any OpenAPI specification
- **Key Feature**: One MCP installation that discovers and works with all OpenAPI specs in any workspace

## Architecture

- **Main Server**: `src/index.ts` - MCP server implementation
- **Tools**: `src/tools/` - Individual tool implementations
- **Utils**: `src/utils/` - Utility classes for OpenAPI discovery and HTTP requests
- **Types**: `src/types/` - TypeScript type definitions and Zod schemas

## Core Tools Provided

1. `discover_apis` - Auto-discover OpenAPI files in workspace
2. `call_api` - Execute API operations dynamically
3. `list_operations` - Show available operations from OpenAPI specs
4. `describe_api` - Get detailed API/operation information
5. `manage_auth` - Configure authentication for API calls

## Key Technologies

- **MCP SDK**: @modelcontextprotocol/sdk for MCP protocol implementation
- **OpenAPI Types**: openapi-types for TypeScript definitions
- **Validation**: Zod for runtime type validation and schema enforcement
- **File Watching**: chokidar for real-time OpenAPI file discovery
- **HTTP Client**: node-fetch for API calls
- **YAML/JSON**: js-yaml for parsing OpenAPI specifications

## Development Guidelines

- Follow TypeScript strict mode
- Use Zod schemas for all tool parameters
- Implement proper error handling with user-friendly messages
- Maintain separation of concerns between discovery, HTTP client, and tools
- Provide comprehensive help and examples in tool responses

## MCP Concepts

You can find more info and examples at https://modelcontextprotocol.io/llms-full.txt

## Authentication Support

- API Key authentication (header-based)
- Bearer token authentication
- Basic authentication (username/password)
- OAuth2 access token authentication

## File Discovery

- Automatic detection of OpenAPI files (.yaml, .yml, .json)
- Recursive directory scanning
- File watching for real-time updates
- Support for both local files and remote URLs

When working with this codebase, focus on:

1. Maintaining the universal nature - one MCP works with any OpenAPI spec
2. Providing excellent user experience with clear error messages
3. Supporting all common OpenAPI features and authentication methods
4. Ensuring robust error handling and validation
