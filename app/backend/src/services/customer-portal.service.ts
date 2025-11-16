import { PrismaClient, TicketStatus, TicketPriority } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateTicketInput {
  customerId: string;
  userId: string;
  subject: string;
  description: string;
  priority?: TicketPriority;
  category?: string;
}

interface UpdatePreferencesInput {
  preferences?: Record<string, any>;
  subscribedTo?: string[];
}

class CustomerPortalService {
  /**
   * Get customer profile with limited information
   */
  async getCustomerProfile(customerId: string, userId: string) {
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        totalPurchases: true,
        purchaseCount: true,
        lastPurchase: true,
        createdAt: true,
      },
    });

    if (!customer) {
      throw new Error('Customer not found or access denied');
    }

    // Get or create customer profile
    let profile = await prisma.customerProfile.findUnique({
      where: { customerId },
    });

    if (!profile) {
      profile = await prisma.customerProfile.create({
        data: {
          userId,
          customerId,
          preferences: JSON.stringify({}),
          subscribedTo: JSON.stringify([]),
        },
      });
    }

    // Get or create portal access
    let portalAccess = await prisma.ticketPortalAccess.findUnique({
      where: { customerId },
    });

    if (!portalAccess) {
      portalAccess = await prisma.ticketPortalAccess.create({
        data: {
          customerId,
        },
      });
    }

    return {
      customer,
      profile: {
        ...profile,
        preferences: profile.preferences ? JSON.parse(profile.preferences) : {},
        subscribedTo: profile.subscribedTo ? JSON.parse(profile.subscribedTo) : [],
      },
      portalAccess,
    };
  }

  /**
   * List customer's own tickets
   */
  async listCustomerTickets(customerId: string, userId: string, options?: {
    status?: TicketStatus;
    limit?: number;
    offset?: number;
  }) {
    const { status, limit = 50, offset = 0 } = options || {};

    const where: any = {
      customerId,
      userId,
    };

    if (status) {
      where.status = status;
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          subject: true,
          description: true,
          status: true,
          priority: true,
          category: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          resolvedAt: true,
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return {
      tickets: tickets.map(ticket => ({
        ...ticket,
        tags: ticket.tags ? JSON.parse(ticket.tags) : [],
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a single ticket (customer's own only)
   */
  async getTicket(ticketId: string, customerId: string, userId: string) {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        customerId,
        userId,
      },
      select: {
        id: true,
        subject: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found or access denied');
    }

    return {
      ...ticket,
      tags: ticket.tags ? JSON.parse(ticket.tags) : [],
    };
  }

  /**
   * Create a new ticket
   */
  async createTicket(input: CreateTicketInput) {
    const { customerId, userId, subject, description, priority, category } = input;

    // Check if customer has permission to create tickets
    const portalAccess = await prisma.ticketPortalAccess.findUnique({
      where: { customerId },
    });

    if (portalAccess && !portalAccess.canCreateTickets) {
      throw new Error('You do not have permission to create tickets');
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId,
        customerId,
        subject,
        description,
        priority: priority || TicketPriority.MEDIUM,
        category,
        status: TicketStatus.OPEN,
      },
      select: {
        id: true,
        subject: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        createdAt: true,
      },
    });

    return ticket;
  }

  /**
   * List customer's invoices
   */
  async listCustomerInvoices(customerId: string, userId: string, options?: {
    limit?: number;
    offset?: number;
  }) {
    const { limit = 50, offset = 0 } = options || {};

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          customerId,
          userId,
        },
        orderBy: { invoiceDate: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          invoiceNumber: true,
          subtotal: true,
          taxAmount: true,
          discountAmount: true,
          totalAmount: true,
          invoiceDate: true,
          dueDate: true,
          paidDate: true,
          status: true,
          lineItems: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      }),
      prisma.invoice.count({
        where: {
          customerId,
          userId,
        },
      }),
    ]);

    return {
      invoices,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a single invoice (customer's own only)
   */
  async getInvoice(invoiceId: string, customerId: string, userId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        customerId,
        userId,
      },
      include: {
        lineItems: true,
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
            company: true,
            address: true,
            city: true,
            country: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found or access denied');
    }

    return invoice;
  }

  /**
   * List customer's documents (file uploads)
   */
  async listCustomerDocuments(customerId: string, userId: string, options?: {
    limit?: number;
    offset?: number;
  }) {
    const { limit = 50, offset = 0 } = options || {};

    // Get customer-related documents
    // This assumes there's a way to tag or link files to customers
    // For now, we'll get files from the user that might be shared with the customer
    const [files, total] = await Promise.all([
      prisma.fileUpload.findMany({
        where: {
          userId,
          // Add additional filtering logic here based on your file sharing model
        },
        orderBy: { uploadedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          url: true,
          thumbnailUrl: true,
          uploadedAt: true,
        },
      }),
      prisma.fileUpload.count({
        where: {
          userId,
        },
      }),
    ]);

    return {
      documents: files,
      total,
      limit,
      offset,
    };
  }

  /**
   * Download a document
   */
  async getDocument(documentId: string, customerId: string, userId: string) {
    const file = await prisma.fileUpload.findFirst({
      where: {
        id: documentId,
        userId,
        // Add additional permission checks here
      },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        url: true,
        uploadedAt: true,
      },
    });

    if (!file) {
      throw new Error('Document not found or access denied');
    }

    return file;
  }

  /**
   * Update customer preferences
   */
  async updatePreferences(
    customerId: string,
    userId: string,
    input: UpdatePreferencesInput
  ) {
    const { preferences, subscribedTo } = input;

    // Get or create profile
    let profile = await prisma.customerProfile.findUnique({
      where: { customerId },
    });

    if (!profile) {
      profile = await prisma.customerProfile.create({
        data: {
          userId,
          customerId,
          preferences: JSON.stringify(preferences || {}),
          subscribedTo: JSON.stringify(subscribedTo || []),
        },
      });
    } else {
      // Update existing profile
      const currentPreferences = profile.preferences
        ? JSON.parse(profile.preferences)
        : {};
      const currentSubscribedTo = profile.subscribedTo
        ? JSON.parse(profile.subscribedTo)
        : [];

      profile = await prisma.customerProfile.update({
        where: { customerId },
        data: {
          preferences: JSON.stringify(
            preferences !== undefined ? preferences : currentPreferences
          ),
          subscribedTo: JSON.stringify(
            subscribedTo !== undefined ? subscribedTo : currentSubscribedTo
          ),
        },
      });
    }

    return {
      ...profile,
      preferences: profile.preferences ? JSON.parse(profile.preferences) : {},
      subscribedTo: profile.subscribedTo ? JSON.parse(profile.subscribedTo) : [],
    };
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(customerId: string, userId: string) {
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId,
      },
    });

    if (!customer) {
      throw new Error('Customer not found or access denied');
    }

    const [ticketCount, openTickets, invoiceCount, unpaidInvoices] = await Promise.all([
      prisma.ticket.count({
        where: {
          customerId,
          userId,
        },
      }),
      prisma.ticket.count({
        where: {
          customerId,
          userId,
          status: {
            in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
          },
        },
      }),
      prisma.invoice.count({
        where: {
          customerId,
          userId,
        },
      }),
      prisma.invoice.count({
        where: {
          customerId,
          userId,
          status: {
            notIn: ['PAID', 'CANCELLED'],
          },
        },
      }),
    ]);

    return {
      totalPurchases: customer.totalPurchases,
      purchaseCount: customer.purchaseCount,
      lastPurchase: customer.lastPurchase,
      ticketCount,
      openTickets,
      invoiceCount,
      unpaidInvoices,
    };
  }
}

export const customerPortalService = new CustomerPortalService();
