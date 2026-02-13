import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPaginationMeta } from '../common/utils/pagination';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: { clientId, ...dto } });
  }

  async findAll(clientId: string, query: QueryCustomersDto) {
    const where: Prisma.CustomerWhereInput = {
      clientId,
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q } },
              { email: { contains: query.q } },
              { storeName: { contains: query.q } },
              { storeLocation: { contains: query.q } },
            ],
          }
        : {}),
    };
    const [total, data] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
    ]);
    return { data, meta: toPaginationMeta(total, query.page, query.limit) };
  }

  async findOne(clientId: string, id: string) {
    const row = await this.prisma.customer.findFirst({ where: { clientId, id } });
    if (!row) {
      throw new NotFoundException('Customer not found');
    }
    return row;
  }

  async update(clientId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(clientId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(clientId: string, id: string) {
    await this.findOne(clientId, id);
    await this.prisma.customer.delete({ where: { id } });
    return { deleted: true };
  }
}
