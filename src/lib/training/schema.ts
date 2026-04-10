/**
 * Training Data Schema & Management
 *
 * Handles the creation, storage, and retrieval of manually labeled
 * training examples for improving the logic engine and bias detection.
 *
 * Workflow:
 * 1. Content is analyzed by the engine
 * 2. Human reviews and corrects the analysis
 * 3. Corrections are stored as training examples
 * 4. Training examples are used to refine detection patterns and weights
 */

import type { TrainingExample, TrainingLabel } from "../models/types";

// ─── Training Set Management ────────────────────────────────────────

export interface TrainingSet {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  examples: TrainingExample[];
  stats: TrainingStats;
}

export interface TrainingStats {
  totalExamples: number;
  fallacyExamples: number;
  reframingExamples: number;
  biasExamples: number;
  verifiedExamples: number;
  fallacyCounts: Record<string, number>; // fallacy ID -> count
  biasCounts: Record<string, number>; // bias direction -> count
}

/**
 * Creates a new training example from a human review
 */
export function createTrainingExample(
  text: string,
  labels: TrainingLabel[],
  labeledBy: string,
  contentId?: string
): TrainingExample {
  return {
    id: `train-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    contentId,
    labels,
    labeledBy,
    labeledAt: new Date().toISOString(),
    verified: false,
  };
}

/**
 * Creates a training label for a fallacy annotation
 */
export function createFallacyLabel(
  fallacyId: string,
  startIndex: number,
  endIndex: number,
  confidence: number,
  notes?: string
): TrainingLabel {
  return {
    type: "fallacy",
    value: fallacyId,
    startIndex,
    endIndex,
    confidence,
    notes,
  };
}

/**
 * Creates a training label for a reframing annotation
 */
export function createReframingLabel(
  technique: string,
  startIndex: number,
  endIndex: number,
  confidence: number,
  notes?: string
): TrainingLabel {
  return {
    type: "reframing",
    value: technique,
    startIndex,
    endIndex,
    confidence,
    notes,
  };
}

/**
 * Creates a training label for a bias annotation
 */
export function createBiasLabel(
  direction: string,
  startIndex: number,
  endIndex: number,
  confidence: number,
  notes?: string
): TrainingLabel {
  return {
    type: "bias",
    value: direction,
    startIndex,
    endIndex,
    confidence,
    notes,
  };
}

/**
 * Computes stats for a training set
 */
export function computeTrainingStats(
  examples: TrainingExample[]
): TrainingStats {
  const fallacyCounts: Record<string, number> = {};
  const biasCounts: Record<string, number> = {};
  let fallacyExamples = 0;
  let reframingExamples = 0;
  let biasExamples = 0;
  let verifiedExamples = 0;

  for (const example of examples) {
    if (example.verified) verifiedExamples++;

    for (const label of example.labels) {
      switch (label.type) {
        case "fallacy":
          fallacyExamples++;
          fallacyCounts[label.value] = (fallacyCounts[label.value] || 0) + 1;
          break;
        case "reframing":
          reframingExamples++;
          break;
        case "bias":
          biasExamples++;
          biasCounts[label.value] = (biasCounts[label.value] || 0) + 1;
          break;
      }
    }
  }

  return {
    totalExamples: examples.length,
    fallacyExamples,
    reframingExamples,
    biasExamples,
    verifiedExamples,
    fallacyCounts,
    biasCounts,
  };
}

/**
 * Exports training data in a format suitable for fine-tuning
 * Returns JSONL format (one JSON object per line)
 */
export function exportForFineTuning(examples: TrainingExample[]): string {
  return examples
    .filter((e) => e.verified)
    .map((example) => {
      const labelDescriptions = example.labels.map((label) => {
        const segment = example.text.slice(label.startIndex, label.endIndex);
        return {
          type: label.type,
          value: label.value,
          text: segment,
          confidence: label.confidence,
        };
      });

      return JSON.stringify({
        text: example.text,
        labels: labelDescriptions,
      });
    })
    .join("\n");
}
