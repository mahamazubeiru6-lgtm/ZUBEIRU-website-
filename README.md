# DataHub Frontend

Production React frontend for the data-sales backend. It includes customer purchasing, authentication, orders and transactions; admin users, packages, notices and withdrawals; agent pricing and sub-agent management; and sub-agent pricing and dashboards.

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm start
```

The Django backend defaults to `http://localhost:8000`. Change `REACT_APP_API_BASE_URL` for deployment. Set `REACT_APP_STOREFRONT_DOMAIN` to the shared domain used for agent and sub-agent storefronts.

## Validation

```powershell
npm test
npm run build
```

