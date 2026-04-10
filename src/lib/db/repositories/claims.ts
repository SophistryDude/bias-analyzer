import { eq } from "drizzle-orm";
import { db } from "../client";
import { claims, sourceClaims } from "../schema";

// ─── Types ──────────────────────────────────────────────────────────

export interface Claim {
  id: string;
  storyId: string;
  statement: string;
  claimType: string;
  significance: string;
  verifiability: string;
  verificationSource: string | null;
  verificationStatus: string;
  verificationNotes: string | null;
}

export interface SourceClaim {
  id: string;
  claimId: string;
  coverageId: string;
  status: string;
  sourceWording: string | null;
  wordingDivergence: string | null;
  divergentDetail: string | null;
  attributedTo: string | null;
}

export interface ClaimWithSources extends Claim {
  sources: SourceClaim[];
}

// ─── Queries ────────────────────────────────────────────────────────

export async function createClaim(claim: {
  id: string;
  storyId: string;
  statement: string;
  claimType: string;
  significance: string;
  verifiability: string;
  verificationSource?: string;
}): Promise<void> {
  await db
    .insert(claims)
    .values({
      id: claim.id,
      storyId: claim.storyId,
      statement: claim.statement,
      claimType: claim.claimType,
      significance: claim.significance,
      verifiability: claim.verifiability,
      verificationSource: claim.verificationSource,
    })
    .onConflictDoNothing();
}

export async function addSourceClaim(sc: {
  id: string;
  claimId: string;
  coverageId: string;
  status: string;
  sourceWording?: string;
  wordingDivergence?: string;
  divergentDetail?: string;
  attributedTo?: string;
}): Promise<void> {
  await db
    .insert(sourceClaims)
    .values({
      id: sc.id,
      claimId: sc.claimId,
      coverageId: sc.coverageId,
      status: sc.status,
      sourceWording: sc.sourceWording,
      wordingDivergence: sc.wordingDivergence,
      divergentDetail: sc.divergentDetail,
      attributedTo: sc.attributedTo,
    })
    .onConflictDoNothing();
}

export async function getClaimsForStory(
  storyId: string
): Promise<ClaimWithSources[]> {
  const rows = await db.query.claims.findMany({
    where: eq(claims.storyId, storyId),
    with: { sourceClaims: true },
  });

  return rows.map((r) => ({
    id: r.id,
    storyId: r.storyId,
    statement: r.statement,
    claimType: r.claimType,
    significance: r.significance,
    verifiability: r.verifiability,
    verificationSource: r.verificationSource,
    verificationStatus: r.verificationStatus,
    verificationNotes: r.verificationNotes,
    sources: r.sourceClaims.map((sc) => ({
      id: sc.id,
      claimId: sc.claimId,
      coverageId: sc.coverageId,
      status: sc.status,
      sourceWording: sc.sourceWording,
      wordingDivergence: sc.wordingDivergence,
      divergentDetail: sc.divergentDetail,
      attributedTo: sc.attributedTo,
    })),
  }));
}

/**
 * Get the omission report for a specific coverage.
 * Returns all claims for the story with this coverage's status for each.
 */
export async function getOmissionReport(
  storyId: string,
  coverageId: string
): Promise<{
  totalClaims: number;
  included: number;
  omitted: number;
  partial: number;
  distorted: number;
  completenessScore: number;
  omissions: { statement: string; significance: string; otherSourceCount: number }[];
}> {
  const allClaims = await getClaimsForStory(storyId);

  let included = 0;
  let omitted = 0;
  let partial = 0;
  let distorted = 0;
  const omissions: { statement: string; significance: string; otherSourceCount: number }[] = [];

  let significantTotal = 0;
  let significantIncluded = 0;

  for (const claim of allClaims) {
    const sc = claim.sources.find((s) => s.coverageId === coverageId);
    const status = sc?.status ?? "omitted";

    if (claim.significance === "critical" || claim.significance === "important") {
      significantTotal++;
    }

    switch (status) {
      case "included":
        included++;
        if (claim.significance === "critical" || claim.significance === "important") {
          significantIncluded++;
        }
        break;
      case "omitted":
        omitted++;
        omissions.push({
          statement: claim.statement,
          significance: claim.significance,
          otherSourceCount: claim.sources.filter((s) => s.status === "included").length,
        });
        break;
      case "partial":
        partial++;
        significantIncluded += 0.5;
        break;
      case "distorted":
        distorted++;
        break;
    }
  }

  return {
    totalClaims: allClaims.length,
    included,
    omitted,
    partial,
    distorted,
    completenessScore: significantTotal > 0 ? significantIncluded / significantTotal : 1,
    omissions: omissions.filter(
      (o) => o.significance === "critical" || o.significance === "important"
    ),
  };
}
