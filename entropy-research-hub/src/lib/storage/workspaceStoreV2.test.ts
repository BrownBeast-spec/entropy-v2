import { beforeEach, describe, expect, it } from "vitest";
import { workspaceStoreV2 } from "./workspaceStoreV2";
import {
  WorkspaceNode,
  WorkspaceEdge,
  WorkspaceProvenance,
} from "./workspaceStoreV2";

function provenance(query: string): WorkspaceProvenance {
  return {
    source: "Open Targets",
    query,
    timestamp: new Date().toISOString(),
    rawResponseHash: `hash-${query}`,
  };
}

function makeNode(id: string, query: string): WorkspaceNode {
  return {
    id,
    type: "protein",
    label: id,
    data: { symbol: id },
    provenance: [provenance(query)],
  };
}

function makeEdge(source: string, target: string): WorkspaceEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: "association",
    confidence: 0.8,
    evidenceTypes: ["text-mining"],
    provenance: [provenance("edge-query")],
  };
}

describe("workspaceStoreV2", () => {
  beforeEach(async () => {
    await workspaceStoreV2.clear();
  });

  it("createWorkspace creates workspace with defaults and unique ID", async () => {
    const ws1 = await workspaceStoreV2.createWorkspace("WS 1", "", "Researcher");
    const ws2 = await workspaceStoreV2.createWorkspace("WS 2", "", "Strategist");

    expect(ws1.id).toBeTruthy();
    expect(ws2.id).toBeTruthy();
    expect(ws1.id).not.toBe(ws2.id);
    expect(ws1.mode).toBe("Researcher");
    expect(ws2.mode).toBe("Strategist");
    expect(ws1.indiaLens).toBe(false);
    expect(ws1.nodes).toEqual([]);
    expect(ws1.edges).toEqual([]);
    expect(ws1.queries).toEqual([]);
  });

  it("augmentGraph merges nodes without duplicating same id", async () => {
    const ws = await workspaceStoreV2.createWorkspace("WS", "", "Researcher");
    const node = makeNode("P12345", "q1");

    await workspaceStoreV2.augmentGraph(ws.id, "q1", [node], []);
    await workspaceStoreV2.augmentGraph(ws.id, "q2", [makeNode("P12345", "q2")], []);

    const updated = await workspaceStoreV2.getById(ws.id);
    expect(updated).not.toBeNull();
    expect(updated!.nodes).toHaveLength(1);
  });

  it("augmentGraph merges provenance arrays for same node id", async () => {
    const ws = await workspaceStoreV2.createWorkspace("WS", "", "Researcher");

    await workspaceStoreV2.augmentGraph(ws.id, "q1", [makeNode("P12345", "q1")], []);
    await workspaceStoreV2.augmentGraph(ws.id, "q2", [makeNode("P12345", "q2")], []);

    const updated = await workspaceStoreV2.getById(ws.id);
    expect(updated).not.toBeNull();
    expect(updated!.nodes[0].provenance).toHaveLength(2);
  });

  it("removeNode removes node and edges referencing it", async () => {
    const ws = await workspaceStoreV2.createWorkspace("WS", "", "Researcher");

    await workspaceStoreV2.augmentGraph(
      ws.id,
      "q1",
      [makeNode("P1", "q1"), makeNode("P2", "q1")],
      [makeEdge("P1", "P2")],
    );

    await workspaceStoreV2.removeNode(ws.id, "P1");

    const updated = await workspaceStoreV2.getById(ws.id);
    expect(updated).not.toBeNull();
    expect(updated!.nodes.map((n) => n.id)).toEqual(["P2"]);
    expect(updated!.edges).toEqual([]);
  });

  it("exportWorkspaceJSON returns JSON-serializable workspace object", async () => {
    const ws = await workspaceStoreV2.createWorkspace("WS", "desc", "Researcher");
    await workspaceStoreV2.augmentGraph(ws.id, "q1", [makeNode("P1", "q1")], []);

    const exported = await workspaceStoreV2.exportWorkspaceJSON(ws.id);
    expect(exported).not.toBeNull();
    expect(() => JSON.stringify(exported)).not.toThrow();
    expect(exported!.id).toBe(ws.id);
  });

  it("getGraphSnapshot returns summary representation", async () => {
    const ws = await workspaceStoreV2.createWorkspace("WS", "", "Researcher");
    await workspaceStoreV2.augmentGraph(
      ws.id,
      "q1",
      [makeNode("P1", "q1"), makeNode("P2", "q1")],
      [makeEdge("P1", "P2")],
    );

    const snapshot = await workspaceStoreV2.getGraphSnapshot(ws.id);
    expect(snapshot.nodeIds.sort()).toEqual(["P1", "P2"]);
    expect(snapshot.edgeSummary).toHaveLength(1);
    expect(snapshot.edgeSummary[0].source).toBe("P1");
    expect(snapshot.edgeSummary[0].target).toBe("P2");
  });

  it("returns null for unknown workspace id", async () => {
    const exported = await workspaceStoreV2.exportWorkspaceJSON("missing");
    const snapshot = await workspaceStoreV2.getGraphSnapshot("missing");
    expect(exported).toBeNull();
    expect(snapshot).toEqual({ nodeIds: [], edgeSummary: [] });
  });
});
