# Workflow Task API - Quick Reference

## Import
```typescript
import { WorkflowService } from './services/workflow.service';
import { TaskStatus, TaskPriority } from '@prisma/client';
```

## Creating Workflows with Tasks

### Basic Task Creation
```typescript
const workflow = await WorkflowService.createWorkflow(userId, {
  name: 'My Workflow',
  trigger: 'CUSTOMER_CREATED',
  isActive: true,
  actions: [{
    type: 'create_task',
    config: {
      taskTitle: 'Follow up with {{customerName}}',
      taskDescription: 'Contact customer at {{customerEmail}}',
    }
  }]
});
```

### Advanced Task Creation (with all options)
```typescript
const workflow = await WorkflowService.createWorkflow(userId, {
  name: 'High Priority Onboarding',
  trigger: 'CUSTOMER_CREATED',
  isActive: true,
  actions: [{
    type: 'create_task',
    config: {
      taskTitle: 'Onboard {{customerName}}',
      taskDescription: 'Complete onboarding checklist for {{customerEmail}}',
      taskPriority: 'HIGH',                    // LOW | MEDIUM | HIGH | URGENT
      taskAssignedTo: 'user-id-123',          // Assign to specific user
      taskDueDate: '2024-12-31T23:59:59Z',   // ISO 8601 date string
    }
  }]
});
```

## Querying Tasks

### Get All My Tasks
```typescript
const result = await WorkflowService.getUserWorkflowTasks(userId);
console.log(result.tasks);     // Array of tasks
console.log(result.total);     // Total count
console.log(result.hasMore);   // Pagination flag
```

### Filter by Status
```typescript
const pending = await WorkflowService.getUserWorkflowTasks(
  userId,
  { status: TaskStatus.PENDING }
);

const completed = await WorkflowService.getUserWorkflowTasks(
  userId,
  { status: TaskStatus.COMPLETED }
);
```

### Filter by Priority
```typescript
const urgent = await WorkflowService.getUserWorkflowTasks(
  userId,
  { priority: TaskPriority.URGENT }
);
```

### Filter by Assignment
```typescript
const myAssigned = await WorkflowService.getUserWorkflowTasks(
  userId,
  { assignedTo: userId }
);
```

### Filter by Workflow
```typescript
const workflowTasks = await WorkflowService.getUserWorkflowTasks(
  userId,
  { workflowId: 'workflow-id-123' }
);
```

### Multiple Filters + Pagination
```typescript
const result = await WorkflowService.getUserWorkflowTasks(
  userId,
  {
    status: TaskStatus.PENDING,
    priority: TaskPriority.HIGH,
    assignedTo: userId
  },
  20,  // limit: 20 tasks per page
  0    // offset: start at 0
);
```

### Get Specific Task
```typescript
const task = await WorkflowService.getWorkflowTask(userId, taskId);
if (task) {
  console.log(task.title);
  console.log(task.status);
  console.log(task.assignedTo);
  console.log(task.workflow);  // Includes workflow details
  console.log(task.execution); // Includes execution details
}
```

### Get Tasks for Execution
```typescript
const tasks = await WorkflowService.getExecutionTasks(userId, executionId);
tasks.forEach(task => {
  console.log(`${task.title} - ${task.status}`);
});
```

## Updating Tasks

### Mark as In Progress
```typescript
await WorkflowService.updateWorkflowTask(userId, taskId, {
  status: TaskStatus.IN_PROGRESS
});
```

### Mark as Completed
```typescript
await WorkflowService.updateWorkflowTask(userId, taskId, {
  status: TaskStatus.COMPLETED
});
// completedAt timestamp is automatically set
```

### Change Priority
```typescript
await WorkflowService.updateWorkflowTask(userId, taskId, {
  priority: TaskPriority.URGENT
});
```

### Reassign Task
```typescript
await WorkflowService.updateWorkflowTask(userId, taskId, {
  assignedTo: 'another-user-id'
});
```

### Update Multiple Fields
```typescript
await WorkflowService.updateWorkflowTask(userId, taskId, {
  status: TaskStatus.IN_PROGRESS,
  priority: TaskPriority.HIGH,
  description: 'Updated description',
  dueDate: new Date('2024-12-31')
});
```

### Unassign Task
```typescript
await WorkflowService.updateWorkflowTask(userId, taskId, {
  assignedTo: null
});
```

## Deleting Tasks

### Delete Task (Owner Only)
```typescript
const deleted = await WorkflowService.deleteWorkflowTask(userId, taskId);
if (deleted) {
  console.log('Task deleted successfully');
} else {
  console.log('Task not found or no permission');
}
```

