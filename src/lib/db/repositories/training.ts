import { eq } from "drizzle-orm";
import { db } from "../client";
import { trainingExamples, trainingLabels } from "../schema";
import type { TrainingExample, TrainingLabel } from "../../models/types";

export async function saveTrainingExample(
  example: TrainingExample
): Promise<void> {
  await db.insert(trainingExamples).values({
    id: example.id,
    text: example.text,
    contentId: example.contentId,
    labeledBy: example.labeledBy,
    labeledAt: new Date(example.labeledAt),
    verified: example.verified,
  });

  for (let i = 0; i < example.labels.length; i++) {
    const label = example.labels[i];
    await db.insert(trainingLabels).values({
      id: `${example.id}-label-${i}`,
      exampleId: example.id,
      type: label.type,
      value: label.value,
      startIndex: label.startIndex,
      endIndex: label.endIndex,
      confidence: label.confidence,
      notes: label.notes,
    });
  }
}

export async function getVerifiedExamples(): Promise<TrainingExample[]> {
  const rows = await db.query.trainingExamples.findMany({
    where: eq(trainingExamples.verified, true),
    with: { labels: true },
  });

  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    contentId: r.contentId ?? undefined,
    labels: r.labels.map(
      (l): TrainingLabel => ({
        type: l.type as TrainingLabel["type"],
        value: l.value,
        startIndex: l.startIndex,
        endIndex: l.endIndex,
        confidence: l.confidence,
        notes: l.notes ?? undefined,
      })
    ),
    labeledBy: r.labeledBy,
    labeledAt: r.labeledAt.toISOString(),
    verified: r.verified,
  }));
}
