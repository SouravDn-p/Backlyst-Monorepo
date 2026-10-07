import { PartialType } from '@nestjs/swagger';
import { CreateShowcaseEntryDto } from './create-showcase-entry.dto';

export class UpdateShowcaseEntryDto extends PartialType(CreateShowcaseEntryDto) {}
