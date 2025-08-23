# GenAI Learning

This repository contains resources, experiments, and notes for learning **Generative AI (GenAI)** with a focus on **LLMs, tools, and RAG**.

---

## 🚀 Getting Started

1. Clone the repository.
2. Install dependencies (`npm install` / `yarn install`).
3. Set up environment variables (e.g. `GROQ_API_KEY`, model name).
4. Run examples to experiment.

---

## ✨ Features

- Example GenAI chat completions
- Using tools (e.g. web search, PDF parsing)
- Retrieval-Augmented Generation (RAG) basics
- Tutorials, notes, and experiments
- Learnings on prompt engineering & message roles

---

## 📚 Learnings & Notes

### 1. Message Roles in Chat Models
When working with LLMs (Groq, OpenAI, Anthropic, etc.), messages follow structured **roles**:

- **system** → Defines behavior, tone, style, rules.  
  Example: `"You are a precise assistant that only returns numbers."`

- **user** → Human input.  
  Example: `"What is the gold rate in India as of Aug 2025?"`

- **assistant** → Model response.  
  Example: `"The current gold rate is ₹XX,XXX per 10 grams."`

- **tool / function_call** → Structured request for an external tool/API.  
  Example: `{"name": "webSearch", "arguments": {"query": "24K gold price India"}}`

- **tool_result / function_result** → Data returned from the tool.  
  Example: Search results JSON, database query response.

This structured flow allows **multi-turn reasoning** + integration with **external data**.

---

### 2. Prompt Engineering Best Practices
- Be **clear and specific**: `"Return only the 24K gold price in India per 10 grams (August 2025). Do not expand."`
- Add **formatting constraints**: `"Answer in JSON with 'price' field only."`
- Use **system prompts** to enforce rules (style, depth, safety).
- Chain prompts → Model can refine earlier tool results.

---

### 3. Tool Use (Function Calling)
Tools extend LLMs with external capabilities.  
Example flow:
1. User asks → `"Give me the gold rate in India (Aug 2025)."`
2. LLM decides to call `webSearchTool`.
3. Tool returns structured results.
4. LLM **reprocesses results** to give final refined answer.

**Implementation Pattern**:
```js
const response = await groq.chat.completions.create({
  model: "openai/gpt-oss-120b",
  messages: [{ role: "user", content: userInput }],
  tools: [webSearchTool],
  tool_choice: "auto"
});
