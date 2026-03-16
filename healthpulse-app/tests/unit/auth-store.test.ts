import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/hooks/use-auth-store";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it("starts unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it("logs in with valid credentials", async () => {
    const { login } = useAuthStore.getState();
    const result = await login("sarah.johnson@email.com", "password");
    expect(result).toBe(true);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).not.toBeNull();
    expect(state.user?.firstName).toBe("Sarah");
  });

  it("logs in with any non-empty credentials (demo mode)", async () => {
    const { login } = useAuthStore.getState();
    const result = await login("test@test.com", "any-password");
    expect(result).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("logs out correctly", async () => {
    const { login } = useAuthStore.getState();
    await login("test@test.com", "password");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
