
import "dotenv/config";

import OpenAI from "openai";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// 1. OpenRouter configuration
const llm = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// 2. MCP Client
const mcpClient = new Client({
  name: "github-assistant-client",
  version: "1.0.0",
});

// 3. Connect to MCP Server
async function connectMCPServer() {
  const transport = new StreamableHTTPClientTransport(
    new URL(process.env.MCP_SERVER_URL)
  );

  await mcpClient.connect(transport);

  console.log("Connected to GitHub MCP Server!");
}

// 4. Discover MCP tools
async function getMCPTools() {
  const response = await mcpClient.listTools();

  console.log("\nAvailable MCP Tools:");

  response.tools.forEach((tool) => {
    console.log(`- ${tool.name}: ${tool.description}`);
  });

  // Convert MCP tools into OpenAI function tools
  return response.tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description || tool.name,
      parameters: tool.inputSchema,
    },
  }));
}

// 5. Ask LLM and execute tools
async function askAssistant(question, tools) {
  const messages = [
    {
      role: "system",
      content: `You are a GitHub repository assistant.
      You can analyze any public GitHub repository using the available tools.
      Use tools whenever repository information is needed.
      Never invent repository data.
      Explain results in simple language.`,
    },
    {
      role: "user",
      content: question,
    },
  ];

  // Allow multiple rounds of tool calls
  for (let round = 0; round < 5; round++) {
    const response = await llm.chat.completions.create({
      model: process.env.OPENROUTER_MODEL,
      messages,
      tools,
      tool_choice: "auto",
    });

    const assistantMessage = response.choices[0].message;

    messages.push(assistantMessage);

    // If LLM doesn't request a tool, return its answer
    if (!assistantMessage.tool_calls?.length) {
      return assistantMessage.content || "No response generated.";
    }

    // Execute each requested MCP tool
    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;

      let args;

      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        throw new Error(`Invalid arguments generated for ${toolName}`);
      }

      console.log(`\nCalling MCP Tool: ${toolName}`);
      console.log("Arguments:", args);

      const result = await mcpClient.callTool({
        name: toolName,
        arguments: args,
      });

      const toolOutput = result.isError
        ? JSON.stringify(result.content)
        : JSON.stringify(result.structuredContent ?? result.content);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolOutput,
      });
    }
  }

  return "Maximum tool-call rounds reached. Please ask a more specific question.";
}

// 6. Main application
async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing in .env");
  }

  if (!process.env.MCP_SERVER_URL) {
    throw new Error("MCP_SERVER_URL is missing in .env");
  }

  const rl = readline.createInterface({ input, output });

  try {
    await connectMCPServer();

    const tools = await getMCPTools();

    console.log("\nGitHub Assistant is ready!");
    console.log("Example: Analyze facebook/react repository");
    console.log("Type 'exit' to quit.\n");

    while (true) {
      const question = await rl.question("You: ");

      if (question.trim().toLowerCase() === "exit") {
        break;
      }

      if (!question.trim()) continue;

      try {
        const answer = await askAssistant(question, tools);
        console.log("\nAssistant:", answer, "\n");
      } catch (error) {
        console.error("\nRequest failed:", error.message);
      }
    }
  } finally {
    rl.close();
    await mcpClient.close();
  }
}

main().catch((error) => {
  console.error("Application error:", error);
  process.exitCode = 1;
});
