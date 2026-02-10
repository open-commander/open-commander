# Open Commander API

Use this API to delegate tasks to Open Commander agents and manage integrations.

## Authentication

All requests require a Bearer token in the `Authorization` header:

```
Authorization: Bearer oc_sk_your_api_key_here
```

API keys can be created in Settings > API Clients.

## Base URL

```
https://your-commander-instance.com/api
```

---

## Tasks Endpoints

### List Tasks

```http
GET /api/tasks
```

**Query Parameters:**

| Parameter | Type   | Description                                      |
|-----------|--------|--------------------------------------------------|
| status    | string | Filter by status: `todo`, `doing`, `done`, `canceled` |
| limit     | number | Max results (default: 50, max: 100)              |
| offset    | number | Pagination offset (default: 0)                   |

**Response:**

```json
{
  "tasks": [
    {
      "id": "clx123...",
      "body": "Task description",
      "status": "todo",
      "agentId": "claude",
      "mountPoint": "projects/my-app",
      "attachments": [],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "latestExecution": {
        "id": "clx456...",
        "status": "completed",
        "result": "Task completed successfully",
        "errorMessage": null,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "finishedAt": "2024-01-01T00:01:00.000Z"
      }
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### Create Task

```http
POST /api/tasks
Content-Type: application/json
```

**Request Body:**

| Field      | Type   | Required | Description                                    |
|------------|--------|----------|------------------------------------------------|
| body       | string | Yes      | Task description/instructions for the agent    |
| agentId    | string | No       | Agent to assign: `opencode`, `claude`, `codex`, `cursor` |
| mountPoint | string | No       | Relative path within workspace to mount as `/workspace` |

**Example Request:**

```json
{
  "body": "Create a new React component called UserProfile that displays user avatar, name, and bio. Use Tailwind CSS for styling.",
  "agentId": "claude",
  "mountPoint": "projects/my-app"
}
```

**Response (201 Created):**

When `agentId` is provided, the task starts executing immediately (status: `doing`) and an execution is created:

```json
{
  "task": {
    "id": "clx789...",
    "body": "Create a new React component...",
    "status": "doing",
    "agentId": "claude",
    "mountPoint": "projects/my-app",
    "attachments": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "execution": {
    "id": "clx456...",
    "status": "pending"
  }
}
```

When `agentId` is not provided, the task is created with status `todo` and no execution:

```json
{
  "task": {
    "id": "clx789...",
    "body": "Create a new React component...",
    "status": "todo",
    "agentId": null,
    "mountPoint": null,
    "attachments": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "execution": null
}
```

---

### Get Task by ID

```http
GET /api/tasks/:id
```

**Path Parameters:**

| Parameter | Type   | Description     |
|-----------|--------|-----------------|
| id        | string | The task ID     |

**Response:**

```json
{
  "task": {
    "id": "clx789...",
    "body": "Create a new React component...",
    "status": "done",
    "agentId": "claude",
    "mountPoint": "projects/my-app",
    "attachments": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:05:00.000Z",
    "latestExecution": {
      "id": "clx456...",
      "status": "completed",
      "agentId": "claude",
      "jobId": "clx456...",
      "containerName": "oc-task-clx456",
      "completed": true,
      "needsInput": false,
      "inputRequest": null,
      "result": "Created UserProfile component at src/components/UserProfile.tsx",
      "errorMessage": null,
      "logs": "...",
      "startedAt": "2024-01-01T00:01:00.000Z",
      "finishedAt": "2024-01-01T00:05:00.000Z",
      "createdAt": "2024-01-01T00:00:30.000Z",
      "updatedAt": "2024-01-01T00:05:00.000Z"
    },
    "executions": [
      { "..." }
    ]
  }
}
```

**Error Response (404 Not Found):**

```json
{ "error": "Task not found" }
```

---

## Task Statuses

| Status    | Description                          |
|-----------|--------------------------------------|
| todo      | Task is queued, waiting to be run    |
| doing     | Task is currently being executed     |
| done      | Task completed successfully          |
| canceled  | Task was canceled                    |

## Execution Statuses

| Status      | Description                              |
|-------------|------------------------------------------|
| pending     | Execution queued in BullMQ               |
| running     | Agent container is running               |
| completed   | Execution finished successfully          |
| failed      | Execution failed with error              |
| needs_input | Agent needs user input to continue       |

---

## Error Responses

**401 Unauthorized:**

```json
{ "error": "Missing or invalid Authorization header" }
```

```json
{ "error": "Invalid API key" }
```

**400 Bad Request:**

```json
{ "error": "Task body is required" }
```

```json
{ "error": "Invalid agentId. Must be one of: opencode, claude, codex, cursor" }
```

**404 Not Found:**

```json
{ "error": "Task not found" }
```

**500 Internal Server Error:**

```json
{ "error": "Internal server error" }
```

---

## Example: Delegating a Task (curl)

```bash
curl -X POST https://commander.example.com/api/tasks \
  -H "Authorization: Bearer oc_sk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Fix the login bug in src/auth/login.ts - users are getting logged out after 5 minutes",
    "agentId": "claude",
    "mountPoint": "my-project"
  }'
```

## Example: Get Task by ID

```bash
curl https://commander.example.com/api/tasks/clx789abc123 \
  -H "Authorization: Bearer oc_sk_your_api_key"
```

## Example: Polling for Task Completion

```bash
# List tasks that are currently running
curl https://commander.example.com/api/tasks?status=doing \
  -H "Authorization: Bearer oc_sk_your_api_key"

# Check specific task status
curl https://commander.example.com/api/tasks/clx789abc123 \
  -H "Authorization: Bearer oc_sk_your_api_key"
```

---

# GitHub Integration

## Verify Repository Access

Use this endpoint to verify if the server's configured GitHub token (`GITHUB_TOKEN` environment variable) has access to a repository and retrieve the associated permissions. This is useful for validating repository access before delegating tasks.

> **Note:** This endpoint uses the GitHub token configured on the Open Commander server via the `GITHUB_TOKEN` environment variable. No token is passed in the request.

```http
POST /api/github/verify-access
Content-Type: application/json
```

**Request Body:**

| Field      | Type   | Required | Description                       |
|------------|--------|----------|-----------------------------------|
| repository | string | Yes      | Repository in `owner/repo` format |

**Example Request:**

```bash
curl -X POST https://commander.example.com/api/github/verify-access \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "octocat/hello-world"
  }'
