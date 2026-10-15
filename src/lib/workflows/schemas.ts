import { z } from "zod";
import { AGENT_KEYS } from "./definitions";

export const workflowRequestSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  prompt: z.string().trim().min(20).max(8_000),
});

export const orchestrationPlanSchema = z.object({
  summary: z.string().min(10).max(500),
  delegations: z.array(
    z.object({
      agent: z.enum(AGENT_KEYS),
      instruction: z.string().min(15).max(700),
    }),
  ).length(6),
}).superRefine((plan, context) => {
  const agents = plan.delegations.map((delegation) => delegation.agent);
  if (new Set(agents).size !== AGENT_KEYS.length || AGENT_KEYS.some((key) => !agents.includes(key))) {
    context.addIssue({ code: "custom", message: "The plan must delegate exactly once to every agent." });
  }
});

export const agentResultSchema = z.object({
  summary: z.string().min(10).max(800),
  findings: z.array(z.string().min(4).max(500)).max(8),
  recommendations: z.array(z.string().min(4).max(500)).max(6),
  caveats: z.array(z.string().min(4).max(500)).max(6),
});

export const synthesisSchema = z.object({
  summary: z.string().min(20).max(800),
  reportMarkdown: z.string().min(100).max(12_000),
});