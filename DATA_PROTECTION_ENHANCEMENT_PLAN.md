# NuCRM - Data Protection & Safety Enhancement Plan
**Goal:** Raise Score from 7.5 to 9.8  
**Focus:** Data Protection, Accident Prevention, Safety Policies

---

## Current State Analysis

### Already Implemented ✅
| Feature | Status |
|---------|--------|
| Soft Delete (deletedAt) | ✅ All tables |
| Trash/Recycle Bin | ✅ API exists |
| Restore from Trash | ✅ API exists |
| Audit Logging | ✅ logAudit() implemented |
| Permanent Delete confirmation | ✅ Requires confirmation |
| Backup system | ✅ Full/partial backups |
| Selective Restore | ✅ User/table filters |
| Row Level Security (RLS) | ✅ Tenant isolation |

### Missing/Needs Enhancement ⚠️
| Feature | Current | Needed |
|---------|---------|---------|
| Trash retention period | None | Configurable (30/60/90 days) |
| Permanent delete timeout | None | Delay before actual deletion |
| Bulk delete protection | None | Require confirmation |
| Edit history/versions | None | Track changes |
| Data export audit | None | Log all exports |
| Sensitive data encryption | Partial | Field-level encryption |
| Delete notifications | None | Alert before deletion |
| Restore point snapshots | None | Auto-snapshots |

---

## Action Plan to Reach 9.8

### PHASE 1: Trash & Retention (Priority HIGH)

#### 1.1 Configurable Trash Retention
**File:** `app/api/tenant/trash/settings/route.ts` (NEW)
- Add tenant setting for trash retention (30/60/90/180 days)
- Auto-permanent-delete after retention period
- Notification before permanent deletion

#### 1.2 Trash Retention UI
**File:** `app/tenant/settings/security/page.tsx`
- Add dropdown to select retention period
- Show count of items pending permanent deletion

#### 1.3 Soft Delete Protection
**Enhancement:** Prevent accidental deletion
- Add "Move to trash" instead of immediate delete (already implemented)
- Add "Archive" option as alternative to delete
- Bulk delete requires re-authentication

---

### PHASE 2: Edit History & Versions (Priority HIGH)

#### 2.1 Contact/Company Field History
**New Table:** `contact_history`, `company_history`
```typescript
// Track every field change
{
  id: uuid,
  entity_type: 'contact' | 'company' | 'deal',
  entity_id: uuid,
  user_id: uuid,
  field_name: string,
  old_value: text,
  new_value: text,
  changed_at: timestamp
}
```

#### 2.2 Version Restore
**API:** `PATCH /api/tenant/contacts/[id]/restore-version`
- Restore to previous field values
- View change history timeline

---

### PHASE 3: Safety Features (Priority MEDIUM)

#### 3.1 Delete Confirmation Delays
- 5-second countdown before permanent delete
- "Undo" option within 30 seconds

#### 3.2 Bulk Operation Safety
- Max 100 items per bulk delete
- Require typing "DELETE" to confirm
- Show affected items count

#### 3.3 Delete Notifications
- Email notification to admins on bulk deletes
- Slack/ webhook integration for delete events

#### 3.4 Sensitive Data Encryption
**Fields to encrypt:**
- Password fields
- API keys
- OAuth tokens
- Credit card data (if stored)

---

### PHASE 4: Audit & Compliance (Priority MEDIUM)

#### 4.1 Export Audit Trail
**Enhance:** Track all data exports
- Who exported data
- What data was exported
- When exported
- Destination format

#### 4.2 Access Audit
- Log all sensitive field views (passwords, tokens)
- Track data accessed by IP address

#### 4.3 Compliance Reports
- GDPR data export (all user data)
- Data processing summary
- Consent tracking

---

### PHASE 5: Backup & Restore Enhancements (Priority HIGH)

#### 5.1 Pre-Delete Snapshots
- Auto-create mini-backup before delete
- 30-day snapshot retention
- One-click restore

#### 5.2 Scheduled Full Backups
- Daily automated backups
- Weekly full backups
- Monthly archive backups

#### 5.3 Point-in-Time Restore UI
- Calendar date picker
- Timeline slider for exact time
- Preview before restore

---

## Implementation Checklist

### Must Fix (Score +1.0 each)

- [ ] **1. Trash Retention Settings** - Add configurable 30/60/90 day retention
- [ ] **2. Delete Confirmation** - Add countdown timer before permanent delete
- [ ] **3. Edit History** - Track all field changes with user/timestamp

### Should Fix (Score +0.5 each)

- [ ] **4. Bulk Delete Protection** - Limit to 100, require confirmation
- [ ] **5. Export Audit** - Log all data exports with user/IP
- [ ] **6. Pre-delete Snapshots** - Auto-backup before delete

### Nice to Have (Score +0.3 each)

- [ ] **7. Sensitive Field Encryption** - Encrypt API keys, tokens
- [ ] **8. Delete Notifications** - Email admin on bulk deletes
- [ ] **9. Version Restore UI** - Visual timeline of changes
- [ ] **10. Compliance Reports** - GDPR export tools

---

## Score Calculation

| Area | Current | After Fixes |
|------|---------|--------------|
| Core CRM | 8.5 | 8.5 |
| Auth/Security | 9.0 | 9.5 |
| Data Protection | 5.0 | 9.5 |
| Backup/Restore | 6.0 | 9.0 |
| Audit/Compliance | 6.0 | 9.0 |
| API Coverage | 8.0 | 8.5 |
| Documentation | 9.0 | 9.5 |
| **TOTAL** | **7.5** | **~9.8** |

---

## Files to Create/Modify

### New Files
1. `app/api/tenant/trash/settings/route.ts` - Retention config
2. `app/api/tenant/trash/auto-cleanup/route.ts` - Scheduled cleanup
3. `app/api/tenant/history/[entity]/route.ts` - Edit history
4. `lib/data-protection/field-encryption.ts` - Encryption utilities
5. `scripts/trash-retention-cleanup.ts` - Auto-cleanup script

### Modify Files
1. `app/api/tenant/trash/route.ts` - Add retention filter
2. `app/tenant/settings/security/page.tsx` - Add retention UI
3. `app/api/tenant/contacts/[id]/route.ts` - Add history tracking
4. `app/api/tenant/export/route.ts` - Add audit logging

---

## Quick Wins (Start Here)

### 1. Add Trash Retention Setting (15 min)
```typescript
// In platformSettings
key: 'trash_retention_days'
value: '30' // or '60', '90'
```

### 2. Add Delete Countdown (30 min)
```tsx
// In Delete button component
const [countdown, setCountdown] = useState(0);
useEffect(() => {
  if (countdown > 0) setTimeout(() => setCountdown(c => c-1), 1000);
}, [countdown]);
```

### 3. Add Edit History Tracking (1 hour)
```typescript
// In contact update
await db.insert(contactHistory).values({
  entity_id: contactId,
  field_name: 'firstName',
  old_value: oldFirstName,
  new_value: newFirstName,
  user_id: ctx.userId
});
```

---

## Priority Order

1. **Week 1:** Trash retention + Delete confirmation
2. **Week 2:** Edit history + Export audit
3. **Week 3:** Bulk delete protection + Pre-delete snapshots
4. **Week 4:** Encryption + Compliance reports

---

*Plan created: May 10, 2026*  
*Target: Score 9.8 by end of implementation*