# Universal OpenAPI MCP

A powerful Model Context Protocol (MCP) server that provides universal OpenAPI integration. **One MCP installation that works with ANY OpenAPI specification** - no more generating separate MCPs for each API!

## 🚀 Key Features

- **🔍 Auto-Discovery**: Automatically finds OpenAPI/Swagger files in your workspace
- **🌐 Universal Compatibility**: Works with any valid OpenAPI 2.0/3.0/3.1 specification
- **🔧 Dynamic Operation**: No pre-generation needed - parses and executes APIs in real-time
- **🔐 Authentication Support**: API Key, Bearer Token, Basic Auth, and OAuth2
- **📁 File Watching**: Real-time updates when OpenAPI files change
- **🌍 Remote APIs**: Support for both local files and remote OpenAPI URLs
- **📖 Rich Documentation**: Detailed operation descriptions and usage examples

## 📦 Installation

```bash
npm install
npm run build
```

## 🛠️ Available Tools

### 1. `discover_apis`

Auto-discover OpenAPI specifications in your workspace.

```typescript
discover_apis {
  workspace_path?: string,    // Optional: specific path to search
  recursive?: boolean,        // Default: true
  include_remote?: boolean    // Default: false
}
```

### 2. `call_api`

Execute API operations from any OpenAPI specification.

```typescript
call_api {
  api_source: string,              // Path to OpenAPI file or URL
  operation_id: string,            // Operation ID from the spec
  parameters?: Record<string, any>, // Operation parameters
  auth_config?: Record<string, string> // Optional auth config
}
```

### 3. `list_operations`

List all available operations from an OpenAPI spec with filtering.

```typescript
list_operations {
  api_source: string,    // Path to OpenAPI file or URL
  tag?: string,          // Optional: filter by tag
  method?: string        // Optional: filter by HTTP method
}
```

### 4. `describe_api`

Get detailed information about an API or specific operation.

```typescript
describe_api {
  api_source: string,        // Path to OpenAPI file or URL
  operation_id?: string      // Optional: specific operation to describe
}
```

### 5. `manage_auth`

Configure authentication for API calls.

```typescript
manage_auth {
  api_source: string,                           // Path to OpenAPI file or URL
  auth_type: 'apiKey' | 'bearer' | 'basic' | 'oauth2',
  config: Record<string, string>                // Auth configuration
}
```

## 🎯 Usage Examples

### Discover APIs in your project

```bash
discover_apis workspace_path="./my-project" recursive=true
```

### List all operations from a Petstore API

```bash
list_operations api_source="./petstore.yaml"
```

### Call an API operation

```bash
call_api api_source="./petstore.yaml" operation_id="listPets" parameters='{"limit": 10}'
```

### Set up API key authentication

```bash
manage_auth api_source="./petstore.yaml" auth_type="apiKey" config='{"headerName": "X-API-Key", "apiKey": "your-key-here"}'
```

### Call authenticated API

```bash
call_api api_source="./petstore.yaml" operation_id="createPet" parameters='{"body": {"name": "Fluffy", "tag": "cat"}}'
```

## 🔐 Authentication Types

### API Key Authentication

```json
{
  "auth_type": "apiKey",
  "config": {
    "headerName": "X-API-Key",
    "apiKey": "your-api-key"
  }
}
```

### Bearer Token Authentication

```json
{
  "auth_type": "bearer",
  "config": {
    "token": "your-bearer-token"
  }
}
```

### Basic Authentication

```json
{
  "auth_type": "basic",
  "config": {
    "username": "your-username",
    "password": "your-password"
  }
}
```

### OAuth2 Authentication

```json
{
  "auth_type": "oauth2",
  "config": {
    "accessToken": "your-oauth2-token"
  }
}
```

## 🏗️ Architecture

```
src/
├── index.ts              # Main MCP server
├── tools/                # Tool implementations
│   ├── discover-apis.ts  # API discovery tool
│   ├── call-api.ts       # API calling tool
│   ├── list-operations.ts # Operations listing tool
│   ├── describe-api.ts   # API description tool
│   └── manage-auth.ts    # Authentication management
├── utils/                # Utility classes
│   ├── discovery.ts      # OpenAPI file discovery
│   └── http-client.ts    # HTTP client for API calls
└── types/                # TypeScript definitions
    └── index.ts          # Type definitions and schemas
```

## 🚀 Quick Start

1. **Install and build the MCP**:

   ```bash
   npm install && npm run build
   ```

2. **Add to your MCP client configuration** (e.g., Claude Desktop):

   ```json
   {
     "mcpServers": {
       "universal-openapi-mcp": {
         "command": "node",
         "args": ["/absolute/path/to/universal-openapi-mcp/dist/index.js"]
       }
     }
   }
   ```

3. **Start using it**:
   - "Discover APIs in my current project"
   - "List operations from my API specification"
   - "Call the createUser operation from my users API"

## 🔍 Supported OpenAPI Features

- ✅ OpenAPI 2.0 (Swagger)
- ✅ OpenAPI 3.0.x
- ✅ OpenAPI 3.1.x
- ✅ JSON and YAML formats
- ✅ Path parameters
- ✅ Query parameters
- ✅ Header parameters
- ✅ Request bodies
- ✅ Multiple content types
- ✅ Response schemas
- ✅ Authentication schemes
- ✅ Tags and operation grouping
- ✅ Server definitions

## 🛡️ Security Features

- Input validation with Zod schemas
- Secure parameter handling
- Authentication credential masking in logs
- Safe file system access
- No arbitrary code execution

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### MCP Server Not Found

- Ensure the path in your MCP client configuration is absolute
- Verify the build completed successfully (`npm run build`)
- Check that Node.js is installed and accessible

### OpenAPI File Not Detected

- Ensure your file has a `.yaml`, `.yml`, or `.json` extension
- Verify the file contains valid OpenAPI specification
- Check the file includes required fields like `openapi` or `swagger` version

### API Calls Failing

- Verify the base URL is correct in your OpenAPI spec
- Check if the API requires authentication (`manage_auth` tool)
- Ensure required parameters are provided
- Check network connectivity to the API server

### Authentication Issues

- Verify the authentication configuration is correct for your API
- Check that API keys/tokens are valid and not expired
- Ensure the authentication type matches what the API expects

For more help, check the error messages - they're designed to be helpful and actionable!
