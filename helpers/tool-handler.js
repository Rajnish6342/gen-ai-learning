export async function handleToolCall(message, tools) {
  if (!message?.tool_calls?.length) return null;

  const results = [];

  for (const toolCall of message.tool_calls) {
    const toolName = toolCall.function?.name || toolCall.name;
    const toolArgsRaw = toolCall.function?.arguments || toolCall.arguments || "{}";

    const tool = tools.find(t => t.function?.name === toolName || t.name === toolName);
    if (!tool) {
      results.push({ success: false, error: `Unknown tool: ${toolName}` });
      continue;
    }

    let args = {};
    try {
      args = typeof toolArgsRaw === "string" ? JSON.parse(toolArgsRaw) : toolArgsRaw;
    } catch (e) {
      results.push({ success: false, error: `Invalid tool arguments JSON: ${e.message}` });
      continue;
    }

    try {
      const result = await tool.call(args);
      results.push({ success: true, tool: toolName, data: result });
    } catch (e) {
      results.push({ success: false, tool: toolName, error: `Tool execution failed: ${e.message}` });
    }
  }

  return results;
}
