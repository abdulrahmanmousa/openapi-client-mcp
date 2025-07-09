# Universal OpenAPI MCP - VS Code Integration

This guide shows you how to integrate the Universal OpenAPI MCP with VS Code and Claude Desktop.

## Configuration for Claude Desktop

Add the following to your Claude Desktop configuration file:

### macOS/Linux: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows: `%APPDATA%\Claude\claude_desktop_config.json`

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

**Important**: Replace `/absolute/path/to/universal-openapi-mcp/` with the actual absolute path to this project directory.

## VS Code MCP Configuration

For VS Code integration, the `.vscode/mcp.json` file is already configured:

```json
{
  "servers": {
    "universal-openapi-mcp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/home/abdulrahman/test-projects/mcps/openapi-to-mcp-(mcp server)/dist/index.js"
      ]
    }
  }
}
```

## Example Usage

Once configured, you can use natural language commands like:

- "What APIs are available in my project?"
- "List all operations from my petstore API"
- "Call the getPetById operation with petId 123"
- "Set up API key authentication for my API"
- "Show me details about the createUser operation"

## Sample Commands

```bash
# Discover OpenAPI files in your workspace
discover_apis

# List operations from the example petstore
list_operations api_source="./example-petstore.yaml"

# Get detailed info about a specific operation
describe_api api_source="./example-petstore.yaml" operation_id="getPetById"

# Call an API operation
call_api api_source="./example-petstore.yaml" operation_id="findPetsByStatus" parameters='{"status": "available"}'
```

## Debugging

To debug the MCP server:

1. Check the Claude Desktop logs at `~/Library/Logs/Claude/mcp*.log`
2. Ensure the build was successful: `npm run build`
3. Test the server manually: `node dist/index.js`
4. Verify the path in the configuration is correct and absolute
