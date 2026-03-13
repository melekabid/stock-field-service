import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.site.findMany({ include: { client: true }, orderBy: { name: 'asc' } });
  }
}
