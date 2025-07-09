# Universal OpenAPI MCP - Complete Usage Guide

## 🎯 What This MCP Does

This Universal OpenAPI MCP solves the fundamental problem of having to create separate MCPs for each API. Instead, it provides **ONE MCP that dynamically works with ANY OpenAPI specification**.

### Traditional Approach (❌ Problematic)

```
Project A (petstore.yaml) → Generate MCP A
Project B (users-api.json) → Generate MCP B
Project C (payments.yaml) → Generate MCP C
```

### Universal MCP Approach (✅ Solution)

```
Universal OpenAPI MCP → Discovers ALL OpenAPI specs → Works with ANY API
```

## 🚀 Complete Walkthrough

### Step 1: Discover APIs in Your Project

Start by discovering what OpenAPI specifications are available:

```
User: "What APIs are available in my project?"
```

The MCP will:

- Scan your workspace for OpenAPI/Swagger files
- Parse and validate each specification
- Show you a summary of available APIs and operations

### Step 2: Explore an API

Get detailed information about a specific API:

```
User: "Tell me about my petstore API"
→ describe_api docs_path="./example-petstore.yaml"
```

Or list all available operations:

```
User: "What operations are available in my petstore API?"
→ list_operations docs_path="./example-petstore.yaml"
```

### Step 3: Call API Operations

Execute API operations directly:

```
User: "Get pet with ID 123 from my petstore"
→ call_api docs_path="./example-petstore.yaml" operation_id="getPetById" parameters='{"petId": 123}'
```

### Step 4: Handle Authentication

For APIs that require authentication:

```
User: "Set up API key authentication for my petstore API"
→ manage_auth docs_path="./example-petstore.yaml" auth_type="apiKey" config='{"headerName": "X-API-Key", "apiKey": "your-key-here"}'
```

### Step 5: Advanced Operations

Create new resources:

```
User: "Create a new pet named Fluffy"
→ call_api docs_path="./example-petstore.yaml" operation_id="addPet" parameters='{"body": {"name": "Fluffy", "status": "available", "photoUrls": ["https://example.com/fluffy.jpg"]}}'
```

## 🛠️ Tool Reference

### `discover_apis` - Find OpenAPI Specifications

**Purpose**: Automatically discover OpenAPI files in your workspace

**Parameters**:

- `workspace_path` (optional): Directory to search (defaults to current directory)
- `recursive` (optional): Search subdirectories (default: true)
- `include_remote` (optional): Include remote URLs (default: false)

**Example**:

```json
{
  "workspace_path": "./my-apis",
  "recursive": true,
  "include_remote": false
}
```

### `call_api` - Execute API Operations

**Purpose**: Call any operation from any OpenAPI specification

**Parameters**:

- `docs_path`: Path to OpenAPI file or URL
- `operation_id`: The operation ID from the OpenAPI spec
- `parameters` (optional): Operation parameters
- `auth_config` (optional): One-time auth configuration

**Examples**:

**Simple GET request**:

```json
{
  "docs_path": "./petstore.yaml",
  "operation_id": "findPetsByStatus",
  "parameters": {
    "status": "available"
  }
}
```

**POST request with body**:

```json
{
  "docs_path": "./petstore.yaml",
  "operation_id": "addPet",
  "parameters": {
    "body": {
      "name": "Buddy",
      "status": "available",
      "photoUrls": ["https://example.com/buddy.jpg"]
    }
  }
}
```

**Request with path and query parameters**:

```json
{
  "docs_path": "./petstore.yaml",
  "operation_id": "getPetById",
  "parameters": {
    "petId": 123
  }
}
```

### `list_operations` - Browse Available Operations

**Purpose**: List all operations from an OpenAPI spec with optional filtering

**Parameters**:

- `docs_path`: Path to OpenAPI file or URL
- `tag` (optional): Filter by operation tag
- `method` (optional): Filter by HTTP method

**Examples**:

**List all operations**:

```json
{
  "docs_path": "./petstore.yaml"
}
```

**Filter by tag**:

```json
{
  "docs_path": "./petstore.yaml",
  "tag": "pet"
}
```

**Filter by HTTP method**:

```json
{
  "docs_path": "./petstore.yaml",
  "method": "GET"
}
```

### `describe_api` - Get Detailed Information

**Purpose**: Get comprehensive information about an API or specific operation

**Parameters**:

- `docs_path`: Path to OpenAPI file or URL
- `operation_id` (optional): Specific operation to describe

**Examples**:

**Describe entire API**:

```json
{
  "docs_path": "./petstore.yaml"
}
```

**Describe specific operation**:

