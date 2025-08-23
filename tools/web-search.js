import { TavilyClient } from "tavily";

export const webSearchTool = {
    type: "function",
    function: {
        name: "web-search",
        description: "Search the web for recent information.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query."
                },
                numResults: {
                    type: "integer",
                    description: "Number of results to return.",
                    default: 3
                }
            },
            required: ["query"]
        }
    },

    // Custom implementation (your own call handler)
    async call({ query, numResults = 3 }) {
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
            throw new Error("TAVILY_API_KEY environment variable is not set.");
        }
        const client = new TavilyClient({ apiKey });
        const results = await client.search({ query, max_results: numResults });
        return JSON.stringify(
            results.results.map((r, i) => ({
                rank: i + 1,
                title: r.title,
                snippet: r.content,
                url: r.url
            })),
            null,
            2
        );
    }
};
