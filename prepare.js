import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { RedisVectorStore } from "@langchain/redis";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "redis";
import crypto from "crypto";

// === CONFIG ===
const pdfPath = "./pdfs/GroupMedicare.pdf";
const INDEX_NAME = process.env.REDIS_INDEX_NAME || "tata_aig_policy_docs";

// === EMBEDDINGS ===
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

// === REDIS CLIENT ===
const client = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
});
await client.connect();

export const vectorStore = new RedisVectorStore(embeddings, {
  redisClient: client,
  indexName: INDEX_NAME,
});

// === INDEXING FUNCTION ===
export async function indexTheDocument() {
  const loader = new PDFLoader(pdfPath, { splitPages: false });
  const docs = await loader.load();
  console.log(`✅ Loaded ${docs.length} document(s) from ${pdfPath}`);

  return splitAndStoreDocuments(docs);
}

export async function splitAndStoreDocuments(docs) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
  });

  const splitDocs = await textSplitter.splitDocuments(docs);

  // Generate unique IDs for each chunk
  const documentsWithIds = splitDocs.map((doc) => {
    const hash = crypto
      .createHash("sha256")
      .update(doc.pageContent + JSON.stringify(doc.metadata))
      .digest("hex");

    return {
      ...doc,
      id: hash, // unique ID for Redis
    };
  });

  // === Deduplication: check which IDs already exist in Redis ===
  const pipeline = client.multi();
  documentsWithIds.forEach((d) =>
    pipeline.exists(`${INDEX_NAME}:${d.id}`)
  );
  const results = await pipeline.exec();

  const newDocs = documentsWithIds.filter((_, i) => results[i] === 0);

  if (newDocs.length === 0) {
    console.log(`⚡ No new content found — skipping re-indexing.`);
    return 0;
  }

  // Add only new chunks
  await vectorStore.addDocuments(newDocs, {
    ids: newDocs.map((d) => d.id),
  });

  console.log(
    `✅ Indexed ${newDocs.length} new document chunks into Redis (index: ${INDEX_NAME}).`
  );

  return newDocs.length;
}

// Graceful shutdown
process.on("exit", async () => {
  await client.quit();
});
process.on("SIGINT", async () => {
  await client.quit();
  process.exit();
});
