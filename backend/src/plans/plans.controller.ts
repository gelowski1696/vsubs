import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreatePlanDto } from './dto/create-plan.dto';
import { QueryPlansDto } from './dto/query-plans.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansService } from './plans.service';

@ApiTags('Plans')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Client-Id', required: true })
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  create(@Headers('x-client-id') clientId: string, @Body() dto: CreatePlanDto) {
    return this.plansService.create(clientId, dto);
  }

  @Get()
  findAll(@Headers('x-client-id') clientId: string, @Query() query: QueryPlansDto) {
    return this.plansService.findAll(clientId, query);
  }

  @Get(':id')
  findOne(@Headers('x-client-id') clientId: string, @Param('id') id: string) {
    return this.plansService.findOne(clientId, id);
  }

  @Patch(':id')
  update(@Headers('x-client-id') clientId: string, @Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(clientId, id, dto);
  }

  @Delete(':id')
  remove(@Headers('x-client-id') clientId: string, @Param('id') id: string) {
    return this.plansService.remove(clientId, id);
  }
}