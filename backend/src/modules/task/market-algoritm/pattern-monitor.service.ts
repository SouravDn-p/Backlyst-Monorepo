import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationCategory,
  NotificationType,
  PatternFlagStatus,
  PatternFlagType,
  PatternSeverity,
  Prisma,
} from '@prisma/client';
import { NotificationService } from 'src/modules/notification/notification.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { calculateRiskScore, RISK_DELTA_BY_EVENT } from './scoring.utils';

type EdgeRecord = {
  sourceDomain: string;
  targetDomain: string;
  normalizedPairKey: string;
  completedAt: Date;
};

/**
 * Spec §14 — coordinated-exchange pattern monitoring.
 *
 * Builds a directed graph from `DomainInteraction` (edges = provider root domain
 * → requester root domain) and detects group/cluster concentration that bypasses
 * simple pairwise cooldowns. We use Strongly Connected Components (SCC) via an
 * inline iterative Tarjan implementation (no graph library).
 *
 * Repeat (same ordered pair) and reciprocal (A→B + B→A) patterns are already
 * covered by the existing pairwise `repeatPairCooldownDays` /
 * `reciprocalCooldownDays` checks, so they are observed for logging only and
 * intentionally NOT flagged here.
 */
@Injectable()
export class PatternMonitorService {
  private readonly logger = new Logger(PatternMonitorService.name);

