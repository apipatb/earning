# Organization Model Implementation Guide

## Overview
This guide provides instructions for implementing a full Organization model in the application to support organization-based access control.

## Current State
The permission service has been updated with team-based and organization-based access control:
- **Team-based access**: ✅ Fully implemented
- **Organization-based access**: ⚠️  Partially implemented (using teams as temporary fallback)

## Suggested Prisma Schema Addition

Add the following models to `/home/user/earning/app/backend/prisma/schema.prisma`:

```prisma
// Organization Role Enum
enum OrganizationRole {
  OWNER
  ADMIN
  MANAGER
  MEMBER
}

// Organization Model
model Organization {
  id          String   @id @default(uuid())
  name        String   @db.VarChar(255)
  description String?  @db.Text
  ownerId     String   @map("owner_id")

  // Organization settings
  isActive    Boolean  @default(true) @map("is_active")
  maxMembers  Int?     @default(100) @map("max_members")

  // Metadata
  metadata    String?  @db.Text // JSON for custom fields

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  owner       User                   @relation("OrganizationOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members     OrganizationMember[]
  invitations OrganizationInvitation[]
  teams       Team[]                 // Organizations can contain multiple teams

  @@index([ownerId, isActive])
  @@index([ownerId, createdAt(sort: Desc)])
  @@map("organizations")
}

// Organization Member Model
model OrganizationMember {
  id             String           @id @default(uuid())
  organizationId String           @map("organization_id")
  userId         String           @map("user_id")
  role           OrganizationRole @default(MEMBER)

  // Permissions can be customized per member
  permissions    String?          @db.Text // JSON array of custom permissions

  joinedAt       DateTime         @default(now()) @map("joined_at")
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User             @relation("OrganizationMembership", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@index([organizationId, role])
  @@index([userId, joinedAt(sort: Desc)])
  @@map("organization_members")
}

// Organization Invitation Model
model OrganizationInvitation {
  id             String           @id @default(uuid())
  organizationId String           @map("organization_id")
  email          String           @db.VarChar(255)
  token          String           @unique @db.VarChar(255)
  status         InvitationStatus @default(PENDING)
  role           OrganizationRole @default(MEMBER)
  expiresAt      DateTime         @map("expires_at")
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, status])
  @@index([email, status])
  @@index([token])
  @@index([expiresAt])
  @@map("organization_invitations")
}
```

## Update Team Model

Add organization relationship to the existing Team model:

```prisma
model Team {
  // ... existing fields ...

  organizationId String?      @map("organization_id") // Optional: teams can belong to an org

  // ... existing relations ...
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)

  @@index([organizationId, isActive])
}
```

## Update User Model

Add organization relationship to the existing User model:

```prisma
model User {
  // ... existing fields ...

  // Add these relations
  ownedOrganizations    Organization[]       @relation("OrganizationOwner")
  organizationMemberships OrganizationMember[] @relation("OrganizationMembership")
}
```

## Update Permission Service

Once the Organization models are added to the schema, update these methods in `/home/user/earning/app/backend/src/services/permission.service.ts`:

### 1. Update `checkOrgAccess` method (line ~1182)

Replace the TODO section with:

```typescript
const membership = await prisma.organizationMember.findUnique({
  where: {
    organizationId_userId: {
      organizationId: orgId,
      userId
    }
  }
});

return !!membership;
```

### 2. Update `getUserOrganizations` method (line ~1271)

Replace the TODO section with:

```typescript
const memberships = await prisma.organizationMember.findMany({
  where: { userId },
  include: {
    organization: {
      select: {
        id: true,
        name: true,
        isActive: true
      }
    }
  }
});

return memberships
  .filter(m => m.organization.isActive)
  .map(m => ({
    orgId: m.organization.id,
    orgName: m.organization.name,
    role: m.role
  }));
```

## Optional: Add organizationId to Data Models

If you want data to be directly owned by organizations (not just through user membership), add organizationId to data models:

```prisma
model Earning {
  // ... existing fields ...
  organizationId String? @map("organization_id")

  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)

  @@index([organizationId, date(sort: Desc)])
}

// Repeat for: Product, Sale, Expense, Invoice, Customer, Report, etc.
```

## Migration Steps

1. **Add the models to schema.prisma**
   ```bash
   # Edit the schema file
   nano /home/user/earning/app/backend/prisma/schema.prisma
   ```

2. **Generate migration**
   ```bash
   cd /home/user/earning/app/backend
   npx prisma migrate dev --name add_organization_models
   ```

3. **Update permission.service.ts**
   - Remove TODO comments
   - Replace temporary implementation in `checkOrgAccess`
   - Replace temporary implementation in `getUserOrganizations`

4. **Create Organization Service** (Optional but recommended)
   Create `/home/user/earning/app/backend/src/services/organization.service.ts`:
   ```typescript
   import { PrismaClient, OrganizationRole } from '@prisma/client';
   import { logger } from '../utils/logger';

   const prisma = new PrismaClient();

   export class OrganizationService {
     async createOrganization(ownerId: string, name: string, description?: string) {
       // Implementation
     }

     async addMember(organizationId: string, userId: string, role: OrganizationRole) {
       // Implementation
     }

     async removeMember(organizationId: string, userId: string) {
       // Implementation
     }

     async updateMemberRole(organizationId: string, userId: string, newRole: OrganizationRole) {
       // Implementation
     }

     // ... other organization management methods
   }

   export const organizationService = new OrganizationService();
   ```

5. **Test the implementation**
   ```bash
   # Run tests
   npm test
   ```

## Benefits of Full Organization Implementation

1. **Multi-tier hierarchy**: Organizations → Teams → Users
2. **Better access control**: Org-level, team-level, and user-level permissions
3. **Scalability**: Large enterprises can manage multiple teams under one organization
4. **Isolation**: Different organizations have completely separate data
5. **Role-based access**: OWNER, ADMIN, MANAGER, MEMBER roles at org level

## Example Usage

### Creating an organization:
```typescript
const org = await prisma.organization.create({
  data: {
    name: 'Acme Corp',
    description: 'Main organization',
    ownerId: userId
  }
});
```

### Adding a member:
```typescript
await prisma.organizationMember.create({
  data: {
    organizationId: org.id,
    userId: newUserId,
    role: 'MEMBER'
  }
});
```

### Checking access:
```typescript
const hasAccess = await permissionService.checkDataVisibility(
  userId,
  'invoice',
  invoiceId,
  DataScope.ORGANIZATION
);
```

## Current Implementation Notes

The current implementation in `permission.service.ts` (as of this update):

- ✅ **Team-based access** is fully functional
  - Checks if users share team membership
  - Supports team roles (OWNER, MANAGER, MEMBER)
  - Proper error handling and logging

- ⚠️  **Organization-based access** uses teams as temporary fallback
  - Currently maps teams to "organization" structure
  - Uses `team-{teamId}` prefix for org IDs
  - Will seamlessly transition when Organization models are added

- ✅ **Helper methods** are implemented:
  - `checkTeamAccess(userId, teamId)` - ✅ Functional
  - `checkOrgAccess(userId, orgId, role)` - ⚠️  Placeholder
  - `getUserTeams(userId)` - ✅ Functional
  - `getUserOrganizations(userId)` - ⚠️  Returns teams as orgs

- ✅ **Error handling and logging** throughout all methods

## Questions?

For questions or issues with implementation, check:
- Prisma documentation: https://www.prisma.io/docs
- Permission service code: `/home/user/earning/app/backend/src/services/permission.service.ts`
