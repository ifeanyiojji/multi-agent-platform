import { describe, expect, it } from "vitest";
import { AGENTS } from "./definitions";
import { agentResultSchema, orchestrationPlanSchema, workflowRequestSchema } from "./schemas";

describe("workflow request validation", () => {
  it("trims an accepted task and retains an optional title", () => {
    expect(workflowRequestSchema.parse({ title: "  Review Q3 plan  ", prompt: "  Assess the roadmap and explain the delivery risks.  " })).toEqual({
      title: "Review Q3 plan",
      prompt: "Assess the roadmap and explain the delivery risks.",
    });
  });

  it("rejects missing, short, and oversized briefs", () => {
    expect(workflowRequestSchema.safeParse({ prompt: "too short" }).success).toBe(false);
    expect(workflowRequestSchema.safeParse({ prompt: "x".repeat(8_001) }).success).toBe(false);
    expect(workflowRequestSchema.safeParse(null).success).toBe(false);
  });
});

describe("orchestration handoffs", () => {
  const plan = {
    summary: "Split the request into a research and analysis workflow.",
    delegations: AGENTS.map((agent) => ({ agent: agent.key, instruction: `Complete the ${agent.name.toLowerCase()} review with specific findings.` })),
  };

  it("accepts one bounded delegation per specialist", () => {
    expect(orchestrationPlanSchema.safeParse(plan).success).toBe(true);
  });

  it("rejects duplicated or missing agent assignments", () => {
    const duplicate = structuredClone(plan);
    duplicate.delegations[5].agent = "research";
    expect(orchestrationPlanSchema.safeParse(duplicate).success).toBe(false);
    expect(orchestrationPlanSchema.safeParse({ ...plan, delegations: plan.delegations.slice(1) }).success).toBe(false);
  });

  it("rejects malformed agent result fields", () => {
    expect(agentResultSchema.safeParse({ summary: "Done", findings: [], recommendations: [], caveats: [] }).success).toBe(false);
  });
});