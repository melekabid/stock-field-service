import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  }
}
