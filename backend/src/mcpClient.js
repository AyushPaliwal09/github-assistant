
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const mcpClient = new Client({
  name: "github-assistant-client",
  version: "1.0.0",
});

let availableTools = [];

export async function connectMCP() {
  const transport = new StreamableHTTPClientTransport(
    new URL(process.env.MCP_SERVER_URL)
  );

  await mcpClient.connect(transport);

  const response = await mcpClient.listTools();

  availableTools = response.tools;

  console.log("Connected to GitHub MCP Server!");
  console.log("Available tools:", availableTools.map(t => t.name));

  return availableTools;
}

export function getOpenAITools() {
  return availableTools.map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description || tool.name,
      parameters: tool.inputSchema,
    },
  }));
}

export async function executeMCPTool(name, args) {
  const result = await mcpClient.callTool({
    name,
    arguments: args,
  });

  if (result.isError) {
    throw new Error(JSON.stringify(result.content));
  }

  return result.structuredContent ?? result.content;
}
