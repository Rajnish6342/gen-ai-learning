export const googleCalendarTool = {
  type: "function",
  function: {
    name: "create_google_calendar_event",
    description: "Creates a google calendar event",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the event" },
        start_time: {
          type: "string",
          description: "Start time of the event in ISO 8601 format (e.g., 2025-08-24T17:00:00)",
        },
        end_time: {
          type: "string",
          description: "End time of the event in ISO 8601 format (e.g., 2025-08-24T18:00:00)",
        },
        timezone: {
          type: "string",
          description: "Timezone of the event (e.g., UTC, Asia/Kolkata)",
        },
        description: { type: "string", description: "Description of the event" },
        participants: {
          type: "array",
          items: { type: "string" },
          description: "List of participants' emails",
        },
      },
      required: ["title", "start_time", "end_time"],
    },
  },
  async call({ title, start_time, end_time, timezone, description, participants }) {
    // For this example, we'll just simulate the action
    console.log("Creating Google Calendar event:", {
      title,
      start_time,
      end_time,
      timezone,
      description,
      participants,
    });
    return `Event '${title}' scheduled from ${start_time} to ${end_time} (${timezone || "UTC"}) with participants: ${
      participants?.length ? participants.join(", ") : "None"
    }`;
  }
};
