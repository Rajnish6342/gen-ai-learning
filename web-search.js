import { Groq } from "groq-sdk";
import { webSearchTool } from "./tools/index.js";
import { handleToolCall } from "./helpers/tool-handler.js";
import readline from "node:readline/promises";
import fs from "fs";
import path from "path";

const groq = new Groq();
const HISTORY_DIR = path.resolve("./chatshistory");

// Ensure chatshistory folder exists
if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR);
}

// Pick a session file
const sessionFile = path.join(
    HISTORY_DIR,
    `session-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);

// Load all chat history files
function loadAllHistories() {
    try {
        const files = fs.readdirSync(HISTORY_DIR)
            .filter(file => file.endsWith(".json"))
            .map(file => path.join(HISTORY_DIR, file));

        if (files.length === 0) return [
            {
                role: "system",
                content: `
                    You are an assistant that ALWAYS checks the latest information using web search when the user asks a factual or time-sensitive question.
                    - You MUST call the "web-search" if the answer may be outdated, incomplete, or requires up-to-date info.
                    - If the user query can be answered from memory or previous conversation, you may use memory.
                    - When calling the tool, return the data in a structured way so it can be used for refinement.
                    - ALWAYS clarify if the information is from memory vs web search.
                    `
            }
        ];

        const histories = files.map(file => {
            try {
                const content = fs.readFileSync(file, "utf-8");
                return JSON.parse(content);
            } catch (err) {
                console.error(`Failed to read/parse ${file}:`, err.message);
                return [];
            }
        });
        return histories.flat();
    } catch (err) {
        console.error("Error loading histories:", err.message);
        return [];
    }
}

// Load existing history if resuming
let conversationHistory = loadAllHistories();

function saveHistory() {
    fs.writeFileSync(sessionFile, JSON.stringify(conversationHistory, null, 2));
}

export async function performWebSearch(userInput) {
    try {
        // Add user input to memory
        conversationHistory.push({ role: "user", content: userInput });

        const response = await groq.chat.completions.create({
            model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
            messages: conversationHistory,
            tools: [webSearchTool],
            temperature: 0,
            tool_choice: "auto"
        });

        const message = response.choices[0].message;

        // Step 2: Handle tool calls
        let toolResults = [];
        if (message.tool_calls && Array.isArray(message.tool_calls)) {
            for (const toolCall of message.tool_calls) {
                const result = await handleToolCall(toolCall, [webSearchTool]);
                toolResults.push(result);
            }
        }
        let finalAnswer;
        if (toolResults.length > 0) {
            const followUp = await groq.chat.completions.create({
                model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
                messages: [
                    ...conversationHistory,
                    { role: "assistant", content: "Here are the raw web search results:" },
                    ...toolResults.map(result => ({ role: "assistant", content: result })),
                    { role: "user", content: "Please refine this into a clear, final answer." }
                ],
                temperature: 0
            });

            finalAnswer = followUp.choices[0].message.content;
        } else {
            finalAnswer = message.content || "No content returned.";
        }

        // Save assistant reply
        conversationHistory.push({ role: "assistant", content: finalAnswer });

        saveHistory();

        return finalAnswer;
    } catch (err) {
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
        if (userInput.toLowerCase() === "exit") break;

        const result = await performWebSearch(userInput);
        console.log("Final Answer:\n", result);
    }

    rl.close();
}

main().catch(console.error);
