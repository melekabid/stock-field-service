import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../config/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(actorId: string, dto: CreateUserDto) {
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { ...dto, passwordHash, category: dto.category ?? 'TECHNIQUE' },
    });
    await this.auditService.log(actorId, 'CREATE', 'User', user.id, dto);
    return user;
  }

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        category: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async update(actorId: string, id: string, dto: UpdateUserDto) {
    const { password, ...rest } = dto;
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(password ? { passwordHash: await argon2.hash(password) } : {}),
      },
    });
    await this.auditService.log(actorId, 'UPDATE', 'User', id, dto);
    return user;
  }

  async remove(actorId: string, id: string) {
    const [managedCount, assignedCount, movementCount, notificationCount, auditCount] = await Promise.all([
      this.prisma.intervention.count({ where: { managerId: id } }),
      this.prisma.intervention.count({ where: { technicianId: id } }),
      this.prisma.stockMovement.count({ where: { userId: id } }),
      this.prisma.notification.count({ where: { userId: id } }),
      this.prisma.auditLog.count({ where: { userId: id } }),
    ]);

    if (managedCount > 0 || assignedCount > 0 || movementCount > 0 || notificationCount > 0 || auditCount > 0) {
      throw new BadRequestException(
        'Cet utilisateur ne peut pas etre supprime car il est deja lie a des interventions ou des mouvements.',
      );
    }

    const user = await this.prisma.user.delete({ where: { id } });
    await this.auditService.log(actorId, 'DELETE', 'User', id, { id });
    return user;
  }
}