```

**Success Response (200 OK):**

When the server's token has access to the repository:

```json
{
  "hasAccess": true,
  "repository": {
    "fullName": "octocat/hello-world",
    "private": false,
    "owner": "octocat",
    "defaultBranch": "main"
  },
  "permissions": {
    "admin": false,
    "maintain": false,
    "push": true,
    "triage": false,
    "pull": true
  }
}
```

**No Access Response (200 OK):**

When the token does not have access or the repository doesn't exist:

```json
{
  "hasAccess": false,
  "error": "Repository not found or token does not have access to this repository"
}
```

**Token Not Configured (500 Internal Server Error):**

```json
{
  "hasAccess": false,
  "error": "GitHub token is not configured on the server (GITHUB_TOKEN)"
}
```

**Invalid Server Token (200 OK):**

```json
{
  "hasAccess": false,
  "error": "Invalid or expired GitHub token configured on server"
}
```

**Validation Error (400 Bad Request):**

```json
{
  "hasAccess": false,
  "error": "Repository is required (format: owner/repo)"
}
```

```json
{
  "hasAccess": false,
  "error": "Invalid repository format. Use 'owner/repo' format."
}
```

---

## GitHub Permissions Reference

| Permission | Description                                           |
|------------|-------------------------------------------------------|
| admin      | Full administrative access (settings, webhooks, etc.) |
| maintain   | Manage repository without admin access                |
| push       | Write access (push commits, merge PRs)                |
| triage     | Manage issues and PRs without write access            |
| pull       | Read access (clone, fetch, view code)                 |

---

## Example: Validate Access Before Creating Task

Before delegating a task that requires repository access, validate that the server has access:

```bash
# 1. First, verify the server's token has access to the repo
ACCESS=$(curl -s -X POST https://commander.example.com/api/github/verify-access \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "my-org/my-repo"
  }')

# 2. Check if we have push access
HAS_PUSH=$(echo "$ACCESS" | jq -r '.permissions.push // false')

if [ "$HAS_PUSH" = "true" ]; then
  # 3. Create the task with confidence
  curl -X POST https://commander.example.com/api/tasks \
    -H "Authorization: Bearer oc_sk_your_api_key" \
    -H "Content-Type: application/json" \
    -d '{
      "body": "Fix the bug in src/main.ts and push the changes",
      "agentId": "claude",
      "mountPoint": "my-repo"
    }'
else
  echo "Server does not have push access to the repository"
fi
```
