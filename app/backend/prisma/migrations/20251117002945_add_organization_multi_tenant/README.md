# Organization Multi-Tenant Support - Schema Migration

## Overview
This migration implements a complete organization model for multi-tenant support in the application. It allows users to create and manage organizations, invite members, assign roles, and organize teams under organizations.

## Schema Changes

### 1. New Enums

#### OrganizationStatus
Represents the current status of an organization:
- `ACTIVE` - Organization is active and operational
- `SUSPENDED` - Organization is temporarily suspended
- `ARCHIVED` - Organization is archived and no longer active

#### OrganizationRole
Defines the role hierarchy within an organization:
- `OWNER` - Full control over the organization (can delete, transfer ownership)
- `ADMIN` - Administrative privileges (can manage members, teams, settings)
- `MEMBER` - Standard member with access to organization resources
- `GUEST` - Limited access, typically for external collaborators

### 2. New Models

#### Organization Model
The main entity representing a tenant organization.

**Fields:**
- `id` (String, CUID) - Primary key using CUID for better distribution
- `name` (String) - Organization display name
- `slug` (String, Unique) - URL-friendly unique identifier
- `description` (String?) - Optional organization description
- `logo` (String?) - Optional logo URL
- `website` (String?) - Optional organization website
- `stripeCustomerId` (String?, Unique) - Stripe customer ID for billing
- `status` (OrganizationStatus) - Current organization status (default: ACTIVE)
- `settings` (Json) - Flexible JSON field for organization-specific configuration
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp
- `ownerId` (String) - Foreign key to the user who owns the organization

**Relations:**
- `owner` - One-to-one relation to User (owner)
- `members` - One-to-many relation to OrganizationMember
- `invitations` - One-to-many relation to OrganizationInvitation
- `teams` - One-to-many relation to Team

**Indexes:**
- Composite index on `[ownerId, status]` - Fast queries for user's organizations by status
- Index on `slug` - Fast slug lookups for URL routing
- Composite index on `[status, createdAt DESC]` - List active organizations
- Index on `stripeCustomerId` - Fast billing lookups

**Constraints:**
- Unique constraint on `slug` - Ensures URL uniqueness
- Unique constraint on `stripeCustomerId` - One Stripe customer per organization
- Cascade delete on owner - Organization deleted if owner is deleted

#### OrganizationMember Model
Represents a user's membership in an organization with their assigned role.

**Fields:**
- `id` (String, CUID) - Primary key
- `organizationId` (String) - Foreign key to organization
- `userId` (String) - Foreign key to user
- `role` (OrganizationRole) - Member's role (default: MEMBER)
- `joinedAt` (DateTime) - When the user joined the organization
- `invitedAt` (DateTime?) - When the user was invited (optional)
- `invitedBy` (String?) - User ID who sent the invitation
- `createdAt` (DateTime) - Record creation timestamp
- `updatedAt` (DateTime) - Record update timestamp

**Relations:**
- `organization` - Many-to-one relation to Organization
- `user` - Many-to-one relation to User

**Indexes:**
- Composite unique index on `[organizationId, userId]` - Prevents duplicate memberships
- Composite index on `[organizationId, role]` - Fast role-based queries
- Composite index on `[userId, joinedAt DESC]` - User's organization history
- Composite index on `[organizationId, userId, role]` - Optimized permission checks

**Constraints:**
- Cascade delete on organization - Membership deleted if organization is deleted
- Cascade delete on user - Membership deleted if user is deleted

#### OrganizationInvitation Model
Manages pending invitations to join an organization.

**Fields:**
- `id` (String, CUID) - Primary key
- `organizationId` (String) - Foreign key to organization
- `email` (String) - Email address of invitee
- `role` (OrganizationRole) - Role to be assigned (default: MEMBER)
- `token` (String, Unique) - Unique invitation token for security
- `invitedBy` (String) - User ID who sent the invitation
- `expiresAt` (DateTime) - Invitation expiration timestamp
- `acceptedAt` (DateTime?) - When invitation was accepted
- `rejectedAt` (DateTime?) - When invitation was rejected
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Update timestamp

**Relations:**
- `organization` - Many-to-one relation to Organization

