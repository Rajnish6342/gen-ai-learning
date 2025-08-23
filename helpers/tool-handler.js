// src/helpers/tool-handler.js
// Executes tool calls from a Groq message and returns the tool output.

export async function handleToolCall(message, tools) {
  if (!message?.tool_calls?.length) return null;

  const toolCall = message.tool_calls[0];
  const toolName = toolCall.function?.name;
  const toolArgsRaw = toolCall.function?.arguments || "{}";

  const tool = tools.find(t => t.function?.name === toolName);
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  let args = {};
  try {
    args = typeof toolArgsRaw === "string" ? JSON.parse(toolArgsRaw) : toolArgsRaw;
  } catch (e) {
    return { success: false, error: `Invalid tool arguments JSON: ${e.message}` };
  }

  try {
    const result = await tool.call(args);
    return result;
  } catch (e) {
    return { success: false, error: `Tool execution failed: ${e.message}` };
  }
}
