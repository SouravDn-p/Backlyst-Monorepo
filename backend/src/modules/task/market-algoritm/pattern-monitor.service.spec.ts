import { PatternMonitorService } from './pattern-monitor.service';

/**
 * Unit tests for the iterative Tarjan SCC implementation.
 * `findSccs` is private, so we access it via a typed bracket reference.
 */
describe('PatternMonitorService.findSccs (Tarjan)', () => {
  // Build an adjacency Map from an edge list of [from, to].
  function graphFrom(edges: Array<[string, string]>) {
    const adjacency = new Map<string, string[]>();
    const nodes = new Set<string>();
    for (const [from, to] of edges) {
      nodes.add(from);
      nodes.add(to);
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from)!.push(to);
      if (!adjacency.has(to)) adjacency.set(to, []);
    }
    return { nodes: [...nodes], adjacency };
  }

  function sccsOf(
    service: PatternMonitorService,
    edges: Array<[string, string]>,
  ) {
    const { nodes, adjacency } = graphFrom(edges);
    const sccs = (
      service as unknown as {
        findSccs(n: string[], a: Map<string, string[]>): string[][];
      }
    ).findSccs(nodes, adjacency);
    // Normalize: sort components and their members for stable comparison.
    return sccs
      .map((c) => [...c].sort())
      .sort((a, b) => a[0].localeCompare(b[0]));
  }

  const service = new PatternMonitorService(
    // prisma / notificationService are unused by findSccs; cast minimally.
    { domainInteraction: {} } as never,
    { sendAdminNotification: jest.fn() } as never,
  );

  it('returns single nodes as singleton SCCs for an empty graph', () => {
    const sccs = sccsOf(service, []);
    expect(sccs).toEqual([]);
  });

  it('detects a single 4-node cycle as one SCC of size 4', () => {
    const sccs = sccsOf(service, [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['d', 'a'],
    ]);
    expect(sccs).toEqual([['a', 'b', 'c', 'd']]);
  });

  it('separates disjoint cycles into distinct SCCs', () => {
    const sccs = sccsOf(service, [
      ['a', 'b'],
      ['b', 'a'],
      ['c', 'd'],
      ['d', 'c'],
    ]);
    expect(sccs).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps a tree (acyclic) as singleton SCCs', () => {
    const sccs = sccsOf(service, [
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'd'],
    ]);
    expect(sccs).toEqual([['a'], ['b'], ['c'], ['d']]);
  });

  it('handles two interconnected cycles (nested SCC) as one component', () => {
    const sccs = sccsOf(service, [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'a'], // outer cycle a-b-c
      ['b', 'd'],
      ['d', 'b'], // inner cycle b-d reachable from outer
    ]);
    expect(sccs).toEqual([['a', 'b', 'c', 'd']]);
  });

  it('handles a larger 8-node cycle (HIGH threshold) as one SCC', () => {
    const nodes = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'];
    const edges: Array<[string, string]> = [];
    for (let i = 0; i < nodes.length; i++) {
      edges.push([nodes[i], nodes[(i + 1) % nodes.length]]);
    }
    const sccs = sccsOf(service, edges);
    expect(sccs).toEqual([nodes]);
  });
});
