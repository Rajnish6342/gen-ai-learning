import { Groq } from "groq-sdk";
import { googleCalendarTool } from "../tools/google-calendar.js";
import { handleToolCall } from "../helpers/tool-handler.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// In-memory session store (swap with Redis/DB for production)
const sessions = new Map();

/** Get or create a session state */
function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      stage: "idle",       // idle | drafting | confirming | done
      draft: null,         // { title, start, end, attendees[], description?, timezone? }
      lastToolResult: null
    });
  }
  return sessions.get(sessionId);
}

/** Render a friendly summary of the draft */
function summarizeDraft(draft) {
  const attendees = draft.attendees?.length ? draft.attendees.join(", ") : "None";
  return [
    `• Title: ${draft.title}`,
    `• Start: ${draft.start}`,
    `• End: ${draft.end}`,
    `• Attendees: ${attendees}`,
    draft.description ? `• Description: ${draft.description}` : null,
    draft.timezone ? `• Timezone: ${draft.timezone}` : null
  ].filter(Boolean).join("\n");
}

/** Detect simple yes/no for confirmation */
function isAffirmative(text) {
  return /^(y|yes|yeah|yup|ok|okay|confirm|create|do it)\b/i.test(text.trim());
}
function isNegative(text) {
  return /^(n|no|nah|cancel|stop|abort)\b/i.test(text.trim());
}

/** Extract initial intent to JSON draft */
async function extractDraftFromInput(userInput) {
  const res = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content:
          "Extract calendar event details as strict JSON with keys: title (string), start (ISO 8601), end (ISO 8601), attendees (array of emails), description (string, optional), timezone (string, optional). Return ONLY JSON."
      },
      { role: "user", content: userInput }
    ],
    temperature: 0
  });

  const raw = res.choices[0].message.content?.trim() || "{}";
  return JSON.parse(raw);
}

/** Apply user edit to existing draft */
async function applyEditToDraft(draft, userInput) {
  const res = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content:
          `You are updating an existing event JSON. Current JSON:\n` +
          `${JSON.stringify(draft)}\n\n` +
          `Apply the user's requested changes and return the UPDATED JSON ONLY with the same keys.`
      },
      { role: "user", content: userInput }
    ],
    temperature: 0
  });

  const raw = res.choices[0].message.content?.trim() || "{}";
  return JSON.parse(raw);
}

/** Validate draft required fields */
function validateDraft(d) {
  const missing = [];
  if (!d?.title) missing.push("title");
  if (!d?.start) missing.push("start");
  if (!d?.end) missing.push("end");
  return missing;
}

/** Main multi-turn handler */
export async function handleCalendarConversation(sessionId, userInput) {
  const state = getSession(sessionId);

  // 1) First turn → create initial draft
  if (state.stage === "idle") {
    const draft = await extractDraftFromInput(userInput);
    const missing = validateDraft(draft);
    state.draft = draft;
    state.stage = "drafting";

    if (missing.length) {
      return `I started a draft but need more info: ${missing.join(", ")}.\n\nCurrent draft:\n${summarizeDraft(draft)}\n\nPlease provide the missing details.`;
    }

    state.stage = "confirming";
    return `Here’s the draft event:\n${summarizeDraft(draft)}\n\nShall I create this? (yes/no or specify changes)`;
  }

  // 2) If confirming, check yes/no or apply edits
  if (state.stage === "confirming") {
    if (isAffirmative(userInput)) {
      // Execute tool
      const toolCallMessage = {
        tool_calls: [
          {
            function: {
              name: googleCalendarTool.function.name,
              arguments: JSON.stringify(state.draft)
            }
          }
        ]
      };
      const toolResult = await handleToolCall(toolCallMessage, [googleCalendarTool]);
      state.lastToolResult = toolResult;

      if (!toolResult?.success) {
        state.stage = "drafting";
        return `❌ Failed to create event: ${toolResult?.error || "Unknown error"}\n\nYou can adjust the draft or try again.`;
      }

      state.stage = "done";
      const evt = toolResult.event;
      return `✅ Event created!\n\n${summarizeDraft(state.draft)}\n\nLink: ${evt.htmlLink}`;
    }

    if (isNegative(userInput)) {
      state.stage = "drafting";
      return `Okay, not creating it yet.\nCurrent draft:\n${summarizeDraft(state.draft)}\n\nTell me what to change, or say "create" to proceed.`;
    }

    // Apply natural language edits
    const updated = await applyEditToDraft(state.draft, userInput);
    const missing = validateDraft(updated);
    state.draft = updated;

    if (missing.length) {
      state.stage = "drafting";
      return `Updated the draft, but still missing: ${missing.join(", ")}.\n\nCurrent draft:\n${summarizeDraft(updated)}\n\nProvide the missing details or say "cancel".`;
    }

    state.stage = "confirming";
    return `Updated draft:\n${summarizeDraft(updated)}\n\nCreate this? (yes/no or more changes)`;
  }

  // 3) If drafting (we needed missing info), try to apply edits & move to confirming
  if (state.stage === "drafting") {
    if (isNegative(userInput)) {
      return `Cancelled. Nothing was created.`;
    }

    const updated = await applyEditToDraft(state.draft || {}, userInput);
    const missing = validateDraft(updated);
    state.draft = updated;

    if (missing.length) {
      return `Got it. Still missing: ${missing.join(", ")}.\n\nCurrent draft:\n${summarizeDraft(updated)}\n\nPlease provide details.`;
    }

    state.stage = "confirming";
    return `Great — draft is complete:\n${summarizeDraft(updated)}\n\nCreate this? (yes/no or more changes)`;
  }

  // 4) Done
  if (state.stage === "done") {
    return `Event already created. Say "start new" to begin another.`;
  }

  return `I’m not sure what to do. Say "start new" to begin a new event.`;
}

/** Optional utility to reset a session */
export function resetSession(sessionId) {
  sessions.delete(sessionId);
}
