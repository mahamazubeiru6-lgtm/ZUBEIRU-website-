import { prepareAuthRequestOptions } from "./AuthProvider";

describe("prepareAuthRequestOptions", () => {
  test("adds the JSON media type to an already-stringified request body", () => {
    const options = prepareAuthRequestOptions({
      method: "POST",
      body: JSON.stringify({ name: "1 GB" }),
    });

    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.body).toBe('{"name":"1 GB"}');
  });

  test("serializes object bodies and adds authentication headers", () => {
    const options = prepareAuthRequestOptions(
      { method: "PATCH", body: { is_active: true } },
      { accessToken: "access-token", subdomain: "shop" }
    );

    expect(options.body).toBe('{"is_active":true}');
    expect(options.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer access-token",
      "X-Subdomain": "shop",
    });
  });

  test("lets the browser set the multipart boundary for FormData", () => {
    const options = prepareAuthRequestOptions({
      method: "POST",
      body: new FormData(),
    });

    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.body).toBeInstanceOf(FormData);
  });

  test("preserves an explicitly supplied content type", () => {
    const options = prepareAuthRequestOptions({
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "plain text",
    });

    expect(options.headers["content-type"]).toBe("text/plain");
    expect(options.headers["Content-Type"]).toBeUndefined();
  });
});
