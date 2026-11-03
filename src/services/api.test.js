import { checkBackendHealth } from "./api";

test("accepts the backend health contract", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ status: "ok" })
  });
  await expect(checkBackendHealth()).resolves.toEqual({ status: "ok" });
  expect(global.fetch).toHaveBeenCalledWith("http://localhost:8000/health/", { signal: undefined });
});
