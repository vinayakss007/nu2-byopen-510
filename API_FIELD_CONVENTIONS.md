# NuCRM API Field Conventions

**Important:** This document explains the field naming conventions used in the NuCRM API.

---

## Field Naming Convention

### Input (POST/PATCH Requests)
Use **snake_case** for all field names:

| Entity | Field | Correct | Incorrect |
|--------|-------|---------|-----------|
| Contact | First Name | `first_name` | `firstName` |
| Contact | Last Name | `last_name` | `lastName` |
| Contact | Job Title | `job_title` | `jobTitle` |
| Contact | Lead Source | `lead_source` | `leadSource` |
| Contact | Lead Status | `lead_status` | `leadStatus` |
| Contact | Company ID | `company_id` | `companyId` |
| Contact | Assigned To | `assigned_to` | `assignedTo` |
| | | | |
| Company | Company Size | `company_size` | `companySize` |
| Company | Annual Revenue | `annual_revenue` | `annualRevenue` |
| Company | Founded Year | `founded_year` | `foundedYear` |
| Company | Phone Number | `phone_number` | `phoneNumber` |
| | | | |
| Deal | Stage ID | `stage_id` | `stageId` |
| Deal | Pipeline ID | `pipeline_id` | `pipelineId` |
| Deal | Close Date | `close_date` | `closeDate` |
| Deal | Assigned To | `assigned_to` | `assignedTo` |
| Deal | Created By | `created_by` | `createdBy` |
| | | | |
| Task | Due Date | `due_date` | `dueDate` |
| Task | Completed At | `completed_at` | `completedAt` |
| Task | Contact ID | `contact_id` | `contactId` |
| Task | Deal ID | `deal_id` | `dealId` |
| | | | |
| Lead | Company Name | `company_name` | `companyName` |
| Lead | Lead Source | `lead_source` | `leadSource` |
| Lead | Lead Status | `lead_status` | `leadStatus` |

---

## Output (GET Responses)

All responses return **camelCase** field names:

```json
{
  "id": "abc123",
  "firstName": "John",
  "lastName": "Doe",
  "jobTitle": "CEO",
  "leadStatus": "new",
  "createdAt": "2026-05-10T09:35:10.853Z"
}
```

---

## Example API Calls

### Create Contact
```bash
curl -X POST http://localhost:3005/api/tenant/contacts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "job_title": "CEO"
  }'
```

### Create Deal
```bash
curl -X POST http://localhost:3005/api/tenant/deals \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Website Redesign",
    "amount": 50000,
    "stage_id": "STAGE_ID_HERE",
    "probability": 25,
    "close_date": "2026-06-30"
  }'
```

### Create Lead
```bash
curl -X POST http://localhost:3005/api/tenant/leads \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Bob",
    "last_name": "Wilson",
    "email": "bob@test.com",
    "company_name": "Startup Inc",
    "lead_source": "Website"
  }'
```

### Create Task
```bash
curl -X POST http://localhost:3005/api/tenant/tasks \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Follow up with client",
    "description": "Call John tomorrow",
    "priority": "high",
    "due_date": "2026-05-15"
  }'
```

---

## Complete Field Reference

### Contact Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | Yes | Contact's first name |
| `last_name` | string | No | Contact's last name |
| `email` | string | No | Primary email address |
| `phone` | string | No | Phone number |
| `mobile_phone` | string | No | Mobile phone |
| `job_title` | string | No | Job title |
| `department` | string | No | Department |
| `company_id` | uuid | No | Associated company |
| `assigned_to` | uuid | No | Assigned user |
| `lead_status` | string | No | new, contacted, qualified, converted, unqualified |
| `lead_source` | string | No | Source of the lead |
| `score` | number | No | Lead score (0-100) |

### Company Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Company name |
| `domain` | string | No | Website domain |
| `industry` | string | No | Industry |
| `company_size` | string | No | 1-10, 11-50, 51-200, 201-500, 500+ |
| `phone` | string | No | Phone number |
| `address` | string | No | Full address |
| `city` | string | No | City |
| `state` | string | No | State/Province |
| `country` | string | No | Country |
| `postal_code` | string | No | Postal code |

### Deal Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Deal name |
| `amount` | number | No | Deal value |
| `stage_id` | uuid | No | Current pipeline stage |
| `pipeline_id` | uuid | No | Pipeline |
| `probability` | number | No | Win probability (0-100) |
| `close_date` | date | No | Expected close date |
| `contact_id` | uuid | No | Associated contact |
| `company_id` | uuid | No | Associated company |
| `assigned_to` | uuid | No | Assigned user |

### Task Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Task title |
| `description` | string | No | Task description |
| `priority` | string | No | low, medium, high |
| `status` | string | No | pending, in_progress, completed |
| `due_date` | date | No | Due date |
| `contact_id` | uuid | No | Associated contact |
| `deal_id` | uuid | No | Associated deal |
| `assigned_to` | uuid | No | Assigned user |

### Lead Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | Yes | Lead's first name |
| `last_name` | string | No | Lead's last name |
| `email` | string | No | Email address |
| `phone` | string | No | Phone number |
| `company_name` | string | No | Company name |
| `lead_source` | string | No | Source (Website, Referral, etc) |
| `lead_status` | string | No | new, contacted, qualified, converted, unqualified |
| `score` | number | No | Lead score |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│  INPUT:  snake_case  (first_name, last_name)         │
│  OUTPUT: camelCase   (firstName, lastName)           │
└─────────────────────────────────────────────────────────┘
```

---

*Last Updated: May 10, 2026*