```json
{
  "docs_path": "./petstore.yaml",
  "operation_id": "getPetById"
}
```

### `manage_auth` - Configure Authentication

**Purpose**: Set up authentication for API calls

**Parameters**:

- `docs_path`: Path to OpenAPI file or URL
- `auth_type`: Type of authentication
- `config`: Authentication configuration

**Authentication Types**:

**API Key Authentication**:

```json
{
  "docs_path": "./petstore.yaml",
  "auth_type": "apiKey",
  "config": {
    "headerName": "X-API-Key",
    "apiKey": "abc123xyz789"
  }
}
```

**Bearer Token**:

```json
{
  "docs_path": "./api.yaml",
  "auth_type": "bearer",
  "config": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Basic Authentication**:

```json
{
  "docs_path": "./api.yaml",
  "auth_type": "basic",
  "config": {
    "username": "john_doe",
    "password": "secret123"
  }
}
```

**OAuth2**:

```json
{
  "docs_path": "./api.yaml",
  "auth_type": "oauth2",
  "config": {
    "accessToken": "ya29.a0ARrdaM-2xQZ..."
  }
}
```

## 🔍 Common Use Cases

### 1. Exploring a New API

```bash
# Step 1: Discover the API
discover_apis

# Step 2: Get overview
describe_api docs_path="./new-api.yaml"

# Step 3: List available operations
list_operations docs_path="./new-api.yaml"

# Step 4: Try a simple operation
call_api docs_path="./new-api.yaml" operation_id="healthCheck"
```

### 2. Testing API Endpoints

```bash
# Test different endpoints
call_api docs_path="./api.yaml" operation_id="getUsers"
call_api docs_path="./api.yaml" operation_id="getUserById" parameters='{"id": 1}'
call_api docs_path="./api.yaml" operation_id="createUser" parameters='{"body": {"name": "John", "email": "john@example.com"}}'
```

### 3. Working with Multiple APIs

```bash
# Work with different APIs in the same session
call_api docs_path="./petstore.yaml" operation_id="listPets"
call_api docs_path="./users-api.json" operation_id="getUsers"
call_api docs_path="https://api.example.com/openapi.json" operation_id="getData"
```

### 4. Authenticated API Workflows

```bash
# Set up authentication
manage_auth docs_path="./secure-api.yaml" auth_type="bearer" config='{"token": "your-token"}'

# Make authenticated calls
call_api docs_path="./secure-api.yaml" operation_id="getPrivateData"
call_api docs_path="./secure-api.yaml" operation_id="updateResource" parameters='{"id": 123, "body": {"status": "updated"}}'
```

## 🐛 Troubleshooting

### OpenAPI File Not Found

- Ensure the file path is correct (relative to current directory or absolute)
- Check file extension (.yaml, .yml, .json)
- Verify the file contains valid OpenAPI specification

### Operation Not Found

```bash
# List available operations to find the correct operation_id
list_operations docs_path="./your-api.yaml"
```

### Missing Parameters

The MCP will tell you exactly which parameters are required:

```
Missing required parameters for operation 'createUser':
  - username (body)
  - email (body)
```

### Authentication Errors

- Verify the auth type matches what the API expects
- Check that credentials are valid and not expired
- Ensure the API endpoint supports the authentication method

### Network/API Errors

- Verify the base URL in the OpenAPI specification
- Check network connectivity
- Confirm the API server is running and accessible

## 🎉 Advanced Features

### Working with Remote APIs

```bash
call_api docs_path="https://petstore3.swagger.io/api/v3/openapi.json" operation_id="findPetsByStatus"
```

### Complex Parameter Structures

```bash
call_api docs_path="./api.yaml" operation_id="complexOperation" parameters='{
  "pathParam": "value1",
  "queryParam": "value2",
  "headerParam": "value3",
  "body": {
    "nested": {
      "field": "value4"
    },
    "array": ["item1", "item2"]
  }
}'
```

### File Watching

The MCP automatically detects when OpenAPI files change and updates its internal cache, so you always work with the latest specifications.

## 🚀 Tips for Best Results

1. **Start with Discovery**: Always run `discover_apis` first to see what's available
2. **Read Descriptions**: Use `describe_api` to understand operations before calling them
3. **Check Required Parameters**: The MCP will tell you exactly what's needed
4. **Set Up Auth Once**: Use `manage_auth` to configure authentication, then it's remembered for that session
5. **Use Natural Language**: You can ask "Call the user creation endpoint" instead of remembering exact operation IDs

This Universal OpenAPI MCP makes working with any API as simple as having a conversation!
