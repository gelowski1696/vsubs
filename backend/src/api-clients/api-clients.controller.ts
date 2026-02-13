import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiClientsService } from './api-clients.service';
import { CreateApiClientDto } from './dto/create-api-client.dto';
import { UpdateApiClientDto } from './dto/update-api-client.dto';

@ApiTags('API Clients')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Client-Id', required: true })
@Controller('api-clients')
export class ApiClientsController {
  constructor(private readonly apiClientsService: ApiClientsService) {}

  @Post()
  @Roles('ADMIN')
  create(@Headers('x-client-id') clientId: string, @Body() dto: CreateApiClientDto) {
    return this.apiClientsService.create(clientId, dto);
  }

  @Get()
  @Roles('ADMIN')
  findAll(@Headers('x-client-id') clientId: string) {
    return this.apiClientsService.findAll(clientId);
  }

  @Get(':id')
  @Roles('ADMIN')
  findOne(@Headers('x-client-id') clientId: string, @Param('id') id: string) {
    return this.apiClientsService.findOne(clientId, id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Headers('x-client-id') clientId: string, @Param('id') id: string, @Body() dto: UpdateApiClientDto) {
    return this.apiClientsService.update(clientId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Headers('x-client-id') clientId: string, @Param('id') id: string) {
    return this.apiClientsService.remove(clientId, id);
  }
}