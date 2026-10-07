import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationCategory, NotificationType, NotificationPriority, EnquiryStatus } from '@prisma/client';
import { MailService } from '../../common/utils/mail/mail.service';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
  ) {}

  async submitContact(data: { name: string; email: string; company?: string; phone?: string; subject?: string; message: string }) {
    try {
      // 1. Save to Database
      const newContact = await this.prisma.contactEnquiry.create({
        data: {
          name: data.name,
          email: data.email,
          company: data.company || null,
          phone: data.phone || null,
          subject: data.subject || null,
          message: data.message,
        },
      });

      // 2. Send Admin Notification
      await this.notificationService.sendAdminNotification({
        type: NotificationType.SYSTEM_ANNOUNCEMENT, // Using a valid NotificationType
        category: NotificationCategory.ADMIN_SYSTEM, // Using a valid NotificationCategory
        priority: NotificationPriority.HIGH,
        title: 'New Contact Submission',
        body: `A new contact message was received from ${data.name} (${data.email}).`,
        data: {
          contactId: newContact.id,
          subject: newContact.subject,
        },
      });

      return {
        success: true,
        message: 'Your message has been received successfully.',
        data: newContact,
      };
    } catch (error) {
      console.error('Contact submit error:', error);
      throw new InternalServerErrorException('Failed to submit contact form');
    }
  }

  async getAllContacts(
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: EnquiryStatus,
    isRead?: boolean,
    dateFrom?: string,
    dateTo?: string
  ) {
    try {
      const skip = (page - 1) * limit;
      
      const where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      if (status) {
        where.status = status;
      }
      
      if (isRead !== undefined) {
        where.isRead = isRead;
      }
      
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setUTCHours(23, 59, 59, 999);
          where.createdAt.lte = toDate;
        }
      }
      
      const [data, total] = await Promise.all([
        this.prisma.contactEnquiry.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.contactEnquiry.count({ where }),
      ]);

      return {
        success: true,
        message: 'Contacts fetched successfully',
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
    } catch (error) {
      console.error('Fetch contacts error:', error);
      throw new InternalServerErrorException('Failed to fetch contacts');
    }
  }

  async getContactById(id: string) {
    try {
      const contact = await this.prisma.contactEnquiry.findUnique({
        where: { id },
      });

      if (!contact) {
        throw new NotFoundException('Contact not found');
      }

      return {
        success: true,
        message: 'Contact fetched successfully',
        data: contact,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Fetch contact by id error:', error);
      throw new InternalServerErrorException('Failed to fetch contact');
    }
  }

  async updateContact(id: string, updateData: { isRead?: boolean; status?: EnquiryStatus; replyMessage?: string }) {
    try {
      const existingContact = await this.prisma.contactEnquiry.findUnique({
        where: { id },
      });

      if (!existingContact) {
        throw new NotFoundException('Contact not found');
      }

      const updatedContact = await this.prisma.contactEnquiry.update({
        where: { id },
        data: {
          ...(updateData.isRead !== undefined && { isRead: updateData.isRead }),
          ...(updateData.status !== undefined && { status: updateData.status }),
        },
      });

      // Send email if status is updated and reply message is provided
      if (updateData.status && updateData.replyMessage) {
        await this.mailService.sendMail({
          to: updatedContact.email,
          subject: `Re: Your Contact Enquiry - ${updatedContact.subject ?? 'Update'}`,
          html: `<p>Hello ${updatedContact.name},</p><p>We have an update on your enquiry regarding "<strong>${updatedContact.subject ?? ''}</strong>":</p><p>${updateData.replyMessage}</p><p>Status: <strong>${updatedContact.status}</strong></p>`,
        });
      }

      return {
        success: true,
        message: 'Contact updated successfully',
        data: updatedContact,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Update contact error:', error);
      throw new InternalServerErrorException('Failed to update contact');
    }
  }

  async deleteContact(id: string) {
    try {
      const existingContact = await this.prisma.contactEnquiry.findUnique({
        where: { id },
      });

      if (!existingContact) {
        throw new NotFoundException('Contact not found');
      }

      await this.prisma.contactEnquiry.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Contact deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Delete contact error:', error);
      throw new InternalServerErrorException('Failed to delete contact');
    }
  }
}
