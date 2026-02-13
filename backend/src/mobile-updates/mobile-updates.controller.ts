import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CheckMobileUpdateDto } from './dto/check-mobile-update.dto';
import { CreateMobileReleaseDto } from './dto/create-mobile-release.dto';
import { CreateMobileUpdateEventDto } from './dto/create-mobile-update-event.dto';
import { PublishMobileReleaseDto } from './dto/publish-mobile-release.dto';
import { QueryMobileReleasesDto } from './dto/query-mobile-releases.dto';
import { MobileUpdatesService } from './mobile-updates.service';

@ApiTags('Mobile Updates')
@ApiHeader({ name: 'X-Client-Id', required: true })
@Controller('mobile-updates')
export class MobileUpdatesController {
  constructor(private readonly mobileUpdatesService: MobileUpdatesService) {}

  @Get('check')
  @ApiOperation({ summary: 'Check if a mobile OTA update is available' })
  check(@Headers('x-client-id') clientId: string, @Query() dto: CheckMobileUpdateDto) {
    return this.mobileUpdatesService.checkForUpdate(clientId, dto);
  }

  @Post('events')
  @ApiOperation({ summary: 'Log mobile OTA update telemetry event' })
  logEvent(@Headers('x-client-id') clientId: string, @Body() dto: CreateMobileUpdateEventDto) {
    return this.mobileUpdatesService.createEvent(clientId, dto);
  }

  @Get('releases')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List mobile OTA releases' })
  listReleases(@Headers('x-client-id') clientId: string, @Query() query: QueryMobileReleasesDto) {
    return this.mobileUpdatesService.listReleases(clientId, query);
  }

  @Post('releases')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a mobile OTA release metadata record' })
  createRelease(@Headers('x-client-id') clientId: string, @Body() dto: CreateMobileReleaseDto) {
    return this.mobileUpdatesService.createRelease(clientId, dto);
  }

  @Post('releases/:id/upload')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bundle: { type: 'string', format: 'binary' },
      },
      required: ['bundle'],
    },
  })
  @UseInterceptors(FileInterceptor('bundle', { limits: { fileSize: 50 * 1024 * 1024 } }))
  uploadBundle(
    @Headers('x-client-id') clientId: string,
    @Param('id') id: string,
    @UploadedFile() bundle: any,
  ) {
    return this.mobileUpdatesService.uploadReleaseBundle(clientId, id, bundle);
  }

  @Patch('releases/:id/publish')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish or unpublish mobile OTA release' })
  publishRelease(
    @Headers('x-client-id') clientId: string,
    @Param('id') id: string,
    @Body() dto: PublishMobileReleaseDto,
  ) {
    return this.mobileUpdatesService.publishRelease(clientId, id, dto);
  }

  @Get('releases/:id/bundle')
  @Public()
  @ApiOperation({ summary: 'Download published OTA bundle' })
  async downloadBundle(
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!token) {
      throw new BadRequestException('Download token is required');
    }
    const tokenPayload = this.mobileUpdatesService.parseSignedDownloadToken(token);
    if (tokenPayload.releaseId !== id) {
      throw new BadRequestException('Invalid token release reference');
    }

    const bundle = await this.mobileUpdatesService.readBundleFile(tokenPayload.clientId, id);
    const data = this.mobileUpdatesService.getBundleBuffer(bundle.filePath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${bundle.release.bundleVersion}.zip"`);
    res.setHeader('Content-Length', `${bundle.sizeBytes}`);
    res.send(data);
  }
}
