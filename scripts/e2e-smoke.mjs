import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 3187;
let baseUrl = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
let server;

async function isAgenticApp(url) {
  try {
    const response = await fetch(`${url}/login`, { redirect: "manual", signal: AbortSignal.timeout(1000) });
    return response.status === 200 && (await response.text()).includes("Agentic | Enterprise orchestration");
  } catch {
    return false;
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) throw new Error(`Next.js exited with code ${server.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("Next.js did not become ready within 30 seconds.");
}

try {
  if (process.env.E2E_BASE_URL) {
    if (!(await isAgenticApp(baseUrl))) throw new Error("E2E_BASE_URL does not serve the Agentic application.");
  } else if (await isAgenticApp("http://127.0.0.1:3000")) {
    baseUrl = "http://127.0.0.1:3000";
  } else {
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
      stdio: "ignore",
      env: {
        ...process.env,
        AUTH_SECRET: "local-e2e-only-secret-not-for-production",
        AUTH_URL: `http://127.0.0.1:${port}`,
        DATABASE_URL: "postgresql://e2e:e2e@127.0.0.1:5432/e2e",
      },
    });
    await waitForServer();
  }

  const protectedPage = await fetch(baseUrl, { redirect: "manual" });
  assert.equal(protectedPage.status, 307, "dashboard redirects unauthenticated users");
  assert.equal(protectedPage.headers.get("location"), "/login");

  const unauthenticatedApi = await fetch(`${baseUrl}/api/workflows`);
  assert.equal(unauthenticatedApi.status, 401, "workflow history requires a session");

  const invalidRegistration = await fetch(`${baseUrl}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "E2E", email: "bad", password: "short" }),
  });
  assert.equal(invalidRegistration.status, 400, "invalid credentials are rejected before database access");

  console.log("E2E smoke checks passed: protected dashboard, private API, and registration validation.");
} finally {
  server?.kill();
}