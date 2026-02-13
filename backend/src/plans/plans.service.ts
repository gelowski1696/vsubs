import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPaginationMeta } from '../common/utils/pagination';
import { CreatePlanDto } from './dto/create-plan.dto';
import { QueryPlansDto } from './dto/query-plans.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  create(clientId: string, dto: CreatePlanDto) {
    return this.prisma.plan.create({ data: { clientId, currency: 'PHP', intervalCount: 1, ...dto } });
  }

  async findAll(clientId: string, query: QueryPlansDto) {
    const where: Prisma.PlanWhereInput = {
      clientId,
      ...(query.q ? { name: { contains: query.q } } : {}),
    };
    const [total, data] = await Promise.all([
      this.prisma.plan.count({ where }),
      this.prisma.plan.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
    ]);
    return { data, meta: toPaginationMeta(total, query.page, query.limit) };
  }

  async findOne(clientId: string, id: string) {
    const row = await this.prisma.plan.findFirst({ where: { clientId, id } });
    if (!row) {
      throw new NotFoundException('Plan not found');
    }
    return row;
  }

  async update(clientId: string, id: string, dto: UpdatePlanDto) {
    await this.findOne(clientId, id);
    return this.prisma.plan.update({ where: { id }, data: dto });
  }

  async remove(clientId: string, id: string) {
    await this.findOne(clientId, id);
    await this.prisma.plan.delete({ where: { id } });
    return { deleted: true };
  }
}
