import { Groq } from "groq-sdk";
import { webSearchTool } from "./tools/index.js";
import { handleToolCall } from "./helpers/tool-handler.js";

const groq = new Groq();

export async function performWebSearch(userInput) {
    // Step 1: Ask LLM with tool support
    const response = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        messages: [{ role: "user", content: userInput }],
        tools: [webSearchTool],
        temperature: 0,
        tool_choice: "auto"
    });

    const message = response.choices[0].message;

    // Step 2: Execute the tool
    const toolResult = await handleToolCall(message, [webSearchTool]);

    if (toolResult) {
        // Step 3: Reprocess tool result with LLM
        const followUp = await groq.chat.completions.create({
            model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
            messages: [
                { role: "system", content: "You are a financial assistant. Always return concise, factual answers." },
                { role: "user", content: userInput },
                { role: "assistant", content: "Here is the raw web search result:" },
                { role: "assistant", content: toolResult },
                { role: "user", content: "Please refine this into a clear, final answer." }
            ],
            temperature: 0,
        });

        return followUp.choices[0].message.content;
    }

    return message.content || "No content returned.";
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const userInput = "Return the 24K gold price in India per 10 grams (August 2025). Do not expand or rephrase this query.";
    performWebSearch(userInput)
        .then(console.log)
        .catch(console.error);
}
