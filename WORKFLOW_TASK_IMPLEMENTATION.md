# Workflow Task Implementation

## Overview
This document contains the changes needed to implement actual workflow task creation instead of just logging.

## 1. Prisma Schema Changes

Add the following to `/home/user/earning/app/backend/prisma/schema.prisma`:

### Add Enums (after WorkflowExecutionStatus enum, around line 762)

```prisma
enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
  FAILED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

### Add WorkflowTask Model (after WorkflowExecution model, around line 804)

```prisma
model WorkflowTask {
  id                String         @id @default(uuid())
  workflowId        String         @map("workflow_id")
  executionId       String         @map("execution_id")
  userId            String         @map("user_id")
  assignedTo        String?        @map("assigned_to")
  title             String         @db.VarChar(500)
  description       String?        @db.Text
  status            TaskStatus     @default(PENDING)
  priority          TaskPriority   @default(MEDIUM)
  dueDate           DateTime?      @map("due_date")
  actionConfig      String         @db.Text // JSON of the original action config
  context           String?        @db.Text // JSON of workflow context
  metadata          String?        @db.Text // JSON for additional data
  completedAt       DateTime?      @map("completed_at")
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")

  workflow          Workflow       @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  execution         WorkflowExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  user              User           @relation("WorkflowTaskOwner", fields: [userId], references: [id], onDelete: Cascade)
  assignee          User?          @relation("AssignedWorkflowTasks", fields: [assignedTo], references: [id], onDelete: SetNull)

  @@index([workflowId, createdAt(sort: Desc)])
  @@index([executionId, status])
  @@index([userId, status])
  @@index([assignedTo, status])
  @@index([status, dueDate])
  @@index([status, priority])
  @@map("workflow_tasks")
}
```

### Update Workflow Model (add relation)

In the `model Workflow` (around line 770), add this to the relations section:

```prisma
  tasks       WorkflowTask[]
```

### Update WorkflowExecution Model (add relation)

In the `model WorkflowExecution` (around line 789), add this to the relations section:

```prisma
  tasks       WorkflowTask[]
```

### Update User Model (add relations)

In the `model User` (around line 132), add these to the relations section:

```prisma
  workflowTasks     WorkflowTask[]       @relation("WorkflowTaskOwner")
  assignedWorkflowTasks WorkflowTask[]   @relation("AssignedWorkflowTasks")
```

## 2. Run Migration

After making schema changes, run:

```bash
cd /home/user/earning/app/backend
npx prisma migrate dev --name add_workflow_tasks
npx prisma generate
```

## 3. Updated Service Code

The updated workflow.service.ts file has been created with actual task creation implementation.

## Key Features Implemented

1. **Actual Database Persistence**: Tasks are now stored in the `workflow_tasks` table
2. **Proper Status Tracking**: Tasks have PENDING, IN_PROGRESS, COMPLETED, CANCELLED, FAILED statuses
3. **Priority Levels**: LOW, MEDIUM, HIGH, URGENT priority support
4. **Task Assignment**: Support for assigning tasks to specific users
5. **Due Date Support**: Tasks can have optional due dates
6. **Metadata Storage**: Original action config and workflow context stored
7. **Error Handling**: Comprehensive error handling with logging
8. **Task Lifecycle Logging**: Proper logging for task creation and updates
9. **Return Task Details**: Returns task ID and status information

## New API Methods

The WorkflowService class now includes these task management methods:

### 1. Get User's Workflow Tasks
```typescript
WorkflowService.getUserWorkflowTasks(
  userId: string,
  filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedTo?: string;
    workflowId?: string;
  },
  limit?: number,
  offset?: number
): Promise<{ tasks: Task[], total: number, hasMore: boolean }>
```

### 2. Get Specific Workflow Task
```typescript
WorkflowService.getWorkflowTask(
  userId: string,
  taskId: string
): Promise<Task | null>
```

### 3. Update Workflow Task
```typescript
WorkflowService.updateWorkflowTask(
  userId: string,
  taskId: string,
  updates: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedTo?: string | null;
    description?: string;
    dueDate?: Date | null;
  }
): Promise<boolean>
```

### 4. Delete Workflow Task
```typescript
WorkflowService.deleteWorkflowTask(
  userId: string,
  taskId: string
): Promise<boolean>
```

### 5. Get Tasks for Workflow Execution
```typescript
WorkflowService.getExecutionTasks(
  userId: string,
  executionId: string
): Promise<Task[]>
```

## Usage Examples

### Creating a Workflow with Task Creation

```typescript
import { WorkflowService } from './services/workflow.service';

