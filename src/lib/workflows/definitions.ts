export const AGENTS = [
  { key: "research", name: "Research", role: "Find relevant evidence, assumptions, and sourceable facts." },
  { key: "analysis", name: "Analysis", role: "Reason through the problem, compare options, and identify implications." },
  { key: "planning", name: "Planning", role: "Produce an ordered, practical implementation or action plan." },
  { key: "technical", name: "Technical", role: "Assess technical feasibility, architecture, and concrete implementation details." },
  { key: "validation", name: "Validation", role: "Check the preceding work for gaps, contradictions, and unsupported claims." },
  { key: "synthesis", name: "Synthesis", role: "Create the final, coherent report from validated findings." },
] as const;

export type AgentKey = (typeof AGENTS)[number]["key"];

export const AGENT_KEYS = AGENTS.map((agent) => agent.key) as [AgentKey, ...AgentKey[]];

export const agentByKey = (key: AgentKey) => AGENTS.find((agent) => agent.key === key)!;