import { PartialType } from '@nestjs/swagger';
import { CreateApiClientDto } from './create-api-client.dto';

export class UpdateApiClientDto extends PartialType(CreateApiClientDto) {}