**Indexes:**
- Unique index on `token` - Ensures token uniqueness
- Composite index on `[organizationId, email]` - Fast invitation lookups
- Index on `email` - Quick email-based searches
- Index on `token` - Fast token validation
- Index on `expiresAt` - Efficient cleanup of expired invitations
- Composite index on `[organizationId, createdAt DESC]` - Recent invitations per org

**Constraints:**
- Cascade delete on organization - Invitations deleted if organization is deleted

### 3. Updated Models

#### User Model
**New Fields:**
- `currentOrganizationId` (String?) - Optional field to store the user's currently active organization

**New Relations:**
- `ownedOrganizations` - One-to-many relation to organizations the user owns
- `organizations` - One-to-many relation to OrganizationMember (all memberships)

**Use Case:**
The `currentOrganizationId` field allows users to switch between organizations easily. The application can use this field to determine the current context for data filtering and permissions.

#### Team Model
**New Fields:**
- `organizationId` (String?) - Optional foreign key to organization

**New Relations:**
- `organization` - Many-to-one optional relation to Organization

**New Indexes:**
- Composite index on `[organizationId, isActive]` - Fast organization team queries

**Constraints:**
- Set NULL on delete - Teams are preserved if organization is deleted (backward compatibility)

**Use Case:**
Teams can now belong to organizations, enabling better organization of collaborative work. The optional nature maintains backward compatibility with existing teams.

## Migration Strategy

### Safe Migration Path
1. **Add new tables and columns** - All changes are additive, no data loss
2. **Existing data preserved** - All existing users and teams remain unchanged
3. **Optional organization membership** - Organizations are opt-in, not required
4. **Backward compatibility** - Teams without organizations continue to work

### Post-Migration Steps

1. **Create Default Organizations (Optional)**
   ```sql
   -- Example: Create personal organization for existing users
   INSERT INTO organizations (id, name, slug, owner_id, status, created_at, updated_at)
   SELECT
     gen_random_uuid(),
     COALESCE(name, email) || '''s Organization',
     LOWER(REGEXP_REPLACE(email, '[^a-z0-9]', '-', 'g')),
     id,
     'ACTIVE',
     NOW(),
     NOW()
   FROM users;
   ```

2. **Auto-assign Users to Their Organizations**
   ```sql
   INSERT INTO organization_members (id, organization_id, user_id, role, joined_at, created_at, updated_at)
   SELECT
     gen_random_uuid(),
     o.id,
     o.owner_id,
     'OWNER',
     o.created_at,
     NOW(),
     NOW()
   FROM organizations o;
   ```

3. **Link Existing Teams to Organizations (Optional)**
   ```sql
   UPDATE teams t
   SET organization_id = (
     SELECT id FROM organizations WHERE owner_id = t.owner_id LIMIT 1
   )
   WHERE organization_id IS NULL;
   ```

## Data Integrity

### Referential Integrity
- All foreign keys use `CASCADE` delete for organization-owned entities
- Teams use `SET NULL` for backward compatibility
- Proper indexes ensure fast constraint validation

### Constraints
- Unique slug per organization prevents URL conflicts
- Unique user per organization membership prevents duplicates
- Unique invitation tokens prevent security issues

## Performance Considerations

### Indexing Strategy
1. **Composite Indexes** - Optimized for common query patterns
   - `[ownerId, status]` - List user's active organizations
   - `[organizationId, role]` - Role-based access control
   - `[organizationId, userId, role]` - Permission checks

2. **Single Column Indexes** - Fast lookups
   - `slug` - URL routing
   - `token` - Invitation validation
   - `email` - User searches

3. **Temporal Indexes** - Time-based queries
   - `[status, createdAt DESC]` - Recent active organizations
   - `expiresAt` - Expired invitation cleanup

### Query Optimization Tips
```sql
-- Efficient: Get user's organizations with role
SELECT o.*, om.role
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.user_id = $1 AND o.status = 'ACTIVE';

-- Efficient: Check user permission in organization
SELECT om.role
FROM organization_members om
WHERE om.organization_id = $1
  AND om.user_id = $2;

-- Efficient: List organization teams
SELECT t.*
FROM teams t
WHERE t.organization_id = $1 AND t.is_active = true;
```

## Security Considerations

### Role-Based Access Control (RBAC)
Implement role hierarchy in application logic:
```
OWNER > ADMIN > MEMBER > GUEST
```

**Recommended Permissions:**
- **OWNER**: Delete org, transfer ownership, manage all
- **ADMIN**: Manage members, teams, settings (except billing)
- **MEMBER**: Access resources, create content
- **GUEST**: Read-only access to shared resources

