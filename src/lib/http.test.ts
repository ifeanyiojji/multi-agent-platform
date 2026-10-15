import { describe, expect, it } from "vitest";
import { readBoundedJson, RequestBodyTooLargeError } from "./http";

describe("bounded JSON request reader", () => {
  it("parses JSON within the byte limit", async () => {
    const request = new Request("https://example.test", { method: "POST", body: JSON.stringify({ prompt: "short" }) });
    await expect(readBoundedJson(request, 100)).resolves.toEqual({ prompt: "short" });
  });

  it("rejects oversized content-length before reading", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "content-length": "101" },
      body: "{}",
    });
    await expect(readBoundedJson(request, 100)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("rejects streamed bodies that exceed the byte limit", async () => {
    const request = new Request("https://example.test", { method: "POST", body: "x".repeat(101) });
    await expect(readBoundedJson(request, 100)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("returns null for malformed JSON", async () => {
    const request = new Request("https://example.test", { method: "POST", body: "{" });
    await expect(readBoundedJson(request, 100)).resolves.toBeNull();
  });
});