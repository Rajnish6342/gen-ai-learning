import { Groq } from "groq-sdk";
import { webSearchTool } from "./tools/web-search.js";

const groq = new Groq();

export async function performWebSearch(userInput) {
  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    messages: [{ role: "user", content: userInput }],
    tools: [webSearchTool],
    temperature: 0,
  });

  const message = response.choices[0].message;
  // Check if a tool call was made
  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolCall = message.tool_calls[0];

    if (toolCall.function.name === "web-search") {
      const args = JSON.parse(toolCall.function.arguments);

      console.log(
        `🔍 Running web-search for query: "${args.query}" (top ${
          args.numResults || 3
        } results)`
      );

      // ✅ Execute the tool
      const toolOutput = await webSearchTool.call(args);

      return toolOutput;
    }
  }

  return message.content || "No search performed.";
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
const userInput = "Return the 24K gold price in India per 10 grams (August 2025). Do not expand or rephrase this query.";
  performWebSearch(userInput)
    .then(console.log)
    .catch(console.error);
}
