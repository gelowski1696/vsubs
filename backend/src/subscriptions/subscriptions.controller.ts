import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { QuerySubscriptionsDto } from './dto/query-subscriptions.dto';
import { ResumeSubscriptionDto } from './dto/resume-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Client-Id', required: true })
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  create(@Headers('x-client-id') clientId: string, @Body() dto: CreateSubscriptionDto, @Req() req: any) {
    return this.subscriptionsService.create(clientId, dto, req.user?.id);
  }

  @Get()
  findAll(@Headers('x-client-id') clientId: string, @Query() query: QuerySubscriptionsDto) {
    return this.subscriptionsService.findAll(clientId, query);
  }

  @Get('ending-soon')
  endingSoon(@Headers('x-client-id') clientId: string, @Query('days') days = '7') {
    return this.subscriptionsService.getEndingSoon(clientId, Number(days));
  }

  @Get('expired')
  expired(@Headers('x-client-id') clientId: string, @Query('since') since: string) {
    return this.subscriptionsService.getExpiredSince(clientId, since);
  }

  @Post('evaluate-expirations')
  evaluate(@Headers('x-client-id') clientId: string) {
    return this.subscriptionsService.evaluateExpirations(clientId);
  }

  @Get(':id')
  findOne(@Headers('x-client-id') clientId: string, @Param('id') id: string) {
    return this.subscriptionsService.findOne(clientId, id);
  }

  @Patch(':id')
  update(@Headers('x-client-id') clientId: string, @Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(clientId, id, dto);
  }

  @Post(':id/pause')
  pause(@Headers('x-client-id') clientId: string, @Param('id') id: string) {
    return this.subscriptionsService.pause(clientId, id);
  }

  @Post(':id/resume')
  resume(
    @Headers('x-client-id') clientId: string,
    @Param('id') id: string,
    @Body() _dto: ResumeSubscriptionDto,
  ) {
    return this.subscriptionsService.resume(clientId, id);
  }

  @Post(':id/cancel')
  cancel(@Headers('x-client-id') clientId: string, @Param('id') id: string, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionsService.cancel(clientId, id, dto);
  }

  @Delete(':id')
  remove(@Headers('x-client-id') clientId: string, @Param('id') id: string) {
    return this.subscriptionsService.remove(clientId, id);
  }
}