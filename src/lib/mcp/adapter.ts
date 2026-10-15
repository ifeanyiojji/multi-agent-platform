import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

type McpTool = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
};

export class ReadOnlyMcpAdapter {
  constructor(private readonly client: Pick<Client, "listTools" | "callTool">, private readonly allowlist: ReadonlySet<string>) {}

  async listTools() {
    const { tools } = await this.client.listTools();
    return (tools as McpTool[]).filter((tool) =>
      this.allowlist.has(tool.name) && tool.annotations?.readOnlyHint === true && tool.annotations.destructiveHint !== true,
    );
  }

  async callTool(name: string, args: Record<string, unknown>) {
    const tool = (await this.listTools()).find((candidate) => candidate.name === name);
    if (!tool) throw new Error("MCP tool is unavailable or not approved for read-only use.");
    return this.client.callTool({ name, arguments: args });
  }
}

export async function connectConfiguredMcp() {
  const endpoint = process.env.MCP_SERVER_URL;
  const allowlist = new Set((process.env.MCP_ALLOWED_TOOLS ?? "").split(",").map((name) => name.trim()).filter(Boolean));
  if (!endpoint || allowlist.size === 0) return null;

  const url = new URL(endpoint);
  const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(localDevelopment && url.protocol === "http:")) {
    throw new Error("MCP endpoints must use HTTPS outside local development.");
  }
  if (url.username || url.password) throw new Error("MCP credentials must be provided through a secure transport configuration.");

  const client = new Client({ name: "agentic-workflow-worker", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(url);
  await client.connect(transport);
  return { adapter: new ReadOnlyMcpAdapter(client, allowlist), close: () => client.close() };
}