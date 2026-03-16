import { describe, it, expect } from "vitest";
import { api } from "@/lib/api";

describe("api", () => {
  it("returns user data", async () => {
    const user = await api.getUser();
    expect(user).toBeDefined();
    expect(user.id).toBe("p-001");
    expect(user.firstName).toBe("Sarah");
    expect(user.lastName).toBe("Johnson");
  });

  it("returns appointments", async () => {
    const appointments = await api.getAppointments();
    expect(appointments).toBeDefined();
    expect(appointments.length).toBeGreaterThan(0);
    expect(appointments[0]).toHaveProperty("doctorName");
    expect(appointments[0]).toHaveProperty("status");
  });

  it("returns only upcoming appointments", async () => {
    const upcoming = await api.getUpcomingAppointments();
    expect(upcoming.every((a) => a.status === "scheduled")).toBe(true);
  });

  it("returns lab results", async () => {
    const results = await api.getLabResults();
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty("testName");
    expect(results[0]).toHaveProperty("status");
  });

  it("returns messages", async () => {
    const messages = await api.getMessages();
    expect(messages).toBeDefined();
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toHaveProperty("subject");
    expect(messages[0]).toHaveProperty("body");
  });

  it("returns unread message count", async () => {
    const count = await api.getUnreadMessageCount();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("returns health check", async () => {
    const health = await api.healthCheck();
    expect(health.status).toBe("healthy");
    expect(health).toHaveProperty("version");
  });
});
