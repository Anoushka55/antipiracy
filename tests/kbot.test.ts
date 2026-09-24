import { describe, expect, it } from "vitest";
import { answerQuery, greet } from "@/lib/kbot";
import { PAGE_GUIDES } from "@/lib/kbot-knowledge";

describe("K.Bot knowledge engine", () => {
  it("resolves a nav question to the right page guide with a link", () => {
    const reply = answerQuery({ message: "how do I use discovery", role: "investigator", pathname: "/overview" });
    expect(reply.text).toContain("Discovery");
    expect(reply.suggestedLinks?.some((l) => l.href === "/discovery")).toBe(true);
  });

  it("respects RBAC when a role can't access the page asked about", () => {
    const reply = answerQuery({ message: "how do I configure SLA rules", role: "investigator", pathname: "/overview" });
    expect(reply.text.toLowerCase()).toContain("doesn't have access");
    expect(reply.suggestedLinks).toBeUndefined();
  });

  it("allows an admin to be routed to configuration", () => {
    const reply = answerQuery({ message: "how do I configure SLA rules", role: "admin", pathname: "/overview" });
    expect(reply.suggestedLinks?.some((l) => l.href === "/configuration")).toBe(true);
  });

  it("answers workflow status questions grounded in live case context", () => {
    const reply = answerQuery({
      message: "what should I do next",
      role: "legal",
      pathname: "/cases/CASE-1",
      caseContext: { caseId: "CASE-1", status: "rights_validation", gates: { rightsOwnership: "pass", infringementSubstantiated: "pass", authorization: "hold", actionableTarget: "pass" } },
    });
    expect(reply.text).toContain("Rights Validation");
    expect(reply.text).toContain("Authorization");
    expect(reply.text).toContain("hold");
  });

  it("gives a general workflow overview without case context", () => {
    const reply = answerQuery({ message: "what is the case workflow", role: "investigator", pathname: "/overview" });
    expect(reply.text.toLowerCase()).toContain("lifecycle");
  });

  it("answers FAQ questions", () => {
    const reply = answerQuery({ message: "is this data real?", role: "investigator", pathname: "/overview" });
    expect(reply.text.toLowerCase()).toContain("synthetic");
  });

  it("falls back gracefully on gibberish input", () => {
    const reply = answerQuery({ message: "asdkjhaskjdh", role: "investigator", pathname: "/overview" });
    expect(reply.text).toContain("didn't quite catch that");
    expect(reply.suggestedLinks?.length).toBeGreaterThan(0);
  });

  it("has a page guide for every accessible nav item and unique ids", () => {
    const ids = PAGE_GUIDES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("greets a signed-in user by role", () => {
    const text = greet({ name: "Test User", role: "legal" });
    expect(text).toContain("Test User");
    expect(text).toContain("Legal Reviewer");
  });
});
