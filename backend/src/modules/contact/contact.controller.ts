import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { UpdateEnquiryDto } from './dto/update-enquiry.dto';
import { AdminGuard } from '../../common/guards/auth/admin.guard';
import { ACCESS_TOKEN } from '../../common/constants/auth.constants';
import { EnquiryStatus } from '@prisma/client';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new contact enquiry' })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  async submitContactForm(@Body() createEnquiryDto: CreateEnquiryDto) {
    return await this.contactService.submitContact(createEnquiryDto);
  }

  @Get('admin/all')
  @ApiBearerAuth(ACCESS_TOKEN)
  @AdminGuard()
  @ApiOperation({ summary: 'Get all contact enquiries (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: EnquiryStatus })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async getAllContacts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: EnquiryStatus,
    @Query('isRead') isRead?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedIsRead = isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    return await this.contactService.getAllContacts(
      parsedPage,
      parsedLimit,
      search,
      status,
      parsedIsRead,
      dateFrom,
      dateTo
    );
  }

  @Get('admin/:id')
  @ApiBearerAuth(ACCESS_TOKEN)
  @AdminGuard()
  @ApiOperation({ summary: 'Get contact enquiry by ID (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Contact Enquiry ID' })
  async getContactById(@Param('id') id: string) {
    return await this.contactService.getContactById(id);
  }

  @Patch('admin/:id')
  @ApiBearerAuth(ACCESS_TOKEN)
  @AdminGuard()
  @ApiOperation({ summary: 'Update contact enquiry (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Contact Enquiry ID' })
  @ApiResponse({ status: 200, description: 'Contact updated successfully.' })
  async updateContact(@Param('id') id: string, @Body() updateEnquiryDto: UpdateEnquiryDto) {
    return await this.contactService.updateContact(id, updateEnquiryDto);
  }

  @Delete('admin/:id')
  @ApiBearerAuth(ACCESS_TOKEN)
  @AdminGuard()
  @ApiOperation({ summary: 'Delete contact enquiry (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Contact Enquiry ID' })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully.' })
  async deleteContact(@Param('id') id: string) {
    return await this.contactService.deleteContact(id);
  }
}
