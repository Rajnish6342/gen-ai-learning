import { Groq } from "groq-sdk";
import { googleCalendarTool } from "./tools/google-calendar.js";

const groq = new Groq();

export async function createGoogleCalendarEvent(userInput) {
  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    messages: [{ role: "user", content: userInput }],
    tools: [googleCalendarTool],
    temperature: 0,
  });

  const message = response.choices[0].message;

  // Handle tool call
  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolCall = message.tool_calls[0];
    if (toolCall.function.name === "create_google_calendar_event") {
      const args = JSON.parse(toolCall.function.arguments);

      // Here’s where you’d call Google Calendar API
      return `✅ Event '${args.title}' from ${args.start_time} to ${args.end_time} (${args.timezone || "UTC"}) with participants: ${
        args.participants?.length ? args.participants.join(", ") : "None"
      }`;
    }
  }
  return message.content || "No event created.";
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const userInput = "Schedule a meeting titled 'Project Sync' on 2025-08-24 from 10:00 to 11:00 UTC with abc@gmail.com";
  createGoogleCalendarEvent(userInput).then(console.log).catch(console.error);
}