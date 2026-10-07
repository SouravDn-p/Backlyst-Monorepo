import { Module } from '@nestjs/common';
import { LegalDocService } from './legal-doc.service';
import { LegalDocController } from './legal-doc.controller';

@Module({
  controllers: [LegalDocController],
  providers: [LegalDocService],
})
export class LegalDocModule {}
