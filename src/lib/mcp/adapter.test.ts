import { describe, expect, it, vi } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ReadOnlyMcpAdapter } from "./adapter";

describe("read-only MCP adapter", () => {
  const tools = [
    { name: "lookup", inputSchema: {}, annotations: { readOnlyHint: true } },
    { name: "write", inputSchema: {}, annotations: { readOnlyHint: false } },
    { name: "delete", inputSchema: {}, annotations: { readOnlyHint: true, destructiveHint: true } },
    { name: "unapproved", inputSchema: {}, annotations: { readOnlyHint: true } },
  ];

  function createAdapter() {
    const client = {
      listTools: vi.fn(async () => ({ tools })),
      callTool: vi.fn(async () => ({ content: [{ type: "text", text: "result" }] })),
    } as unknown as Pick<Client, "listTools" | "callTool">;
    return { adapter: new ReadOnlyMcpAdapter(client, new Set(["lookup", "write", "delete"])), client };
  }

  it("exposes only explicitly allow-listed non-destructive read-only tools", async () => {
    const { adapter } = createAdapter();
    await expect(adapter.listTools()).resolves.toEqual([tools[0]]);
  });

  it("rejects unapproved tools without invoking the client", async () => {
    const { adapter, client } = createAdapter();
    await expect(adapter.callTool("write", {})).rejects.toThrow("not approved");
    expect(client.callTool).not.toHaveBeenCalled();
  });

  it("dispatches calls for an approved read-only tool", async () => {
    const { adapter, client } = createAdapter();
    await adapter.callTool("lookup", { query: "status" });
    expect(client.callTool).toHaveBeenCalledWith({ name: "lookup", arguments: { query: "status" } });
  });
});