# NuCRM

A production-ready multi-tenant CRM built with **Next.js 16**, **Node.js 22**, and **PostgreSQL**.

## Tech Stack

- Next.js 16 (App Router + Turbopack)
- Node.js 22
- PostgreSQL 15+ with Drizzle ORM
- JWT authentication (cookie-based)
- TypeScript

## Features

- **Contacts, Companies, Deals, Tasks**
- **Leads with pipeline**
- **Calendar**
- **Analytics**
- **Email templates & sequences**
- **Workflow automation**
- **Multi-tenant with workspaces**

## Quick Deploy (VM)

```bash
# Clone
git clone https://github.com/vinayakss007/nu2-byopen-510.git
cd nu2-byopen-510

# Install
npm install

# Database
npm run db:push

# Create admin
curl -X POST http://localhost:3000/api/setup/create-admin \
  -H "Content-Type: application/json" \
  -H "X-Setup-Key: admin-setup-key-2026" \
  -d '{"email":"admin@nu2.com","password":"AdminPass123!","full_name":"Admin","workspace_name":"NuCRM"}'

# Run
npm run dev
```

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DATABASE_SSL=false
JWT_SECRET=your-secret-key
SETUP_KEY=admin-setup-key-2026
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## API Endpoints

| Endpoint | Method | Description |
|---------|--------|-------------|
| `/api/auth/login` | POST | Login |
| `/api/auth/signup` | POST | Create workspace |
| `/api/auth/logout` | POST | Logout |
| `/api/tenant/contacts` | GET/POST | Contacts |
| `/api/tenant/companies` | GET/POST | Companies |
| `/api/tenant/deals` | GET/POST | Deals |
| `/api/tenant/tasks` | GET/POST | Tasks |
| `/api/superadmin/*` | GET | Super admin APIs |

## License

MIT