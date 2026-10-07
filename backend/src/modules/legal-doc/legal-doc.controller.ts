import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { CreateLegalDocVersionDto } from './dto/create-legal-doc.dto';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { LegalDocumentType } from '@prisma/client';
import { LegalDocService } from './legal-doc.service';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';

@Controller('legal-docs')
export class LegalDocController {
  constructor(private readonly legalDocService: LegalDocService) {}

  // ========================
  // CREATE LEGAL DOC VERSION (ADMIN)
  // ========================
  @Post()
  @AdminGuard()
  @ApiTags('Legal Docs - Admin')
  @ApiOperation({
    summary: 'Create a new legal document version',
    description:
      'Creates a legal document if not exists and adds a new version under it. Version is initially inactive.',
  })
  @ApiBody({
    type: CreateLegalDocVersionDto,
    examples: {
      termsAndConditions: {
        summary: 'Terms and Conditions',
        value: {
          type: LegalDocumentType.TERMS_AND_CONDITIONS,
          content: 'This is the terms and conditions document content...',
          version: '1.3.0',
        },
      },
      privacyPolicy: {
        summary: 'Privacy Policy',
        value: {
          type: LegalDocumentType.PRIVACY_POLICY,
          content: 'This is the privacy policy document content...',
          version: '1.3.0',
        },
      },
      cookiePolicy: {
        summary: 'Cookie Policy',
        value: {
          type: LegalDocumentType.COOKIE_POLICY,
          content: 'This is the cookie policy document content...',
          version: '1.3.0',
        },
      },
      dataProcessingAgreement: {
        summary: 'Data Processing Agreement',
        value: {
          type: LegalDocumentType.DATA_PROCESSING_AGREEMENT,
          content: 'This is the data processing agreement document content...',
          version: '1.3.0',
        },
      },
    },
  })
  async createLegalDoc(
    @Body() payload: CreateLegalDocVersionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.legalDocService.createLegalDoc(payload, userId);
  }

  // ========================
  // ACCEPT ACTIVE DOCUMENT (USER)
  // ========================
  @Post('types/:type/accept')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiTags('Legal Docs - User')
  @ApiOperation({
    summary: 'Accept active legal document',
    description:
      'Marks the currently active version of a legal document type as accepted by the logged-in user.',
  })
  @ApiParam({
    name: 'type',
    required: true,
    enum: LegalDocumentType,
    enumName: 'LegalDocumentType',
    description: 'Legal document type to accept',
  })
  async acceptActiveDocument(
    @Param('type', new ParseEnumPipe(LegalDocumentType))
    type: LegalDocumentType,
    @CurrentUser('id') userId: string,
  ) {
    return this.legalDocService.acceptActiveDocument(userId, type);
  }

  // ========================
  // ACTIVATE A VERSION (ADMIN)
  // ========================
  @Patch('versions/:id/activate')
  @AdminGuard()
  @ApiTags('Legal Docs - Admin')
  @ApiOperation({
    summary: 'Activate a legal document version',
    description:
      'Sets the selected version as active and deactivates all other versions under the same document. If a legal document id is provided, the latest version of that document is activated.',
  })
  async activateVersion(@Param('id') id: string) {
    return this.legalDocService.activateVersion(id);
  }

  // ========================
  // DELETE VERSION (ADMIN)
  // ========================
  @Delete('versions/:id')
  @AdminGuard()
  @ApiTags('Legal Docs - Admin')
  @ApiOperation({
    summary: 'Delete a legal document version',
    description:
      'Deletes a version if it is not active. Active versions cannot be deleted.',
  })
  async deleteVersionById(@Param('id') versionId: string) {
    return this.legalDocService.deleteVersionById(versionId);
  }

  // ========================
  // GET VERSION BY ID
  // ========================
  @Get('versions/:id')
  @ApiTags('Legal Docs - Public')
  @ApiOperation({
    summary: 'Get legal document version details',
    description:
      'Returns a single legal document version including its parent document metadata.',
  })
  async getVersionById(@Param('id') versionId: string) {
    return this.legalDocService.getVersionById(versionId);
  }

  // ========================
  // GET DOCUMENT BY ID
  // ========================
  @Get('documents/:id')
  @ApiTags('Legal Docs - Public')
  @ApiOperation({
    summary: 'Get legal document with all versions',
    description:
      'Fetches a legal document and returns all versions sorted by latest first.',
  })
  async getLegalDocById(@Param('id') id: string) {
    return this.legalDocService.getLegalDocById(id);
  }

  // ========================
  // LIST ALL DOCUMENTS (ADMIN)
  // ========================
  // @Get()
  // @AdminGuard()
  // @ApiTags('Legal Docs - Admin')
  // @ApiOperation({
  //   summary: 'List all legal documents',
  //   description:
  //     'Returns paginated legal documents with optional filters (type, active state, search).',
  // })
  // async getAllLegalDocs(
  //   @Query('search') search?: string,
  //   @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
  //   @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  //   @Query('type', new ParseEnumPipe(LegalDocumentType, { optional: true }))
  //   type?: LegalDocumentType,
  //   @Query('isActive', new ParseBoolPipe({ optional: true }))
  //   isActive?: boolean,
  // ) {
  //   return this.legalDocService.getAllLegalDocs(search, page, limit, {
  //     type,
  //     isActive,
  //   });
  // }

  @Get()
  @AdminGuard()
  @ApiTags('Legal Docs - Admin')
  @ApiOperation({
    summary: 'Admin list legal documents',
    description:
      'Returns paginated legal documents with active version, latest version, total versions, and optional filters.',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: LegalDocumentType,
    enumName: 'LegalDocumentType',
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async getAllLegalDocs(
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('type', new ParseEnumPipe(LegalDocumentType, { optional: true }))
    type?: LegalDocumentType,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
  ) {
    return this.legalDocService.getAllLegalDocs(search, page, limit, {
      type,
      isActive,
    });
  }

  // ========================
  // GET MY ACCEPTED DOCUMENTS (USER)
  // ========================
  @Get('me')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiTags('Legal Docs - User')
  @ApiOperation({
    summary: 'Get all legal documents accepted by the logged-in user',
    description:
      'Returns a list of all legal documents accepted by the logged-in user.',
  })
  async getMyAcceptedLegalDocuments(@CurrentUser('id') userId: string) {
    return this.legalDocService.getMyAcceptedLegalDocuments(userId);
  }
}
