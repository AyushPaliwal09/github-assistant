
import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from
  "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from
  "@modelcontextprotocol/sdk/server/express.js";
import { z } from "zod";

const PORT = Number(process.env.PORT || 3000);
const GITHUB_API = "https://api.github.com";

async function githubGet(path, params = {}) {
  const url = new URL(`${GITHUB_API}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-repository-assistant",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `GitHub API ${response.status}: ${
        data.message || response.statusText
      }`
    );
  }

  return data;
}

function registerTool(server, name, description, inputSchema, handler) {
  server.registerTool(name, {
    description,
    inputSchema,
  }, async (args) => {
    try {
      const result = await handler(args);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: error.message,
        }],
      };
    }
  });
}

function createGitHubMcpServer() {
  const server = new McpServer({
    name: "github-repository-assistant",
    version: "1.0.0",
  });

  // 1. Repository details
  registerTool(
    server,
    "get_repository",
    "Get details and statistics for a public GitHub repository.",
    {
      owner: z.string().min(1).describe("Repository owner"),
      repo: z.string().min(1).describe("Repository name"),
    },
    async ({ owner, repo }) => {
      const data = await githubGet(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
      );

      return {
        name: data.full_name,
        description: data.description,
        url: data.html_url,
        language: data.language,
        stars: data.stargazers_count,
        forks: data.forks_count,
        open_issues: data.open_issues_count,
        default_branch: data.default_branch,
        created_at: data.created_at,
        updated_at: data.updated_at,
        license: data.license?.spdx_id ?? null,
      };
    }
  );

  // 2. Issues
  registerTool(
    server,
    "list_issues",
    "List issues in a public repository. Pull requests are excluded.",
    {
      owner: z.string().min(1),
      repo: z.string().min(1),
      state: z.enum(["open", "closed", "all"]).default("open"),
      per_page: z.number().int().min(1).max(30).default(10),
    },
    async ({ owner, repo, state, per_page }) => {
      const data = await githubGet(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
        { state, per_page, sort: "updated", direction: "desc" }
      );

      return data
        .filter((item) => !item.pull_request)
        .map((item) => ({
          number: item.number,
          title: item.title,
          state: item.state,
          author: item.user?.login,
          url: item.html_url,
          created_at: item.created_at,
          updated_at: item.updated_at,
          labels: item.labels?.map((label) => label.name) ?? [],
        }));
    }
  );

  // 3. Pull requests
  registerTool(
    server,
    "list_pull_requests",
    "List pull requests for a public repository.",
    {
      owner: z.string().min(1),
      repo: z.string().min(1),
      state: z.enum(["open", "closed", "all"]).default("open"),
      per_page: z.number().int().min(1).max(30).default(10),
    },
    async ({ owner, repo, state, per_page }) => {
      const data = await githubGet(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
        { state, per_page, sort: "updated", direction: "desc" }
      );

      return data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user?.login,
        url: pr.html_url,
        draft: pr.draft,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
      }));
    }
  );

  // 4. Recent commits
  registerTool(
    server,
    "list_commits",
    "List recent commits in a public repository.",
    {
      owner: z.string().min(1),
      repo: z.string().min(1),
      per_page: z.number().int().min(1).max(30).default(10),
    },
    async ({ owner, repo, per_page }) => {
      const data = await githubGet(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`,
        { per_page }
      );

      return data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.author?.login ?? commit.commit.author?.name,
        date: commit.commit.author?.date,
        url: commit.html_url,
      }));
    }
  );

  // 5. Search public repositories
  registerTool(
    server,
    "search_repositories",
    "Search public GitHub repositories by keywords.",
    {
      query: z.string().min(1).describe("Search query"),
      per_page: z.number().int().min(1).max(30).default(10),
    },
    async ({ query, per_page }) => {
      const data = await githubGet("/search/repositories", {
        q: query,
        per_page,
        sort: "stars",
        order: "desc",
      });

      return {
        total_count: data.total_count,
        items: data.items.map((repo) => ({
          full_name: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
        })),
      };
    }
  );

  // 6. Search code
  registerTool(
    server,
    "search_code",
    "Search code in public GitHub repositories. Include repo:owner/name in the query to limit the search.",
    {
      query: z.string().min(1).describe(
        'GitHub code search query, e.g. "useState repo:facebook/react"'
      ),
      per_page: z.number().int().min(1).max(30).default(10),
    },
    async ({ query, per_page }) => {
      const data = await githubGet("/search/code", {
        q: query,
        per_page,
      });

      return {
        total_count: data.total_count,
        items: data.items.map((item) => ({
          name: item.name,
          path: item.path,
          repository: item.repository?.full_name,
          url: item.html_url,
        })),
      };
    }
  );

  return server;
}

const app = createMcpExpressApp({ host: "127.0.0.1" });

app.post("/mcp", async (req, res) => {
  const server = createGitHubMcpServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request error:", error);

    if (!res.headersSent) {
      res.status(500).json({ error: "MCP request failed" });
    }
  } finally {
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  }
});

app.get("/mcp", (_req, res) => {
  res.status(405).send("GET is not enabled for this stateless server.");
});

app.delete("/mcp", (_req, res) => {
  res.status(405).send("This server does not use sessions.");
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`GitHub MCP server running at http://127.0.0.1:${PORT}/mcp`);
});