  /** Minimum number of domains in a strongly connected component to flag. */
  private static readonly MIN_CLUSTER_SIZE = 4;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Scan the configured rolling window for coordinated-exchange cluster
   * concentration, repeat bursts, and reciprocal rings — persisting
   * `PatternFlag` rows (with de-dupe) for each.
   */
  async scan(): Promise<{
    scanned: number;
    flagsCreated: number;
    clusters: Array<{
      domainCount: number;
      memberDomains: string[];
      severity: PatternSeverity;
    }>;
  }> {
    const startedAt = Date.now();
    this.logger.log('Pattern scan started.');

    try {
      const config = await this.prisma.marketplaceScoringConfig.findFirst();
      const windowDays = config?.networkConcentrationWindowDays ?? 7;
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
      const windowStart = since;
      const windowEnd = new Date();

      const edges = await this.loadEdges(since);

      // Track already-flagged domains within this run to deduplicate across
      // pattern types (a pair flagged as REPEAT_BURST is not also flagged as
      // part of a RECIPROCAL_RING in the same scan).
      const flaggedPairKeys = new Set<string>();
      const flaggedDomainSets = new Set<string>();

      let flagsCreated = 0;

      // --- 1. Cluster / group concentration via SCC. ---
      const { nodes, adjacency } = this.buildGraph(edges);
      const sccs = this.findSccs(nodes, adjacency);

      const clusters: Array<{
        domainCount: number;
        memberDomains: string[];
        severity: PatternSeverity;
      }> = [];

      for (const component of sccs) {
        if (component.length < PatternMonitorService.MIN_CLUSTER_SIZE) continue;
        const memberDomains = [...component].sort();
        const stableKey = memberDomains.join('|');
        if (flaggedDomainSets.has(stableKey)) continue;

        const severity =
          component.length >= 8 ? PatternSeverity.HIGH : PatternSeverity.MEDIUM;

        const created = await this.persistFlag({
          type: PatternFlagType.CLUSTER_CONCENTRATION,
          memberDomains,
          domainCount: component.length,
          severity,
          windowStart,
          windowEnd,
          edges,
          since,
        });
        if (created) {
          flagsCreated += 1;
          flaggedDomainSets.add(stableKey);
        }

        clusters.push({
          domainCount: component.length,
          memberDomains,
          severity,
        });
      }

      // --- 2. REPEAT_BURST — same ordered pair appearing ≥ 3 times in window. ---
      const repeatBurstFlags = await this.detectRepeatBursts(
        edges,
        since,
        windowStart,
        windowEnd,
        flaggedPairKeys,
      );
      flagsCreated += repeatBurstFlags;

      // --- 3. RECIPROCAL_RING — directed cycles of length ≥ 3. ---
      const reciprocalRingFlags = await this.detectReciprocalRings(
        edges,
        adjacency,
        since,
        windowStart,
        windowEnd,
        flaggedDomainSets,
      );
      flagsCreated += reciprocalRingFlags;

      this.logger.log(
        `Pattern scan complete: ${edges.length} edge(s) scanned, ${sccs.length} SCC(s), ${flagsCreated} new flag(s) created in ${Date.now() - startedAt}ms.`,
      );

      return { scanned: edges.length, flagsCreated, clusters };
    } catch (err) {
      this.logger.error(
        `Pattern scan failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      return { scanned: 0, flagsCreated: 0, clusters: [] };
    }
  }

  /**
   * Detect REPEAT_BURST patterns: the same ordered pair (provider→requester)
   * appearing ≥ MIN_REPEAT_COUNT times within the window.
   */
  private async detectRepeatBursts(
    edges: EdgeRecord[],
    since: Date,
    windowStart: Date,
    windowEnd: Date,
    flaggedPairKeys: Set<string>,
  ): Promise<number> {
    const MIN_REPEAT_COUNT = 3;

    // Build per-pair counts and collect interaction evidence.
    const pairMap = new Map<
      string,
      { count: number; interactions: Array<{ taskId: string; date: string }> }
    >();
    for (const e of edges) {
      const key = e.normalizedPairKey;
      let entry = pairMap.get(key);
      if (!entry) {
        entry = { count: 0, interactions: [] };
        pairMap.set(key, entry);
      }
      entry.count += 1;
      entry.interactions.push({
        taskId: '',
        date: e.completedAt.toISOString(),
      });
    }

    // Resolve domain names for each qualifying pair via DomainInteraction taskId
    // lookup. We batch-load all domain interactions in the window once.
    const qualifyingPairs = [...pairMap.entries()].filter(
      ([, v]) =>
        v.count >= MIN_REPEAT_COUNT &&
        !flaggedPairKeys.has([][0] /* placeholder */),
    );

    if (qualifyingPairs.length === 0) return 0;

    // Load the full DomainInteraction records for qualifying pairs to get
    // taskId and website domain info.
    const pairKeys = qualifyingPairs.map(([k]) => k);
    const interactions = await this.prisma.domainInteraction.findMany({
      where: {
        completedAt: { gte: since },
        normalizedPairKey: { in: pairKeys },
      },
      select: {
        normalizedPairKey: true,
        sourceDomain: true,
        targetDomain: true,
        taskId: true,
        completedAt: true,
      },
      orderBy: { completedAt: 'asc' },
    });

    // Group by pair key.
    const evidenceByPair = new Map<string, typeof interactions>();
    for (const di of interactions) {
      const arr = evidenceByPair.get(di.normalizedPairKey) ?? [];
      arr.push(di);
      evidenceByPair.set(di.normalizedPairKey, arr);
    }

    let flagsCreated = 0;

    for (const [pairKey, stats] of pairMap) {
      if (stats.count < MIN_REPEAT_COUNT || flaggedPairKeys.has(pairKey))
        continue;

      const evidence = evidenceByPair.get(pairKey) ?? [];
      if (evidence.length === 0) continue;

      const sourceDomain = evidence[0].sourceDomain;
      const targetDomain = evidence[0].targetDomain;
      const memberDomains = [sourceDomain, targetDomain].sort();

      const severity =
        stats.count >= 5 ? PatternSeverity.HIGH : PatternSeverity.MEDIUM;

      const created = await this.persistFlag({
        type: PatternFlagType.REPEAT_BURST,
        memberDomains,
        domainCount: 2,
        severity,
        windowStart,
        windowEnd,
        edges,
        since,
        evidenceJson: {
          pairCount: stats.count,
          windowDays: Math.round(
            (windowEnd.getTime() - windowStart.getTime()) /
              (24 * 60 * 60 * 1000),
          ),
          interactions: evidence.map((di) => ({
            taskId: di.taskId,
            date: di.completedAt.toISOString(),
          })),
        },
      });

      if (created) {
        flagsCreated += 1;
        flaggedPairKeys.add(pairKey);
      }
    }

    return flagsCreated;
  }

  /**
   * Detect RECIPROCAL_RING patterns: directed cycles of length ≥ 3 formed by
   * domain interactions in the window.
   */
  private async detectReciprocalRings(
    edges: EdgeRecord[],
    adjacency: Map<string, string[]>,
    since: Date,
    windowStart: Date,
    windowEnd: Date,
    flaggedDomainSets: Set<string>,
  ): Promise<number> {
    const MIN_CYCLE_LENGTH = 3;
    const MAX_CYCLE_LENGTH = 10;
    const cycles = this.findDirectedCycles(
      adjacency,
      MIN_CYCLE_LENGTH,
      MAX_CYCLE_LENGTH,
    );

    if (cycles.length === 0) return 0;

    // Load relevant domain interactions for evidence.
    const allInteractions = await this.prisma.domainInteraction.findMany({
      where: { completedAt: { gte: since } },
      select: {
        sourceDomain: true,
        targetDomain: true,
        taskId: true,
        completedAt: true,
      },
    });

    const edgeLookup = new Map<string, typeof allInteractions>();
    for (const di of allInteractions) {
      const key = `${di.sourceDomain}>${di.targetDomain}`;
      const arr = edgeLookup.get(key) ?? [];
      arr.push(di);
      edgeLookup.set(key, arr);
    }

    let flagsCreated = 0;

    for (const cycle of cycles) {
      const memberDomains = [...cycle].sort();
      const stableKey = memberDomains.join('|');
      if (flaggedDomainSets.has(stableKey)) continue;

      const severity =
        cycle.length >= 4 ? PatternSeverity.HIGH : PatternSeverity.MEDIUM;

      // Gather edge evidence for the cycle.
      const cycleEdges: Array<{
        from: string;
        to: string;
        taskId: string;
        date: string;
      }> = [];
      for (let i = 0; i < cycle.length; i++) {
        const from = cycle[i];
        const to = cycle[(i + 1) % cycle.length];
        const edgeKey = `${from}>${to}`;
        const found = edgeLookup.get(edgeKey) ?? [];
        for (const f of found) {
          cycleEdges.push({
            from: f.sourceDomain,
            to: f.targetDomain,
            taskId: f.taskId,
            date: f.completedAt.toISOString(),
          });
        }
      }

      const created = await this.persistFlag({
        type: PatternFlagType.RECIPROCAL_RING,
        memberDomains,
        domainCount: memberDomains.length,
        severity,
        windowStart,
        windowEnd,
        edges,
        since,
        evidenceJson: {
          cycleLength: cycle.length,
          cycle: [...cycle, cycle[0]],
          interactions: cycleEdges,
        },
      });

      if (created) {
        flagsCreated += 1;
        flaggedDomainSets.add(stableKey);
      }
    }

    return flagsCreated;
  }

  /**
   * Find all simple directed cycles in the adjacency graph with lengths in
   * [minLen, maxLen]. Uses DFS with path tracking. Returns at most 100 cycles
   * to bound computation.
   */
  private findDirectedCycles(
    adjacency: Map<string, string[]>,
    minLen: number,
    maxLen: number,
  ): string[][] {
    const cycles: string[][] = [];
    const MAX_CYCLES = 100;
    const visited = new Set<string>();

    for (const start of adjacency.keys()) {
      if (cycles.length >= MAX_CYCLES) break;
      this.dfsFindCycles(
        start,
        start,
        [start],
        new Set([start]),
        adjacency,
        minLen,
        maxLen,
        cycles,
        MAX_CYCLES,
      );
    }

    return cycles;
  }

  private dfsFindCycles(
    current: string,
    start: string,
    path: string[],
    pathSet: Set<string>,
    adjacency: Map<string, string[]>,
    minLen: number,
    maxLen: number,
    cycles: string[][],
    maxCycles: number,
  ): void {
    if (cycles.length >= maxCycles) return;
    if (path.length > maxLen) return;

    const neighbors = adjacency.get(current) ?? [];
    for (const next of neighbors) {
      if (cycles.length >= maxCycles) return;

      if (next === start && path.length >= minLen) {
        cycles.push([...path]);
        continue;
      }

      if (pathSet.has(next)) continue;
      if (path.length >= maxLen) continue;

      path.push(next);
      pathSet.add(next);
      this.dfsFindCycles(
        next,
        start,
        path,
        pathSet,
        adjacency,
        minLen,
        maxLen,
        cycles,
        maxCycles,
      );
      pathSet.delete(next);
      path.pop();
    }
  }

  /**
   * Load `DomainInteraction` edges completed within the window, paged to avoid
   * loading the entire table at once.
   */
  private async loadEdges(since: Date) {
    const PAGE = 1000;
    const all: Array<{
      sourceDomain: string;
      targetDomain: string;
      normalizedPairKey: string;
      completedAt: Date;
    }> = [];
    let skip = 0;

    for (;;) {
      const page = await this.prisma.domainInteraction.findMany({
        where: { completedAt: { gte: since } },
        select: {
          sourceDomain: true,
          targetDomain: true,
          normalizedPairKey: true,
          completedAt: true,
        },
        orderBy: { completedAt: 'asc' },
        take: PAGE,
        skip,
      });
      all.push(...page);
      if (page.length < PAGE) break;
      skip += PAGE;
    }

    return all;
  }

  /**
   * Count unordered reciprocal pairs (both A→B and B→A present in the window).
   * Logged only — pairwise reciprocal cooldowns already handle these.
   */
  private countReciprocalPairs(
    edges: Array<{ sourceDomain: string; targetDomain: string }>,
  ): number {
    const directed = new Set<string>();
    for (const e of edges) directed.add(`${e.sourceDomain}>${e.targetDomain}`);
    let reciprocal = 0;
    for (const e of edges) {
      if (directed.has(`${e.targetDomain}>${e.sourceDomain}`)) reciprocal += 1;
    }
    // Each mutual pair counted twice (once per direction) — return distinct pairs.
    return Math.floor(reciprocal / 2);
  }

  private buildGraph(
    edges: Array<{ sourceDomain: string; targetDomain: string }>,
  ): { nodes: string[]; adjacency: Map<string, string[]> } {
    const adjacency = new Map<string, string[]>();
    for (const e of edges) {
      if (!adjacency.has(e.sourceDomain)) adjacency.set(e.sourceDomain, []);
      adjacency.get(e.sourceDomain)!.push(e.targetDomain);
      // Ensure target nodes appear even if they have no outgoing edges.
      if (!adjacency.has(e.targetDomain)) adjacency.set(e.targetDomain, []);
    }
    return { nodes: [...adjacency.keys()], adjacency };
  }

  /**
   * Iterative Tarjan's strongly-connected-components algorithm.
   * Returns an array of components, each an array of domain (node) ids.
   */
  findSccs(nodes: string[], adjacency: Map<string, string[]>): string[][] {
    let index = 0;
    const indices = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: string[][] = [];

    for (const root of nodes) {
      if (indices.has(root)) continue;
      // Explicit stack of frames for iterative DFS: { node, childIteratorIndex }.
      const callStack: Array<{ node: string; i: number }> = [
        { node: root, i: 0 },
      ];

      while (callStack.length > 0) {
        const frame = callStack[callStack.length - 1];
        const v = frame.node;

        if (frame.i === 0) {
          // First time we visit v.
          indices.set(v, index);
          lowlink.set(v, index);
          index += 1;
          stack.push(v);
          onStack.add(v);
        }

        const neighbors = adjacency.get(v) ?? [];
        if (frame.i < neighbors.length) {
          const w = neighbors[frame.i];
          frame.i += 1;
          if (!indices.has(w)) {
            // Descend into w.
            callStack.push({ node: w, i: 0 });
          } else if (onStack.has(w)) {
            lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
          }
        } else {
          // Done exploring v's neighbors.
          if (lowlink.get(v) === indices.get(v)) {
            const component: string[] = [];
            let w: string;
            do {
              w = stack.pop()!;
              onStack.delete(w);
              component.push(w);
            } while (w !== v);
            sccs.push(component);
          }
          // Return to parent: update parent's lowlink.
          callStack.pop();
          const parent = callStack[callStack.length - 1];
          if (parent) {
            lowlink.set(
              parent.node,
              Math.min(lowlink.get(parent.node)!, lowlink.get(v)!),
            );
          }
        }
      }
    }

    return sccs;
  }

  /**
   * Create a `PatternFlag` for a detected pattern unless an equivalent OPEN flag
   * already exists for the same member set within the window (de-dupe).
   */
  private async persistFlag(args: {
    type: PatternFlagType;
    memberDomains: string[];
    domainCount: number;
    severity: PatternSeverity;
    windowStart: Date;
    windowEnd: Date;
    edges: EdgeRecord[];
    since: Date;
    evidenceJson?: Record<string, unknown>;
  }): Promise<boolean> {
    const {
      type,
      memberDomains,
      domainCount,
      severity,
      windowStart,
      windowEnd,
      edges,
      since,
      evidenceJson: customEvidence,
    } = args;
    const stableKey = memberDomains.join('|');

    // Audit R10 fix: the previous de-dupe query ignored `type` and matched ANY
    // OPEN flag whose member set happened to equal `stableKey`, which meant a
    // CLUSTER_CONCENTRATION flag could suppress an unrelated RECIPROCAL_RING (or
    // vice-versa) and vice-versa. Scope the lookup to the SAME pattern type and
    // member set within the active window so each distinct pattern type is
    // de-duplicated independently. `memberDomains` is a list filter, so we also
    // guard with an exact post-filter on the sorted key.
    const existing = await this.prisma.patternFlag.findFirst({
      where: {
        type,
        status: PatternFlagStatus.OPEN,
        windowEnd: { gte: since },
        memberDomains: { hasEvery: memberDomains },
      },
      select: { id: true, memberDomains: true },
      orderBy: { createdAt: 'desc' },
    });

    if (
      existing &&
      [...existing.memberDomains].sort().join('|') === stableKey
    ) {
      this.logger.debug(
        `Skipping duplicate OPEN ${type} flag for ${stableKey}.`,
      );
      return false;
    }

    // Capture the intra-cluster edges as supporting evidence.
    const memberSet = new Set(memberDomains);
    const evidenceEdges = edges
      .filter(
        (e) => memberSet.has(e.sourceDomain) && memberSet.has(e.targetDomain),
      )
      .map((e) => ({
        sourceDomain: e.sourceDomain,
        targetDomain: e.targetDomain,
        normalizedPairKey: e.normalizedPairKey,
        completedAt: e.completedAt.toISOString(),
      }));

    const flag = await this.prisma.patternFlag.create({
      data: {
        type,
        severity,
        status: PatternFlagStatus.OPEN,
        windowStart,
        windowEnd,
        domainCount,
        memberDomains,
        evidenceJson: (customEvidence ?? {
          stableKey,
          edges: evidenceEdges,
        }) as Prisma.InputJsonValue,
      },
    });

    // Optional: append immutable ABUSE risk events for HIGH-severity clusters and
    // raise the affected sites' riskScore. Spec §15: HIGH-severity abuse clusters
    // must actually increase the affected profiles' `riskScore` (previously the
    // ABUSE event was written with `delta: 0` / `riskScoreAfter: 0`, so it had no
    // effect on the profile). We reuse the canonical `calculateRiskScore` +
    // `RISK_DELTA_BY_EVENT.ABUSE` (40) path used by `updateScoresAfterTask`.
    // Best-effort; never let a risk-log failure abort the scan.
    if (severity === PatternSeverity.HIGH) {
      try {
        const now = new Date();
        const websites = await this.prisma.website.findMany({
          where: { rootDomain: { in: memberDomains } },
          select: {
            id: true,
            rootDomain: true,
            matchingProfile: {
              select: { riskScore: true, lastRiskEventAt: true },
            },
          },
        });

        await this.prisma.$transaction(
          websites
            .map((w) => {
              const currentRisk = w.matchingProfile?.riskScore ?? 0;
              const lastRiskEventAt =
                w.matchingProfile?.lastRiskEventAt ?? null;
              const risk = calculateRiskScore(
                currentRisk,
                lastRiskEventAt,
                'ABUSE',
                now,
              );
              const delta = RISK_DELTA_BY_EVENT.ABUSE;

              return [
                this.prisma.websiteMatchingProfile.update({
                  where: { websiteId: w.id },
                  data: {
                    riskScore: risk.riskScore,
                    lastRiskEventAt: now,
                    lastRiskReason: 'ABUSE',
                  },
                }),
                this.prisma.riskEvent.create({
                  data: {
                    websiteId: w.id,
                    type: 'ABUSE',
                    delta,
                    riskScoreAfter: risk.riskScore,
                  },
                }),
              ];
            })
            .flat(),
        );
      } catch (err) {
        this.logger.warn(
          `Failed to append ABUSE risk events for cluster ${flag.id}: ${(err as Error).message}`,
        );
      }
    }

    // Emit one admin notification per NEW flag (best-effort, never aborts scan).
    try {
      const typeLabels: Record<string, string> = {
        [PatternFlagType.CLUSTER_CONCENTRATION]: 'cluster concentration',
        [PatternFlagType.REPEAT_BURST]: 'repeat burst',
        [PatternFlagType.RECIPROCAL_RING]: 'reciprocal ring',
      };
      const label = typeLabels[type] ?? type;

      await this.notificationService.sendAdminNotification({
        type: NotificationType.ADMIN_MARKETPLACE_RISK_FLAGGED,
        category: NotificationCategory.ADMIN_RISK,
        title: `Pattern monitor: ${label}`,
        body: `${domainCount} domain(s) flagged for ${label} within ${Math.round(
          (windowEnd.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000),
        )}d.`,
        data: {
          type,
          domainCount,
          memberDomains,
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString(),
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to send pattern-flag admin notification for ${flag.id}: ${(err as Error).message}`,
      );
    }

    return true;
  }
}
