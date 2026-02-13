import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Client-Id', required: true })
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Headers('x-client-id') clientId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(clientId, dto);
  }

  @Get()
  findAll(@Headers('x-client-id') clientId: string, @Query() query: QueryCustomersDto) {
    return this.customersService.findAll(clientId, query);
  }

  @Get(':id')
  findOne(@Headers('x-client-id') clientId: string, @Param('id') id: string) {
    return this.customersService.findOne(clientId, id);
  }

  @Patch(':id')
  update(@Headers('x-client-id') clientId: string, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(clientId, id, dto);
  }

  @Delete(':id')
  remove(@Headers('x-client-id') clientId: string, @Param('id') id: string) {
    return this.customersService.remove(clientId, id);
  }
}