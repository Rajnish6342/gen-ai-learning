import { Groq } from "groq-sdk";
import { webSearchTool } from "./tools/index.js";
import { handleToolCall } from "./helpers/tool-handler.js";
import readline from "node:readline/promises";

const groq = new Groq();

export async function performWebSearch(userInput) {
    try {
        const response = await groq.chat.completions.create({
            model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
            messages: [{ role: "user", content: userInput }],
            tools: [webSearchTool],
            temperature: 0,
            tool_choice: "auto"
        });

        const message = response.choices[0].message;

        // Step 2: Handle multiple tool calls
        let toolResults = [];
        if (message.tool_calls && Array.isArray(message.tool_calls)) {
            for (const toolCall of message.tool_calls) {
                const result = await handleToolCall(toolCall, [webSearchTool]);
                toolResults.push(result);
            }
        } else {
            // Fallback for single tool call or no tool call
            const result = await handleToolCall(message, [webSearchTool]);
            if (result) toolResults.push(result);
        }

        if (toolResults.length > 0) {
            // Step 3: Reprocess all tool results with LLM
            const followUp = await groq.chat.completions.create({
                model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
                messages: [
                    { role: "system", content: "Refine the user's query based on the web search results." },
                    { role: "user", content: userInput },
                    { role: "assistant", content: "Here are the raw web search results:" },
                    ...toolResults.map(result => ({ role: "assistant", content: result })),
                    { role: "user", content: "Please refine this into a clear, final answer." }
                ],
                temperature: 0,
            });

            return followUp.choices[0].message.content;
        }

        return message.content || "No content returned.";
    } catch (error) {
        if (err.message && err.message.includes("rate limit")) {
            return "API rate limit reached. Please wait and try again later.";
        }
        return `An error occurred: ${err.message}`;
    }
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    while (true) {
        const userInput = await rl.question("Enter your web search query. Type 'exit' to quit:\n");
        if (userInput.toLowerCase() === 'exit') break;
        const result = await performWebSearch(userInput);
        console.log("Final Answer:\n", result);
    }
    rl.close();
}
main().catch(console.error);
// Example usage
// if (import.meta.url === `file://${process.argv[1]}`) {
//     const userInput = "Midcap stocks in India with good quarterly results as of August 2025";
//     performWebSearch(userInput)
//         .then(console.log)
//         .catch(console.error);
// }
