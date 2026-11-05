import { createContext } from 'react';

export const transformUserData = (apiUser) => {
    const isAgentLike = apiUser.role === 'AGENT' || apiUser.role === 'SUB_AGENT';
    const registrationFeePaid = apiUser.agent_profile?.registration_fee_paid ?? true;

    return {
        ...apiUser,
        id: apiUser.id,
        username: apiUser.username,
        email: apiUser.email,
        phone_number: apiUser.phone_number,
        first_name: apiUser.first_name,
        last_name: apiUser.last_name,
        full_name: `${apiUser.first_name} ${apiUser.last_name}`.trim(),
        role: apiUser.role,
        is_active: apiUser.is_active,
        date_joined: apiUser.date_joined,
        updated_at: apiUser.updated_at,
        agent_profile: apiUser.agent_profile,
        is_unpaid_agent: isAgentLike && registrationFeePaid === false,
        is_fully_registered_agent: isAgentLike && registrationFeePaid === true,
    };
};

export const AuthContext = createContext(undefined);

