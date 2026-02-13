import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class PaginationPipe implements PipeTransform {
  transform(value: any) {
    const page = Number(value.page ?? 1);
    const limit = Number(value.limit ?? 20);
    if (Number.isNaN(page) || page < 1) {
      throw new BadRequestException('page must be >= 1');
    }
    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be between 1 and 100');
    }
    return { ...value, page, limit };
  }
}