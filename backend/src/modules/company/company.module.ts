import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadFileModule } from 'src/common/upload-file/upload-file.module';

@Module({
  imports: [PrismaModule, UploadFileModule],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
