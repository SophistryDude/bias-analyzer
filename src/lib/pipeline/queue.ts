/**
 * Analysis Job Queue
 *
 * Uses pg-boss for persistent, PostgreSQL-backed job queuing.
 * New content enters the queue, analysis runs asynchronously,
 * results are stored in the database.
 */

import { PgBoss } from "pg-boss";
import type { ContentItem } from "../models/types";
import { runAnalysis } from "./analyzer";
import { saveAnalysis } from "../db/repositories/analyses";
import { recordHash } from "./dedup";

const QUEUE_NAME = "analyze-content";

let boss: PgBoss | null = null;

/**
 * Initialize the job queue. Call once at startup.
 */
export async function initQueue(): Promise<PgBoss> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for job queue");
  }

  boss = new PgBoss(connectionString);
  await boss.start();

  // Register the analysis worker
  await boss.work<ContentItem>(QUEUE_NAME, { batchSize: 1 }, async ([job]: { data: ContentItem }[]) => {
    const content = job.data;
    console.log(`[queue] Analyzing: ${content.title} (${content.id})`);

    try {
      const analysis = await runAnalysis(content);
      await saveAnalysis(content, analysis);
      await recordHash(content.rawText, content.id);

      console.log(
        `[queue] Done: ${content.title} — score: ${analysis.manipulationScore}, bias: ${analysis.biasAssessment.overallLeaning}`
      );
    } catch (err) {
      console.error(`[queue] Failed to analyze ${content.id}:`, err);
      throw err; // pg-boss will retry
    }
  });

  console.log("[queue] Analysis worker started");
  return boss;
}

/**
 * Enqueue a content item for analysis.
 */
export async function enqueueAnalysis(content: ContentItem): Promise<void> {
  if (!boss) {
    throw new Error("Queue not initialized. Call initQueue() first.");
  }

  await boss.send(QUEUE_NAME, content);

  console.log(`[queue] Enqueued: ${content.title}`);
}

/**
 * Gracefully shut down the queue.
 */
export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}