### Invitation Security
- Tokens should be cryptographically secure (UUID or random string)
- Implement expiration checking (expiresAt field)
- Validate email before sending invitations
- Rate limit invitation creation to prevent abuse

### Data Isolation
- Always filter queries by organizationId
- Implement row-level security (RLS) policies in application
- Validate organization membership before data access

## API Implementation Examples

### Create Organization
```typescript
async function createOrganization(userId: string, data: {
  name: string;
  slug: string;
  description?: string;
}) {
  return await prisma.organization.create({
    data: {
      ...data,
      ownerId: userId,
      members: {
        create: {
          userId: userId,
          role: 'OWNER',
          joinedAt: new Date(),
        }
      }
    },
    include: {
      members: true
    }
  });
}
```

### Invite Member
```typescript
async function inviteToOrganization(
  organizationId: string,
  invitedBy: string,
  email: string,
  role: OrganizationRole = 'MEMBER'
) {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  return await prisma.organizationInvitation.create({
    data: {
      organizationId,
      email,
      role,
      token,
      invitedBy,
      expiresAt,
    }
  });
}
```

### Accept Invitation
```typescript
async function acceptInvitation(token: string, userId: string) {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
    include: { organization: true }
  });

  if (!invitation || invitation.expiresAt < new Date()) {
    throw new Error('Invalid or expired invitation');
  }

  // Create membership
  await prisma.organizationMember.create({
    data: {
      organizationId: invitation.organizationId,
      userId,
      role: invitation.role,
      invitedAt: invitation.createdAt,
      invitedBy: invitation.invitedBy,
    }
  });

  // Mark invitation as accepted
  await prisma.organizationInvitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() }
  });

  return invitation.organization;
}
```

### Check Organization Permission
```typescript
async function hasOrganizationPermission(
  userId: string,
  organizationId: string,
  requiredRole: OrganizationRole
): Promise<boolean> {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  });

  if (!member) return false;

  const roleHierarchy = ['GUEST', 'MEMBER', 'ADMIN', 'OWNER'];
  const userRoleIndex = roleHierarchy.indexOf(member.role);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  return userRoleIndex >= requiredRoleIndex;
}
```

## Testing Checklist

- [ ] Create organization as new user
- [ ] Invite user to organization
- [ ] Accept invitation
- [ ] Reject invitation
- [ ] Test expired invitation handling
- [ ] Create team within organization
- [ ] List user's organizations
- [ ] Switch current organization
- [ ] Remove member from organization
- [ ] Transfer organization ownership
- [ ] Suspend organization
- [ ] Archive organization
- [ ] Delete organization (verify cascade)
- [ ] Test role-based permissions
- [ ] Test with existing teams (backward compatibility)

## Rollback Plan

If needed, rollback using:
```sql
-- Remove foreign keys
ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_organization_id_fkey";
ALTER TABLE "organization_invitations" DROP CONSTRAINT IF EXISTS "organization_invitations_organization_id_fkey";
ALTER TABLE "organization_members" DROP CONSTRAINT IF EXISTS "organization_members_user_id_fkey";
ALTER TABLE "organization_members" DROP CONSTRAINT IF EXISTS "organization_members_organization_id_fkey";
ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_owner_id_fkey";

-- Drop tables
DROP TABLE IF EXISTS "organization_invitations";
DROP TABLE IF EXISTS "organization_members";
DROP TABLE IF EXISTS "organizations";

-- Drop enums
DROP TYPE IF EXISTS "OrganizationRole";
DROP TYPE IF EXISTS "OrganizationStatus";

-- Remove columns
ALTER TABLE "teams" DROP COLUMN IF EXISTS "organization_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "current_organization_id";
```

## Production Deployment Notes

1. **Timing**: Run during low-traffic period
2. **Backup**: Full database backup before migration
3. **Monitoring**: Watch for slow queries post-migration
4. **Indexes**: Indexes are created automatically, may take time on large tables
5. **Testing**: Verify in staging environment first
6. **Feature Flag**: Consider gradual rollout with feature flags

## Support & Questions

For issues or questions about this migration:
- Review the API implementation examples above
- Check the testing checklist for common scenarios
- Verify indexes are created properly using `EXPLAIN ANALYZE`
- Monitor query performance after deployment
