/**
 * Tests for WhatsApp Controller
 */

import {
  sendMessage,
  getContacts,
  createContact,
  getContactDetails,
  updateContact,
  deleteContact,
  createTemplate,
  getTemplates,
  sendTemplateMessage,
  webhookHandler,
  getMessageStatus,
} from '../whatsapp.controller';
import {
  createMockRequest,
  createMockResponse,
  verifySuccessResponse,
  verifyErrorResponse,
  getResponseData,
} from '../../test/utils';
import prisma from '../../lib/prisma';
import whatsappService from '../../services/whatsapp.service';

jest.mock('../../lib/prisma');
jest.mock('../../services/whatsapp.service');

describe('WhatsApp Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a WhatsApp message successfully', async () => {
      (whatsappService.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg-123',
        twilioSid: 'SM123456',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          phoneNumber: '+14155552671',
          message: 'Hello World',
        },
      });
      const res = createMockResponse();

      await sendMessage(req as any, res);

      expect(whatsappService.sendMessage).toHaveBeenCalledWith(
        'user-123',
        '+14155552671',
        'Hello World',
        undefined
      );
      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.success).toBe(true);
      expect(response.messageId).toBe('msg-123');
      expect(response.twilioSid).toBe('SM123456');
    });

    it('should send message with media URL', async () => {
      (whatsappService.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          phoneNumber: '+14155552671',
          message: 'Check this out',
          mediaUrl: 'https://example.com/image.jpg',
        },
      });
      const res = createMockResponse();

      await sendMessage(req as any, res);

      expect(whatsappService.sendMessage).toHaveBeenCalledWith(
        'user-123',
        '+14155552671',
        'Check this out',
        'https://example.com/image.jpg'
      );
      verifySuccessResponse(res, 200);
    });

    it('should reject invalid phone number', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          phoneNumber: 'invalid',
          message: 'Test',
        },
      });
      const res = createMockResponse();

      await sendMessage(req as any, res);

      verifyErrorResponse(res, 400);
      expect(whatsappService.sendMessage).not.toHaveBeenCalled();
    });

    it('should reject missing message', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          phoneNumber: '+14155552671',
        },
      });
      const res = createMockResponse();

      await sendMessage(req as any, res);

      verifyErrorResponse(res, 400);
      expect(whatsappService.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      (whatsappService.sendMessage as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Twilio API error',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          phoneNumber: '+14155552671',
          message: 'Test',
        },
      });
      const res = createMockResponse();

      await sendMessage(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.message).toBe('Twilio API error');
    });

    it('should format phone numbers correctly', async () => {
      (whatsappService.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          phoneNumber: '14155552671',
          message: 'Test',
        },
      });
      const res = createMockResponse();

      await sendMessage(req as any, res);

      expect(whatsappService.sendMessage).toHaveBeenCalledWith(
        'user-123',
        '+14155552671',
        'Test',
        undefined
      );
    });
  });

  describe('getContacts', () => {
    it('should return all contacts successfully', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          phoneNumber: '+14155552671',
          name: 'John Doe',
          status: 'ACTIVE',
          lastMessageAt: new Date(),
          createdAt: new Date(),
          _count: { messages: 5 },
        },
      ];

      (prisma.whatsAppContact.count as jest.Mock).mockResolvedValue(1);
      (prisma.whatsAppContact.findMany as jest.Mock).mockResolvedValue(mockContacts);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getContacts(req as any, res);

      expect(prisma.whatsAppContact.count).toHaveBeenCalled();
      expect(prisma.whatsAppContact.findMany).toHaveBeenCalled();
      verifySuccessResponse(res, 200);

      const response = getResponseData(res);
      expect(response.contacts).toHaveLength(1);
      expect(response.contacts[0].messageCount).toBe(5);
    });

    it('should filter by status', async () => {
      (prisma.whatsAppContact.count as jest.Mock).mockResolvedValue(0);
      (prisma.whatsAppContact.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { status: 'ACTIVE' },
      });
      const res = createMockResponse();

      await getContacts(req as any, res);

      expect(prisma.whatsAppContact.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: 'ACTIVE' },
      });
    });

    it('should support search functionality', async () => {
      (prisma.whatsAppContact.count as jest.Mock).mockResolvedValue(0);
      (prisma.whatsAppContact.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { search: 'John' },
      });
      const res = createMockResponse();

      await getContacts(req as any, res);

      expect(prisma.whatsAppContact.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-123',
          OR: expect.arrayContaining([
            { name: { contains: 'John', mode: 'insensitive' } },
            { phoneNumber: { contains: 'John', mode: 'insensitive' } },
          ]),
        }),
      });
    });

    it('should support pagination', async () => {
      (prisma.whatsAppContact.count as jest.Mock).mockResolvedValue(50);
      (prisma.whatsAppContact.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { limit: '20', offset: '10' },
      });
      const res = createMockResponse();

      await getContacts(req as any, res);

      expect(prisma.whatsAppContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 20,
        })
      );
    });
  });

  describe('createContact', () => {
    it('should create a new contact successfully', async () => {
      const mockContact = {
        id: 'contact-1',
        userId: 'user-123',
        phoneNumber: '+14155552671',
        name: 'Jane Doe',
        status: 'ACTIVE',
        createdAt: new Date(),
      };

      (prisma.whatsAppContact.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.whatsAppContact.create as jest.Mock).mockResolvedValue(mockContact);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          phoneNumber: '+14155552671',
          name: 'Jane Doe',
        },
      });
      const res = createMockResponse();

      await createContact(req as any, res);

      expect(prisma.whatsAppContact.create).toHaveBeenCalled();
      verifySuccessResponse(res, 201);
      const response = getResponseData(res);
      expect(response.contact.name).toBe('Jane Doe');
    });

    it('should reject duplicate contact', async () => {
      (prisma.whatsAppContact.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing',
        phoneNumber: '+14155552671',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          phoneNumber: '+14155552671',
          name: 'Jane Doe',
        },
      });
      const res = createMockResponse();

      await createContact(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.message).toBe('Contact with this phone number already exists');
      expect(prisma.whatsAppContact.create).not.toHaveBeenCalled();
    });

    it('should reject invalid phone number', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          phoneNumber: 'invalid',
          name: 'Jane Doe',
        },
      });
      const res = createMockResponse();

      await createContact(req as any, res);

      verifyErrorResponse(res, 400);
      expect(prisma.whatsAppContact.create).not.toHaveBeenCalled();
    });
  });

  describe('getContactDetails', () => {
    it('should return contact details with messages', async () => {
      const mockContact = {
        id: 'contact-1',
        userId: 'user-123',
        phoneNumber: '+14155552671',
        name: 'John Doe',
        status: 'ACTIVE',
        lastMessageAt: new Date(),
        createdAt: new Date(),
      };

      const mockMessages = [
        {
          id: 'msg-1',
          direction: 'OUTBOUND',
          messageBody: 'Hello',
          status: 'DELIVERED',
          timestamp: new Date(),
        },
      ];

      (prisma.whatsAppContact.findFirst as jest.Mock).mockResolvedValue(mockContact);
      (whatsappService.getConversationHistory as jest.Mock).mockResolvedValue(mockMessages);
      (prisma.whatsAppMessage.count as jest.Mock).mockResolvedValue(1);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'contact-1' },
        query: {},
      });
      const res = createMockResponse();

      await getContactDetails(req as any, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.contact.id).toBe('contact-1');
      expect(response.messages).toHaveLength(1);
    });

    it('should return 404 if contact not found', async () => {
      (prisma.whatsAppContact.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'nonexistent' },
        query: {},
      });
      const res = createMockResponse();

      await getContactDetails(req as any, res);

      verifyErrorResponse(res, 404);
      expect(whatsappService.getConversationHistory).not.toHaveBeenCalled();
    });
  });

  describe('createTemplate', () => {
    it('should create a new template successfully', async () => {
      const mockTemplate = {
        id: 'template-1',
        userId: 'user-123',
        name: 'Welcome Message',
        content: 'Hello {{name}}, welcome!',
        variables: JSON.stringify(['name']),
        category: 'Greeting',
        createdAt: new Date(),
      };

      (prisma.whatsAppTemplate.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.whatsAppTemplate.create as jest.Mock).mockResolvedValue(mockTemplate);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          name: 'Welcome Message',
          content: 'Hello {{name}}, welcome!',
          variables: ['name'],
          category: 'Greeting',
        },
      });
      const res = createMockResponse();

      await createTemplate(req as any, res);

      expect(prisma.whatsAppTemplate.create).toHaveBeenCalled();
      verifySuccessResponse(res, 201);
      const response = getResponseData(res);
      expect(response.template.name).toBe('Welcome Message');
      expect(response.template.variables).toEqual(['name']);
    });

    it('should reject duplicate template name', async () => {
      (prisma.whatsAppTemplate.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing',
        name: 'Welcome Message',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          name: 'Welcome Message',
          content: 'Content',
        },
      });
      const res = createMockResponse();

      await createTemplate(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.message).toBe('Template with this name already exists');
    });
  });

  describe('sendTemplateMessage', () => {
    it('should send template message successfully', async () => {
      (whatsappService.sendTemplatedMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          phoneNumber: '+14155552671',
          templateName: 'Welcome Message',
          variables: { name: 'John' },
        },
      });
      const res = createMockResponse();

      await sendTemplateMessage(req as any, res);

      expect(whatsappService.sendTemplatedMessage).toHaveBeenCalledWith(
        'user-123',
        '+14155552671',
        'Welcome Message',
        { name: 'John' }
      );
      verifySuccessResponse(res, 200);
    });

    it('should handle template not found error', async () => {
      (whatsappService.sendTemplatedMessage as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Template not found',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          phoneNumber: '+14155552671',
          templateName: 'NonExistent',
        },
      });
      const res = createMockResponse();

      await sendTemplateMessage(req as any, res);

      verifyErrorResponse(res, 400);
    });
  });

  describe('webhookHandler', () => {
    it('should handle incoming message webhook', async () => {
      (whatsappService.receiveMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const req = {
        body: {
          From: 'whatsapp:+14155552671',
          To: 'whatsapp:+12345678900',
          Body: 'Hello from customer',
          MessageSid: 'SM123',
        },
      };
      const res = createMockResponse();

      await webhookHandler(req as any, res);

      expect(whatsappService.receiveMessage).toHaveBeenCalledWith(req.body);
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/xml');
    });

    it('should handle status callback webhook', async () => {
      (whatsappService.updateMessageStatus as jest.Mock).mockResolvedValue({
        success: true,
      });

      const req = {
        body: {
          MessageSid: 'SM123',
          MessageStatus: 'delivered',
        },
      };
      const res = createMockResponse();

      await webhookHandler(req as any, res);

      expect(whatsappService.updateMessageStatus).toHaveBeenCalledWith('SM123', 'delivered');
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/xml');
    });

    it('should always respond with XML even on errors', async () => {
      (whatsappService.receiveMessage as jest.Mock).mockRejectedValue(
        new Error('Processing error')
      );

      const req = {
        body: {
          From: 'whatsapp:+14155552671',
          Body: 'Test',
        },
      };
      const res = createMockResponse();

      await webhookHandler(req as any, res);

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/xml');
      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining('<?xml version="1.0"')
      );
    });
  });

  describe('getMessageStatus', () => {
    it('should fetch and return message status', async () => {
      const mockMessage = {
        id: 'msg-123',
        status: 'DELIVERED',
        timestamp: new Date(),
        twilioSid: 'SM123',
        contact: {
          userId: 'user-123',
        },
      };

      (prisma.whatsAppMessage.findFirst as jest.Mock).mockResolvedValue(mockMessage);
      (whatsappService.getMessageStatus as jest.Mock).mockResolvedValue({
        success: true,
        status: 'DELIVERED',
      });
      (prisma.whatsAppMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        status: 'READ',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'msg-123' },
      });
      const res = createMockResponse();

      await getMessageStatus(req as any, res);

      expect(whatsappService.getMessageStatus).toHaveBeenCalledWith('SM123');
      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.status).toBe('READ');
    });

    it('should return 404 if message not found', async () => {
      (prisma.whatsAppMessage.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'nonexistent' },
      });
      const res = createMockResponse();

      await getMessageStatus(req as any, res);

      verifyErrorResponse(res, 404);
    });
  });
});
