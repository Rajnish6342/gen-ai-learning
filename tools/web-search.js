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

    /**
     * Searches the web for recent information using the Tavily API.
     * @param {Object} params - The parameters for the search.
     * @param {string} params.query - The search query string.
     * @param {number} [params.numResults=3] - Number of results to return.
     * @returns {Promise<string>} A JSON string containing an array of search results with rank, title, snippet, and url.
     */
    async call({ query, numResults = 3 }) {
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
            throw new Error("TAVILY_API_KEY environment variable is not set.");
        }
        const client = new TavilyClient({ apiKey });
        console.log("Performing web search for query:", query);
        const results = await client.search({ query, max_results: numResults,search_depth: "advanced" });
        console.log(`Web search returned ${results.results.length} results.`);
        return JSON.stringify(
            results.results.map((r, i) => ({
                rank: i + 1,
                title: r.title,
                snippet: r.content,
                url: r.url
            })),
        );
    }
};
