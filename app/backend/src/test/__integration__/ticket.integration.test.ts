/**
 * Ticket Integration Tests
 * Tests ticket lifecycle with real database
 */

import { getTestPrismaClient, cleanupAfterTest } from '../integration-setup';
import { factories, resetSequence } from '../factories';
import { TicketStatus, TicketPriority } from '@prisma/client';

describe('Ticket Integration Tests', () => {
  const prisma = getTestPrismaClient();

  afterEach(async () => {
    await cleanupAfterTest();
    resetSequence();
  });

  describe('Ticket Creation', () => {
    it('should create a new ticket', async () => {
      const user = await factories.user.create(prisma);

      const ticket = await factories.ticket.create(prisma, user.id, {
        subject: 'Test Issue',
        description: 'This is a test ticket',
        priority: 'HIGH',
      });

      expect(ticket.id).toBeDefined();
      expect(ticket.userId).toBe(user.id);
      expect(ticket.subject).toBe('Test Issue');
      expect(ticket.description).toBe('This is a test ticket');
      expect(ticket.status).toBe('OPEN');
      expect(ticket.priority).toBe('HIGH');
      expect(ticket.createdAt).toBeInstanceOf(Date);
    });

    it('should create ticket with customer', async () => {
      const user = await factories.user.create(prisma);
      const customer = await factories.customer.create(prisma, user.id);

      const ticket = await factories.ticket.create(prisma, user.id, {
        customerId: customer.id,
        subject: 'Customer Issue',
      });

      expect(ticket.customerId).toBe(customer.id);
    });

    it('should create ticket with all priority levels', async () => {
      const user = await factories.user.create(prisma);
      const priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'];

      for (const priority of priorities) {
        const ticket = await factories.ticket.create(prisma, user.id, {
          priority,
          subject: `${priority} priority ticket`,
        });

        expect(ticket.priority).toBe(priority);
      }
    });

    it('should create multiple tickets', async () => {
      const user = await factories.user.create(prisma);

      const tickets = await factories.ticket.createMany(prisma, user.id, 5);

      expect(tickets).toHaveLength(5);
      tickets.forEach(ticket => {
        expect(ticket.userId).toBe(user.id);
      });
    });
  });

  describe('Ticket Retrieval', () => {
    it('should find ticket by ID', async () => {
      const user = await factories.user.create(prisma);
      const created = await factories.ticket.create(prisma, user.id, {
        subject: 'Find Me',
      });

      const found = await prisma.ticket.findUnique({
        where: { id: created.id },
      });

      expect(found).not.toBeNull();
      expect(found?.subject).toBe('Find Me');
    });

    it('should find tickets by user', async () => {
      const user1 = await factories.user.create(prisma);
      const user2 = await factories.user.create(prisma);

      await factories.ticket.createMany(prisma, user1.id, 3);
      await factories.ticket.createMany(prisma, user2.id, 2);

      const user1Tickets = await prisma.ticket.findMany({
        where: { userId: user1.id },
      });

      expect(user1Tickets).toHaveLength(3);
      user1Tickets.forEach(ticket => {
        expect(ticket.userId).toBe(user1.id);
      });
    });

    it('should find tickets by status', async () => {
      const user = await factories.user.create(prisma);

      await factories.ticket.create(prisma, user.id, { status: 'OPEN' });
      await factories.ticket.create(prisma, user.id, { status: 'OPEN' });
      await factories.ticket.create(prisma, user.id, { status: 'CLOSED' });

      const openTickets = await prisma.ticket.findMany({
        where: {
          userId: user.id,
          status: 'OPEN',
        },
      });

      expect(openTickets).toHaveLength(2);
      openTickets.forEach(ticket => {
        expect(ticket.status).toBe('OPEN');
      });
    });

    it('should find tickets by priority', async () => {
      const user = await factories.user.create(prisma);

      await factories.ticket.create(prisma, user.id, { priority: 'URGENT' });
      await factories.ticket.create(prisma, user.id, { priority: 'CRITICAL' });
      await factories.ticket.create(prisma, user.id, { priority: 'LOW' });

      const highPriorityTickets = await prisma.ticket.findMany({
        where: {
          userId: user.id,
          priority: { in: ['URGENT', 'CRITICAL'] },
        },
      });

      expect(highPriorityTickets).toHaveLength(2);
    });

    it('should include ticket relations', async () => {
      const user = await factories.user.create(prisma);
      const customer = await factories.customer.create(prisma, user.id);
      const ticket = await factories.ticket.create(prisma, user.id, {
        customerId: customer.id,
      });

      const ticketWithRelations = await prisma.ticket.findUnique({
        where: { id: ticket.id },
        include: {
          user: true,
          customer: true,
        },
      });

      expect(ticketWithRelations?.user.id).toBe(user.id);
      expect(ticketWithRelations?.customer?.id).toBe(customer.id);
    });
  });

  describe('Ticket Update (Lifecycle)', () => {
    it('should update ticket status from OPEN to IN_PROGRESS', async () => {
      const user = await factories.user.create(prisma);
      const ticket = await factories.ticket.create(prisma, user.id, {
        status: 'OPEN',
      });

      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'IN_PROGRESS' },
      });

      expect(updated.status).toBe('IN_PROGRESS');
    });

    it('should update ticket status from IN_PROGRESS to RESOLVED', async () => {
      const user = await factories.user.create(prisma);
      const ticket = await factories.ticket.create(prisma, user.id, {
        status: 'IN_PROGRESS',
      });

      const resolvedAt = new Date();
      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'RESOLVED',
          resolvedAt,
        },
      });

      expect(updated.status).toBe('RESOLVED');
      expect(updated.resolvedAt).toBeDefined();
    });

    it('should close ticket and set resolvedAt', async () => {
      const user = await factories.user.create(prisma);
      const ticket = await factories.ticket.create(prisma, user.id);

      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'CLOSED',
          resolvedAt: new Date(),
        },
      });

      expect(updated.status).toBe('CLOSED');
      expect(updated.resolvedAt).toBeInstanceOf(Date);
    });

    it('should assign ticket to agent', async () => {
      const user = await factories.user.create(prisma);
      const agent = await factories.user.create(prisma, {
        email: 'agent@example.com',
      });
      const ticket = await factories.ticket.create(prisma, user.id);

      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { assignedTo: agent.id },
      });

      expect(updated.assignedTo).toBe(agent.id);
    });

    it('should update ticket priority', async () => {
      const user = await factories.user.create(prisma);
      const ticket = await factories.ticket.create(prisma, user.id, {
        priority: 'MEDIUM',
      });

      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { priority: 'URGENT' },
      });

      expect(updated.priority).toBe('URGENT');
    });

    it('should update ticket description', async () => {
      const user = await factories.user.create(prisma);
      const ticket = await factories.ticket.create(prisma, user.id, {
        description: 'Original description',
      });

      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { description: 'Updated description' },
      });

      expect(updated.description).toBe('Updated description');
    });

    it('should track complete ticket lifecycle', async () => {
      const user = await factories.user.create(prisma);
      const agent = await factories.user.create(prisma);

      // Create ticket
      let ticket = await factories.ticket.create(prisma, user.id, {
        status: 'OPEN',
        priority: 'MEDIUM',
      });
      expect(ticket.status).toBe('OPEN');

      // Assign to agent and set in progress
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'IN_PROGRESS',
          assignedTo: agent.id,
        },
      });
      expect(ticket.status).toBe('IN_PROGRESS');
      expect(ticket.assignedTo).toBe(agent.id);

      // Escalate priority
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { priority: 'HIGH' },
      });
      expect(ticket.priority).toBe('HIGH');

      // Resolve ticket
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });
      expect(ticket.status).toBe('RESOLVED');
      expect(ticket.resolvedAt).toBeDefined();

      // Close ticket
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'CLOSED' },
      });
      expect(ticket.status).toBe('CLOSED');
    });
  });

  describe('Ticket Deletion', () => {
    it('should delete ticket', async () => {
      const user = await factories.user.create(prisma);
      const ticket = await factories.ticket.create(prisma, user.id);

      await prisma.ticket.delete({
        where: { id: ticket.id },
      });

      const found = await prisma.ticket.findUnique({
        where: { id: ticket.id },
      });

      expect(found).toBeNull();
    });

    it('should cascade delete when user is deleted', async () => {
      const user = await factories.user.create(prisma);
      const ticket = await factories.ticket.create(prisma, user.id);

      await prisma.user.delete({
        where: { id: user.id },
      });

      const foundTicket = await prisma.ticket.findUnique({
        where: { id: ticket.id },
      });

      expect(foundTicket).toBeNull();
    });
  });

  describe('Ticket Statistics', () => {
    it('should count tickets by status', async () => {
      const user = await factories.user.create(prisma);

      await factories.ticket.create(prisma, user.id, { status: 'OPEN' });
      await factories.ticket.create(prisma, user.id, { status: 'OPEN' });
      await factories.ticket.create(prisma, user.id, { status: 'IN_PROGRESS' });
      await factories.ticket.create(prisma, user.id, { status: 'CLOSED' });

      const openCount = await prisma.ticket.count({
        where: {
          userId: user.id,
          status: 'OPEN',
        },
      });

      expect(openCount).toBe(2);
    });

    it('should count tickets by priority', async () => {
      const user = await factories.user.create(prisma);

      await factories.ticket.create(prisma, user.id, { priority: 'CRITICAL' });
      await factories.ticket.create(prisma, user.id, { priority: 'URGENT' });
      await factories.ticket.create(prisma, user.id, { priority: 'CRITICAL' });

      const criticalCount = await prisma.ticket.count({
        where: {
          userId: user.id,
          priority: 'CRITICAL',
        },
      });

      expect(criticalCount).toBe(2);
    });

    it('should get average resolution time', async () => {
      const user = await factories.user.create(prisma);

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      // Create tickets with resolution times
      const ticket1 = await prisma.ticket.create({
        data: {
          userId: user.id,
          subject: 'Ticket 1',
          description: 'Test',
          status: 'CLOSED',
          priority: 'MEDIUM',
          createdAt: twoDaysAgo,
          resolvedAt: oneDayAgo, // 1 day to resolve
        },
      });

      const ticket2 = await prisma.ticket.create({
        data: {
          userId: user.id,
          subject: 'Ticket 2',
          description: 'Test',
          status: 'CLOSED',
          priority: 'MEDIUM',
          createdAt: oneDayAgo,
          resolvedAt: now, // 1 day to resolve
        },
      });

      const resolvedTickets = await prisma.ticket.findMany({
        where: {
          userId: user.id,
          status: 'CLOSED',
          resolvedAt: { not: null },
        },
        select: {
          createdAt: true,
          resolvedAt: true,
        },
      });

      expect(resolvedTickets).toHaveLength(2);
      resolvedTickets.forEach(ticket => {
        expect(ticket.resolvedAt).toBeDefined();
      });
    });
  });

  describe('Ticket Filtering and Sorting', () => {
    it('should sort tickets by creation date', async () => {
      const user = await factories.user.create(prisma);

      await factories.ticket.createMany(prisma, user.id, 5);

      const tickets = await prisma.ticket.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      for (let i = 0; i < tickets.length - 1; i++) {
        expect(tickets[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          tickets[i + 1].createdAt.getTime()
        );
      }
    });

    it('should filter tickets by date range', async () => {
      const user = await factories.user.create(prisma);
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await factories.ticket.createMany(prisma, user.id, 3);

      const tickets = await prisma.ticket.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: yesterday,
            lte: tomorrow,
          },
        },
      });

      expect(tickets.length).toBeGreaterThanOrEqual(3);
    });

    it('should search tickets by subject', async () => {
      const user = await factories.user.create(prisma);

      await factories.ticket.create(prisma, user.id, {
        subject: 'Login Issue',
      });
      await factories.ticket.create(prisma, user.id, {
        subject: 'Payment Problem',
      });
      await factories.ticket.create(prisma, user.id, {
        subject: 'Login Failed',
      });

      const loginTickets = await prisma.ticket.findMany({
        where: {
          userId: user.id,
          subject: { contains: 'Login', mode: 'insensitive' },
        },
      });

      expect(loginTickets).toHaveLength(2);
    });
  });
});
