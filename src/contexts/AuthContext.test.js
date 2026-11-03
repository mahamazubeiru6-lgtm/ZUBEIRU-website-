import { transformUserData } from "./AuthContext";

test("marks unpaid agents for the registration gate", () => {
  const user = transformUserData({
    id: "agent-1",
    username: "agent",
    first_name: "Ada",
    last_name: "Agent",
    role: "AGENT",
    agent_profile: { registration_fee_paid: false },
  });

  expect(user.is_unpaid_agent).toBe(true);
  expect(user.is_fully_registered_agent).toBe(false);
});

test("does not gate customers or paid agents", () => {
  const customer = transformUserData({
    id: "customer-1",
    username: "customer",
    first_name: "Casey",
    last_name: "Customer",
    role: "CUSTOMER",
    agent_profile: null,
  });
  const agent = transformUserData({
    id: "agent-2",
    username: "paid-agent",
    first_name: "Pat",
    last_name: "Agent",
    role: "AGENT",
    agent_profile: { registration_fee_paid: true },
  });

  expect(customer.is_unpaid_agent).toBe(false);
  expect(agent.is_unpaid_agent).toBe(false);
  expect(agent.is_fully_registered_agent).toBe(true);
});
