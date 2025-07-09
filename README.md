# Universal OpenAPI MCP

[![npm version](https://badge.fury.io/js/openapi-client-mcp.svg)](https://badge.fury.io/js/openapi-client-mcp)
[![npm downloads](https://img.shields.io/npm/dm/openapi-client-mcp.svg)](https://www.npmjs.com/package/openapi-client-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Model Context Protocol (MCP) server that provides universal OpenAPI integration. **One MCP installation that works with ANY OpenAPI specification** - no more generating separate MCPs for each API!

## 🚀 Key Features

- **🌐 Universal Compatibility**: Works with any valid OpenAPI 2.0/3.0/3.1 specification
- **🔧 Dynamic Operation**: No pre-generation needed - parses and executes APIs in real-time
- **🔐 Authentication & Session Persistence**: Secure handling of authentication and session persistence
- **🌍 Remote APIs**: Support for both local files and remote OpenAPI URLs
- **📖 Rich Documentation**: Detailed operation descriptions and usage examples

## 📦 Installation

```bash
npm install -g openapi-client-mcp
```

## ⚡ Quick Use

Once configured, simply tell your AI assistant what you want to do:

### Example Conversations:

**"My API is at https://petstore.swagger.io/v2/swagger.json OR "./schema.yml""** 
- The MCP will discover the OpenAPI spec and call the appropriate endpoint

**"Call the POST /users endpoint with name 'John' and email 'john@example.com'"**
- Automatically finds the endpoint and formats the request

**"List all available endpoints from my Stripe API"**
- Discovers and shows all operations from the API specification

**"Set up authentication for my API using API key 'sk-123...'"**
- Configures authentication and remembers it for future calls

### Natural Language → API Calls
Just describe what you want in plain English:
- ✅ "Get user by ID 123"
- ✅ "Create a new product with name and price"
- ✅ "Update customer email address"
- ✅ "Delete order 456"

No need to know exact endpoint names or parameter formats!

### 🔐 Smart Session Management
The MCP helps you authenticate and **remembers your login even after restart**:
- **Login once**: "Help me login to my API with OAuth/API key"
- **Persistent sessions**: Your authentication is safely stored
- **Auto-reconnect**: Sessions work across MCP restarts
- **Multiple APIs**: Manage sessions for different APIs simultaneously

## ⚙️ Installation

Add to your MCP client (e.g., Claude Desktop, Cursor, VS Code):

```json
{
  "mcpServers": {
    "openapi-client-mcp": {
      "command": "openapi-client-mcp"
    }
  }
}
```

**Alternative (no installation):**
```json
{
  "mcpServers": {
    "openapi-client-mcp": {
      "command": "npx",
      "args": ["openapi-client-mcp"]
    }
  }
}
```


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
- No arbitrary code execution

## 🤝 Contributing

1. Fork the [repository](https://github.com/abdulrahmanmousa/openapi-client-mcp)
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 🔗 Links

- [npm Package](https://www.npmjs.com/package/openapi-client-mcp)
- [GitHub Repository](https://github.com/abdulrahmanmousa/openapi-client-mcp)
- [Report Issues](https://github.com/abdulrahmanmousa/openapi-client-mcp/issues)

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

**MCP Server Not Found:**
- Ensure global install: `npm install -g openapi-client-mcp`
- Try npx instead: Use the npx configuration above
- Check Node.js >=18.0.0 is installed

**OpenAPI File Not Detected:**
- File must have `.yaml`, `.yml`, or `.json` extension
- File must contain valid OpenAPI specification

**API Calls Failing:**
- Check base URL in your OpenAPI spec
- Use `manage_auth` tool for authentication
- Verify required parameters are provided
