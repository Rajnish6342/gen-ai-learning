import OpenAI from "openai";
import readline from "node:readline/promises";
import fs from "fs";
import path from "path";
import { vectorStore, indexTheDocument } from "./prepare.js";

const openai = new OpenAI();

// === CONFIG ===
const HISTORY_DIR = path.resolve("./chatshistory/policy-word-rag");
if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR);

const sessionFile = path.join(
    HISTORY_DIR,
    `session-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);

// === Conversation History ===
let conversationHistory = [
    {
        role: "system",
        content: `
You are a helpful assistant specialized in Tata AIG insurance policy wordings.
Answer only based on retrieved content.
If unsure, say: "Sorry, I don’t know from the documents."
Current date: ${new Date().toISOString().split("T")[0]}
Location: India
  `,
    },
];

function saveHistory() {
    fs.writeFileSync(sessionFile, JSON.stringify(conversationHistory, null, 2));
}

// === CLI ===
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

console.log("🔎 Tata AIG Policy RAG CLI");
console.log("Type your query (type 'exit' to quit)\n");


await indexTheDocument();

while (true) {
    const query = await rl.question("You: ");
    if (query.toLowerCase() === "exit") {
        console.log("👋 Goodbye!");
        break;
    }

    // 1. Retrieve context
    const docs = await vectorStore.similaritySearch(query, 3);

    if (!docs.length) {
        console.log(`\nAssistant: Sorry, I don’t know from the documents.\n`);
        conversationHistory.push({ role: "user", content: query });
        conversationHistory.push({
            role: "assistant",
            content: "Sorry, I don’t know from the documents.",
        });
        saveHistory();
        continue;
    }

    const context = docs
        .map((d, i) => `Document ${i + 1}:\n${d.pageContent}`)
        .join("\n\n");

    // 2. Add query to history
    conversationHistory.push({ role: "user", content: query });

    // 3. System prompt (context aware)
    const systemPrompt = `
Use ONLY the following retrieved context to answer.
If answer is not in context, say: "Sorry, I don’t know from the documents."
---
${context}
---
Instructions:
- Answer concisely.
- If the question is not about Tata AIG policies, politely say you can only assist with Tata AIG policy-related queries.
- Current date: ${new Date().toISOString().split("T")[0]}
- Location: India
`;

    // 4. Call OpenAI
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0, // deterministic for RAG
        messages: [
            conversationHistory[0], // only ONE system prompt
            { role: "system", content: systemPrompt },
            ...conversationHistory.filter((m) => m.role !== "system"),
        ],
    });

    const answer = response.choices[0].message.content;
    console.log(`\nAssistant: ${answer}\n`);

    // 5. Save to history
    conversationHistory.push({ role: "assistant", content: answer });
    saveHistory();
}

rl.close();
process.exit(0);
