import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(userId: string | null, action: string, entity: string, entityId?: string, payload?: unknown) {
    return this.prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action,
        entity,
        entityId,
        payload: payload as object | undefined,
      },
    });
  }

  findRecent(limit = 50) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }
}
