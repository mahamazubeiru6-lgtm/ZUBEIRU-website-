import {
  buildStoreContext,
  deriveSidebarStore,
  deriveStoreAccess,
  normalizeStoreSlug,
} from "./useAgentContext";

const agentStore = buildStoreContext({
  agent: { id: "agent-user", role: "AGENT" },
  profile: {
    id: "agent-profile",
    user_id: "agent-user",
    store_url: "agent-shop",
    shop_name: "Agent Shop",
  },
});

test("normalizes full storefront URLs to their store slug", () => {
  expect(normalizeStoreSlug("https://Agent-Shop.lvh.me/")).toBe("agent-shop");
});

test("the sidebar shares the visitor's own store before the current store", () => {
  const ownStore = deriveSidebarStore({
    user: {
      role: "AGENT",
      username: "agent-user",
      agent_profile: { shop_name: "My Shop" },
    },
    storeContext: agentStore,
    fullOwnStoreUrl: "https://my-shop.lvh.me",
    fullCurrentStoreUrl: "https://agent-shop.lvh.me",
  });
  const visitorStore = deriveSidebarStore({
    user: null,
    storeContext: agentStore,
    fullOwnStoreUrl: null,
    fullCurrentStoreUrl: "https://agent-shop.lvh.me",
  });

  expect(ownStore).toMatchObject({
    url: "https://my-shop.lvh.me",
    isOwnStore: true,
    shopName: "My Shop",
    role: "AGENT",
  });
  expect(visitorStore).toMatchObject({
    url: "https://agent-shop.lvh.me",
    isOwnStore: false,
    shopName: "Agent Shop",
    role: "AGENT",
  });
});

test("agents receive tools only on their own storefront", () => {
  const user = {
    id: "agent-user",
    role: "AGENT",
    agent_profile: { id: "agent-profile", store_url: "agent-shop" },
  };

  expect(
    deriveStoreAccess({ user, isAuthenticated: true, storeContext: agentStore })
      .canUseRoleTools
  ).toBe(true);
  expect(
    deriveStoreAccess({ user, isAuthenticated: true, storeContext: null })
      .canUseRoleTools
  ).toBe(false);
  expect(
    deriveStoreAccess({
      user,
      isAuthenticated: true,
      storeContext: { ...agentStore, ownerUserId: "other", profileId: "other", storeUrl: "other" },
    }).canUseRoleTools
  ).toBe(false);
});

test("sub-agents receive tools on their own or their parent agent storefront", () => {
  const user = {
    id: "sub-user",
    role: "SUB_AGENT",
    agent_profile: {
      id: "sub-profile",
      parent_agent: "agent-profile",
      store_url: "sub-shop",
    },
  };
  const ownStore = {
    type: "subagent",
    role: "SUB_AGENT",
    ownerUserId: "sub-user",
    profileId: "sub-profile",
    storeUrl: "sub-shop",
  };

  expect(
    deriveStoreAccess({ user, isAuthenticated: true, storeContext: ownStore })
      .canUseRoleTools
  ).toBe(true);
  expect(
    deriveStoreAccess({ user, isAuthenticated: true, storeContext: agentStore })
      .canUseRoleTools
  ).toBe(true);
});

test("customers get main-site tools and can join an agent storefront", () => {
  const user = { id: "customer", role: "CUSTOMER", agent_profile: null };
  const mainAccess = deriveStoreAccess({
    user,
    isAuthenticated: true,
    storeContext: null,
  });
  const storeAccess = deriveStoreAccess({
    user,
    isAuthenticated: true,
    storeContext: agentStore,
  });

  expect(mainAccess.canUseRoleTools).toBe(true);
  expect(storeAccess.canUseRoleTools).toBe(false);
  expect(storeAccess.canBecomeSubAgent).toBe(true);
});

test("admins retain their tools in every storefront context", () => {
  const access = deriveStoreAccess({
    user: { id: "admin", role: "ADMIN" },
    isAuthenticated: true,
    storeContext: agentStore,
  });

  expect(access.canUseRoleTools).toBe(true);
});
