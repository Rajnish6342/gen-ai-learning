// src/index.js
// Example: simulate a small conversation in one run.

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { handleCalendarConversation, resetSession } from "./src/agent.js";

const sessionId = "demo-user-1";

async function demo() {
  const rl = readline.createInterface({ input, output });

  console.log("🤖 Calendar Assistant (multi-turn). Type 'exit' to quit, 'start new' to reset.\n");

  while (true) {
    const user = await rl.question("You: ");
    if (user.trim().toLowerCase() === "exit") break;

    if (user.trim().toLowerCase() === "start new") {
      resetSession(sessionId);
      console.log("Assistant: Started a new session.");
      continue;
    }

    try {
      const reply = await handleCalendarConversation(sessionId, user);
      console.log("Assistant:", reply);
    } catch (e) {
      console.error("Assistant: Sorry, I hit an error:", e.message);
    }
  }

  rl.close();
}

// Example startup message
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Tip: try this:\n“Schedule a meeting titled 'Project Sync' on 2025-08-24 from 10:00 to 11:00 UTC with abc@gmail.com”");
  demo();
}