// Create a workflow that creates tasks
const workflow = await WorkflowService.createWorkflow(userId, {
  name: 'New Customer Onboarding',
  trigger: 'CUSTOMER_CREATED',
  isActive: true,
  actions: [
    {
      type: 'create_task',
      config: {
        taskTitle: 'Welcome new customer: {{customerName}}',
        taskDescription: 'Send welcome email and set up initial account configuration for {{customerEmail}}',
        taskPriority: 'HIGH',
        taskDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        taskAssignedTo: 'sales-manager-user-id', // Optional: assign to specific user
      },
    },
    {
      type: 'send_email',
      config: {
        to: '{{customerEmail}}',
        subject: 'Welcome to our platform!',
        body: 'Hi {{customerName}}, welcome aboard!',
      },
    },
  ],
});
```

### Triggering the Workflow

```typescript
// When a new customer is created, trigger the workflow
await WorkflowService.triggerEvent(
  userId,
  'CUSTOMER_CREATED',
  {
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerId: 'cust_123',
  }
);
```

### Querying Tasks

```typescript
// Get all pending tasks assigned to me
const myTasks = await WorkflowService.getUserWorkflowTasks(
  userId,
  { status: 'PENDING', assignedTo: userId },
  20,
  0
);

// Get a specific task
const task = await WorkflowService.getWorkflowTask(userId, taskId);

// Get all tasks for a workflow execution
const executionTasks = await WorkflowService.getExecutionTasks(userId, executionId);
```

### Updating Tasks

```typescript
// Mark a task as in progress
await WorkflowService.updateWorkflowTask(userId, taskId, {
  status: 'IN_PROGRESS',
});

// Complete a task
await WorkflowService.updateWorkflowTask(userId, taskId, {
  status: 'COMPLETED',
});

// Change priority and reassign
await WorkflowService.updateWorkflowTask(userId, taskId, {
  priority: 'URGENT',
  assignedTo: 'another-user-id',
});
```

## Testing

After implementing:

1. **Apply Schema Changes**
   ```bash
   cd /home/user/earning/app/backend
   npx prisma migrate dev --name add_workflow_tasks
   npx prisma generate
   ```

2. **Create Test Workflow**
   ```typescript
   const workflow = await WorkflowService.createWorkflow(userId, {
     name: 'Test Task Creation',
     trigger: 'EARNING_CREATED',
     isActive: true,
     actions: [{
       type: 'create_task',
       config: {
         taskTitle: 'Review earning: ${{amount}}',
         taskDescription: 'Review and approve earning from {{platformName}}',
         taskPriority: 'MEDIUM',
       },
     }],
   });
   ```

3. **Trigger Workflow**
   ```typescript
   await WorkflowService.triggerEvent(userId, 'EARNING_CREATED', {
     amount: '150.00',
     platformName: 'YouTube',
   });
   ```

4. **Verify Task Creation**
   ```typescript
   const tasks = await WorkflowService.getUserWorkflowTasks(userId);
   console.log('Created tasks:', tasks);
   ```

5. **Update Task Status**
   ```typescript
   const taskId = tasks.tasks[0].id;
   await WorkflowService.updateWorkflowTask(userId, taskId, {
     status: 'IN_PROGRESS',
   });
   ```

6. **Check Database**
   ```sql
   SELECT * FROM workflow_tasks WHERE user_id = 'your-user-id';
   ```

## Migration Steps

1. ✅ Update Prisma schema with new enums and WorkflowTask model
2. ✅ Add relationships to Workflow, WorkflowExecution, and User models
3. ✅ Run `npx prisma migrate dev --name add_workflow_tasks`
4. ✅ Run `npx prisma generate`
5. ✅ Update workflow.service.ts (already done)
6. 🔲 Restart the backend server
7. 🔲 Test workflow task creation
8. 🔲 (Optional) Add API routes for task management endpoints
