export const googleCalendarTool = {
  type: "function",
  function: {
    name: "create_google_calendar_event",
    description: "Creates a Google Calendar event.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the event" },
        start: { type: "string", description: "Start time ISO 8601 (e.g., 2025-08-24T10:00:00Z)" },
        end: { type: "string", description: "End time ISO 8601 (e.g., 2025-08-24T11:00:00Z)" },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "List of attendee emails"
        },
        description: { type: "string", description: "Description/agenda", nullable: true },
        timezone: { type: "string", description: "IANA timezone (e.g., UTC, Asia/Kolkata)", nullable: true }
      },
      required: ["title", "start", "end"]
    }
  },

  // 🔧 Simulated call — replace with real Google Calendar API
  async call({ title, start, end, attendees = [], description = "", timezone = "UTC" }) {
    // Basic validation
    if (!title || !start || !end) {
      return { success: false, error: "Missing required fields (title/start/end)." };
    }
    // Pretend we created an event ID & link
    const eventId = `evt_${Math.random().toString(36).slice(2, 10)}`;
    const htmlLink = `https://calendar.google.com/calendar/u/0/r/eventedit/${eventId}`;

    return {
      success: true,
      event: {
        id: eventId,
        title,
        start,
        end,
        attendees,
        description,
        timezone,
        htmlLink
      }
    };
  }
};
