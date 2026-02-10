import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

/**
 * GitHub repository permissions structure.
 */
interface GitHubPermissions {
  admin: boolean;
  maintain?: boolean;
  push: boolean;
  triage?: boolean;
  pull: boolean;
}

/**
 * GitHub repository response (partial).
 */
interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  permissions?: GitHubPermissions;
  owner: {
    login: string;
    type: string;
  };
  default_branch: string;
}

/**
 * GitHub error response.
 */
interface GitHubErrorResponse {
  message: string;
  documentation_url?: string;
}

/**
 * Verify access response structure.
 */
interface VerifyAccessResponse {
  hasAccess: boolean;
  repository?: {
    fullName: string;
    private: boolean;
    owner: string;
    defaultBranch: string;
  };
  permissions?: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
  error?: string;
}

/**
 * POST /api/github/verify-access
 *
 * Verifies if the configured GitHub token (GITHUB_TOKEN env var) has access
 * to a given repository and returns permissions.
 *
 * Request body:
 * - repository: Repository in "owner/repo" format
 *
 * Response:
 * - hasAccess: boolean indicating if the token can access the repo
 * - repository: basic repo info if accessible
 * - permissions: object with admin, maintain, push, triage, pull booleans
 * - error: error message if access denied or invalid
 */
export async function POST(request: NextRequest) {
  try {
    // Check if GitHub token is configured
    const token = env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          hasAccess: false,
          error: "GitHub token is not configured on the server (GITHUB_TOKEN)",
        } satisfies VerifyAccessResponse,
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      repository?: unknown;
    };

    const { repository } = body;

    // Validate repository input
    if (
      !repository ||
      typeof repository !== "string" ||
      repository.trim() === ""
    ) {
      return NextResponse.json(
        {
          hasAccess: false,
          error: "Repository is required (format: owner/repo)",
        } satisfies VerifyAccessResponse,
        { status: 400 },
      );
    }

    // Validate repository format
    const repoPattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
    if (!repoPattern.test(repository.trim())) {
      return NextResponse.json(
        {
          hasAccess: false,
          error: "Invalid repository format. Use 'owner/repo' format.",
        } satisfies VerifyAccessResponse,
        { status: 400 },
      );
    }

    const [owner, repo] = repository.trim().split("/");

    // Call GitHub API to get repository info
    const githubResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "OpenCode-GitHub-Verifier",
        },
      },
    );

    // Handle GitHub API response
    if (!githubResponse.ok) {
      const errorData = (await githubResponse.json()) as GitHubErrorResponse;

      if (githubResponse.status === 401) {
        return NextResponse.json(
          {
            hasAccess: false,
            error: "Invalid or expired GitHub token configured on server",
          } satisfies VerifyAccessResponse,
          { status: 200 },
        );
      }

      if (githubResponse.status === 403) {
        // Could be rate limited or token doesn't have required scopes
        return NextResponse.json(
          {
            hasAccess: false,
            error: errorData.message || "Access forbidden. Check token scopes.",
          } satisfies VerifyAccessResponse,
          { status: 200 },
        );
      }

      if (githubResponse.status === 404) {
        // Repo doesn't exist or token doesn't have access
        return NextResponse.json(
          {
            hasAccess: false,
            error:
              "Repository not found or token does not have access to this repository",
          } satisfies VerifyAccessResponse,
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          hasAccess: false,
          error:
            errorData.message || `GitHub API error: ${githubResponse.status}`,
        } satisfies VerifyAccessResponse,
        { status: 200 },
      );
    }

    const repoData = (await githubResponse.json()) as GitHubRepoResponse;

    // Build permissions object with defaults for missing fields
    const permissions = repoData.permissions ?? {
      admin: false,
      push: false,
      pull: true,
    };

    return NextResponse.json(
      {
        hasAccess: true,
        repository: {
          fullName: repoData.full_name,
          private: repoData.private,
          owner: repoData.owner.login,
          defaultBranch: repoData.default_branch,
        },
        permissions: {
          admin: permissions.admin,
          maintain: permissions.maintain ?? false,
          push: permissions.push,
          triage: permissions.triage ?? false,
          pull: permissions.pull,
        },
      } satisfies VerifyAccessResponse,
      { status: 200 },
    );
  } catch (error) {
    console.error("[api/github/verify-access] Error:", error);

    return NextResponse.json(
      {
        hasAccess: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } satisfies VerifyAccessResponse,
      { status: 500 },
    );
  }
}