## Enums Reference

### TaskStatus
```typescript
enum TaskStatus {
  PENDING      // Initial state
  IN_PROGRESS  // Work started
  COMPLETED    // Finished successfully
  CANCELLED    // Cancelled
  FAILED       // Failed to complete
}
```

### TaskPriority
```typescript
enum TaskPriority {
  LOW      // Low priority
  MEDIUM   // Medium priority (default)
  HIGH     // High priority
  URGENT   // Urgent priority
}
```

## Response Format

### Task Object
```typescript
{
  id: string;
  workflowId: string;
  workflowName: string;
  executionId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  actionConfig: object;  // Original action config
  context: object;       // Workflow context
  metadata: object;      // Additional metadata
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

## Common Patterns

### Task Dashboard
```typescript
async function getTaskDashboard(userId: string) {
  const [pending, inProgress, completed] = await Promise.all([
    WorkflowService.getUserWorkflowTasks(userId, { status: TaskStatus.PENDING }),
    WorkflowService.getUserWorkflowTasks(userId, { status: TaskStatus.IN_PROGRESS }),
    WorkflowService.getUserWorkflowTasks(userId, { status: TaskStatus.COMPLETED }, 10)
  ]);

  return {
    pending: pending.tasks,
    inProgress: inProgress.tasks,
    recentlyCompleted: completed.tasks,
    stats: {
      pendingCount: pending.total,
      inProgressCount: inProgress.total,
      completedCount: completed.total
    }
  };
}
```

### Task Notification Check
```typescript
async function checkOverdueTasks(userId: string) {
  const allTasks = await WorkflowService.getUserWorkflowTasks(userId, {
    status: TaskStatus.PENDING
  });

  const now = new Date();
  const overdue = allTasks.tasks.filter(task =>
    task.dueDate && task.dueDate < now
  );

  return overdue;
}
```

### Bulk Status Update
```typescript
async function completeMultipleTasks(userId: string, taskIds: string[]) {
  const results = await Promise.all(
    taskIds.map(taskId =>
      WorkflowService.updateWorkflowTask(userId, taskId, {
        status: TaskStatus.COMPLETED
      })
    )
  );

  return results.filter(Boolean).length; // Count successful updates
}
```

### Task Assignment Round Robin
```typescript
async function assignTasksRoundRobin(
  userId: string,
  workflowId: string,
  assignees: string[]
) {
  const tasks = await WorkflowService.getUserWorkflowTasks(userId, {
    workflowId,
    status: TaskStatus.PENDING,
    assignedTo: undefined // Unassigned tasks
  });

  let assigneeIndex = 0;
  for (const task of tasks.tasks) {
    await WorkflowService.updateWorkflowTask(userId, task.id, {
      assignedTo: assignees[assigneeIndex]
    });
    assigneeIndex = (assigneeIndex + 1) % assignees.length;
  }
}
```

## Error Handling

```typescript
try {
  const task = await WorkflowService.getWorkflowTask(userId, taskId);
  if (!task) {
    throw new Error('Task not found or access denied');
  }

  await WorkflowService.updateWorkflowTask(userId, taskId, {
    status: TaskStatus.COMPLETED
  });
} catch (error) {
  console.error('Failed to update task:', error);
  // Handle error appropriately
}
```

## Access Control

- **Read**: User can access tasks they own OR are assigned to
- **Update**: User can update tasks they own OR are assigned to
- **Delete**: Only task owner can delete

## Variable Replacement

Use `{{variableName}}` syntax in task titles and descriptions:

```typescript
actions: [{
  type: 'create_task',
  config: {
    taskTitle: 'Process order #{{orderId}}',
    taskDescription: 'Customer {{customerName}} ordered {{productName}}'
  }
}]

// Triggered with:
WorkflowService.triggerEvent(userId, 'ORDER_CREATED', {
  orderId: '12345',
  customerName: 'John Doe',
  productName: 'Widget Pro'
});

// Results in:
// Title: "Process order #12345"
// Description: "Customer John Doe ordered Widget Pro"
```

## Best Practices

1. **Always set priority** for tasks that need attention
2. **Use due dates** for time-sensitive tasks
3. **Assign tasks immediately** when possible
4. **Filter by status** for dashboards and lists
5. **Include context** in task descriptions using variables
6. **Use pagination** for large task lists
7. **Handle errors** gracefully
8. **Log important operations** for debugging
9. **Check permissions** before operations
10. **Use transactions** for bulk operations
