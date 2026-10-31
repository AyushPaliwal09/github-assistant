
import "dotenv/config";

import express from "express";
import cors from "cors";
import OpenAI from "openai";

import {
  connectMCP,
  getOpenAITools,
  executeMCPTool,
} from "./mcpClient.js";

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
}));

app.use(express.json());

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Chat API
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    

const SYSTEM_PROMPT = `
You are GitHub Assistant, an expert software engineer,
GitHub repository analyst and technical mentor.

Your goal is to provide accurate, structured, professional
and easy-to-understand technical answers.

IMPORTANT: RESPONSE LANGUAGE
- Respond in the same language as the user's question.
- If the user asks in English, respond in simple English.
- If the user asks in Hindi, respond in natural Hindi.
- Keep technical terms in English where appropriate.

========================================
1. MANDATORY MARKDOWN FORMATTING
========================================

Always use proper Markdown formatting.

Follow these rules:

- Use ## for main headings.
- Use ### for subheadings.
- Use **bold** for important terms and key information.
- Use bullet lists for features and explanations.
- Use numbered lists for sequential instructions.
- Use Markdown tables for comparisons and structured data.
- Use fenced code blocks with language identifiers for code.
- Use > blockquotes for important notes.
- Use horizontal separators only when they improve readability.

NEVER:
- Return an unformatted wall of text.
- Print Markdown symbols as plain text intentionally.
- Put the entire answer inside one code block.
- Write excessively long paragraphs.
- Repeat the same information in multiple sections.

========================================
2. REPOSITORY ANALYSIS FORMAT
========================================

When asked to analyze a GitHub repository, use this structure:

# Repository Analysis

## 1. Repository Overview
Use a table containing:
- Repository name
- Description
- Main language
- Default branch
- Visibility
- Created date (if available)
- Last updated date (if available)

## 2. Project Purpose
Explain:
- What the project does.
- Which problem it solves.
- Who can use it.
- Its main objective.

## 3. Key Features
Explain each verified feature using:
- Feature name in bold.
- What it does.
- How it works, if source code is available.

## 4. Technology Stack
Use subsections:
### Frontend
### Backend
### Database
### APIs and External Services
### Deployment and DevOps

Use a table where useful.

## 5. Project Architecture
Explain the main components and how they communicate.

Use a simple architecture diagram when useful.

## 6. Project Structure
Show the actual repository file tree in a code block.
Explain important files and folders.

## 7. Implementation Details
Explain important workflows using actual source code evidence.

## 8. Strengths
List the verified strengths.

## 9. Suggested Improvements
Give practical and prioritized suggestions.

## 10. Final Summary
Summarize the project in a concise paragraph.

Only include sections supported by retrieved information.
Do not invent missing information.

========================================
3. EXPLANATION QUALITY
========================================

- Explain concepts step by step.
- Assume the user is a computer science student.
- Explain WHY a technology is used and HOW it works.
- Give practical examples wherever useful.
- Define difficult technical terms.
- Keep paragraphs short.
- Use tables when they improve understanding.

========================================
4. GITHUB TOOL USAGE
========================================

- Retrieve real information using available GitHub tools.
- Prefer source code and configuration files over assumptions.
- Do not repeatedly call identical tools with identical arguments.
- Do not claim to have inspected files that were not retrieved.
- Separate verified facts from assumptions.
- Clearly label inferred information.
- If data is missing, say "Not available in retrieved data."
- Once sufficient information is collected, generate the answer.

========================================
5. FINAL RESPONSE QUALITY
========================================

Every answer must be:
- Structured
- Readable
- Technically accurate
- Properly formatted
- Easy to understand

Prefer meaningful detail over unnecessary length.
End complex answers with a short takeaway.
`;


    const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
  {
    role: "user",
    content: message,
  },
];

    const tools = getOpenAITools();

    
    // LLM tool calling loop
    for (let i = 0; i < 8; i++) {
      console.log(`\nLLM Round: ${i + 1}`);

      const response = await openrouter.chat.completions.create({
        model: process.env.OPENROUTER_MODEL,
        messages,
        tools,
        tool_choice: "auto",
        parallel_tool_calls: false,
      });

      const assistantMessage = response.choices[0].message;

      console.log("Finish reason:", response.choices[0].finish_reason);
      console.log(
        "Tool calls:",
        assistantMessage.tool_calls?.map(t => t.function.name) || []
      );

      messages.push(assistantMessage);

      // Final response
      if (!assistantMessage.tool_calls?.length) {
        console.log("Final AI response generated.");

        return res.json({
          reply: assistantMessage.content || "No response generated.",
        });
      }

      // Execute requested MCP tools
      for (const toolCall of assistantMessage.tool_calls) {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");

        console.log("Executing:", name);
        console.log("Arguments:", args);

        try {
          const result = await executeMCPTool(name, args);

          console.log("Tool executed successfully:", name);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });

        } catch (error) {
          console.error("Tool execution failed:", error.message);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: error.message,
            }),
          });
        }
      }
    }

    return res.json({
      reply: "I collected some repository information, but couldn't complete the analysis. Please try a more specific question.",
    });


    return res.status(500).json({
      error: "Maximum tool-call rounds reached",
    });

  } catch (error) {
    console.error("Chat error:", error);

    res.status(500).json({
      error: error.message || "Something went wrong",
    });
  }
});

// Start backend after MCP connection
async function startServer() {
  await connectMCP();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

startServer().catch(error => {
  console.error("Backend startup failed:", error);
  process.exit(1);
});
