import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InterventionStatus, NotificationType, StockMovementType, UserRole } from '@prisma/client';
import * as dayjs from 'dayjs';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../config/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReportsService } from '../reports/reports.service';
import { StockService } from '../stock/stock.service';
import { CompleteInterventionDto } from './dto/complete-intervention.dto';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';

@Injectable()
export class InterventionsService {
  private readonly logger = new Logger(InterventionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly reportsService: ReportsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async create(actorId: string, actorRole: UserRole, dto: CreateInterventionDto) {
    if (dto.clientName && dto.technicianName && dto.interventionDescription && dto.workedHours && dto.machineType) {
      return this.createFromMobileSheet(actorId, actorRole, dto);
    }

    const count = await this.prisma.intervention.count();
    const intervention = await this.prisma.intervention.create({
      data: {
        number: `INT-${dayjs().format('YYYY')}-${String(count + 1).padStart(4, '0')}`,
        date: new Date(dto.date),
        description: dto.description,
        clientId: dto.clientId,
        siteId: dto.siteId,
        technicianId: dto.technicianId,
        managerId: actorId,
      },
      include: {
        technician: true,
      },
    });

    await this.notificationsService.create(intervention.technicianId, {
      type: NotificationType.INTERVENTION_ASSIGNED,
      title: `New intervention ${intervention.number}`,
      message: 'A new intervention has been assigned to you.',
    });

    await this.auditService.log(actorId, 'CREATE', 'Intervention', intervention.id, dto);
    return intervention;
  }

  private async createFromMobileSheet(actorId: string, actorRole: UserRole, dto: CreateInterventionDto) {
    const count = await this.prisma.intervention.count();
    const clientName = dto.clientName!.trim();
    const technicianName = dto.technicianName!.trim();
    const machineType = dto.machineType!.trim();
    const description = dto.interventionDescription!.trim();

    const client =
      (await this.prisma.client.findFirst({
        where: { name: clientName },
      })) ??
      (await this.prisma.client.create({
        data: { name: clientName },
      }));

    const site =
      (await this.prisma.site.findFirst({
        where: {
          clientId: client.id,
          name: machineType,
        },
      })) ??
      (await this.prisma.site.create({
        data: {
          clientId: client.id,
          name: machineType,
          address: machineType,
        },
      }));

    const technician =
      dto.technicianId != null
          ? await this.prisma.user.findUnique({ where: { id: dto.technicianId } })
          : await this.findTechnicianByName(technicianName);
    const technicianId = technician?.id ?? actorId;

    const notes = [
      `Client: ${clientName}`,
      `Intervenant: ${technicianName}`,
      `Description: ${description}`,
      `Nombre d'heure: ${dto.workedHours!.trim()}`,
      `Garantie: ${dto.warrantyEnabled ? 'Sous garantie' : 'Non garantie'}`,
      `Type de machine: ${machineType}`,
    ].join('\n');

    const intervention = await this.prisma.intervention.create({
      data: {
        number: `INT-${dayjs().format('YYYY')}-${String(count + 1).padStart(4, '0')}`,
        date: new Date(dto.date ?? new Date().toISOString()),
        description,
        notes,
        status: dto.signatureUrl != null && dto.technicianSignatureUrl != null
            ? InterventionStatus.COMPLETED
            : InterventionStatus.OPEN,
        completedAt: dto.signatureUrl != null && dto.technicianSignatureUrl != null ? new Date() : null,
        clientId: client.id,
        siteId: site.id,
        technicianId,
        managerId: actorId,
      },
      include: {
        client: true,
        site: true,
        technician: true,
      },
    });

    if (dto.signatureUrl != null) {
      const signerName = dto.signerName?.trim();
      await this.prisma.signature.create({
        data: {
          interventionId: intervention.id,
          url: dto.signatureUrl,
          signerName: signerName && signerName.length > 0 ? signerName : clientName,
        },
      });
    }

    if (dto.technicianSignatureUrl != null) {
      await this.prisma.photo.create({
        data: {
          interventionId: intervention.id,
          url: dto.technicianSignatureUrl,
          caption: 'Technician signature',
        },
      });
    }

    if (actorRole != UserRole.TECHNICIAN || technicianId != actorId) {
      await this.notificationsService.create(technicianId, {
        type: NotificationType.INTERVENTION_ASSIGNED,
        title: `New intervention ${intervention.number}`,
        message: 'A new intervention has been assigned to you.',
      });
    }

    await this.auditService.log(actorId, 'CREATE', 'Intervention', intervention.id, dto);
    return this.detail(intervention.id);
  }

  private async findTechnicianByName(fullName: string) {
    const normalized = fullName.trim().replace(/\s+/g, ' ');
    if (normalized.length === 0) {
      return null;
    }

    const parts = normalized.split(' ');
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

    return this.prisma.user.findFirst({
      where: {
        role: UserRole.TECHNICIAN,
        firstName: { equals: firstName, mode: 'insensitive' },
        ...(lastName != null
            ? {
                lastName: { equals: lastName, mode: 'insensitive' },
              }
            : {}),
      },
    });
  }

  list(userId: string, role: UserRole) {
    return this.prisma.intervention.findMany({
      where: role === UserRole.TECHNICIAN ? { technicianId: userId } : undefined,
      orderBy: { date: 'desc' },
      include: {
        client: true,
        site: true,
        technician: true,
        items: { include: { product: true } },
        photos: true,
        signature: true,
      },
    });
  }

  detail(id: string) {
    return this.prisma.intervention.findUnique({
      where: { id },
      include: {
        client: true,
        site: true,
        technician: true,
        manager: true,
        items: { include: { product: true, warehouse: true } },
        photos: true,
        signature: true,
      },
    });
  }

  async start(userId: string, id: string) {
    return this.prisma.intervention.update({
      where: { id, technicianId: userId },
      data: {
        status: InterventionStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });
  }

  async update(actorId: string, id: string, dto: UpdateInterventionDto) {
    const current = await this.prisma.intervention.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Intervention not found');
    }

    if (
      dto.clientName != null ||
      dto.technicianName != null ||
      dto.interventionDescription != null ||
      dto.workedHours != null ||
      dto.machineType != null ||
      dto.signatureUrl != null ||
      dto.technicianSignatureUrl != null ||
      dto.warrantyEnabled != null
    ) {
      return this.updateFromMobileSheet(actorId, id, dto);
    }

    const intervention = await this.prisma.intervention.update({
      where: { id },
      data: {
        ...(dto.clientId ? { clientId: dto.clientId } : {}),
        ...(dto.siteId ? { siteId: dto.siteId } : {}),
        ...(dto.technicianId ? { technicianId: dto.technicianId } : {}),
        ...(dto.date ? { date: new Date(dto.date) } : {}),
        ...(dto.description ? { description: dto.description } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });

    await this.auditService.log(actorId, 'UPDATE', 'Intervention', id, dto);
    return intervention;
  }

  private async updateFromMobileSheet(actorId: string, id: string, dto: UpdateInterventionDto) {
    const existing = await this.prisma.intervention.findUnique({
      where: { id },
      include: {
        client: true,
        site: true,
        signature: true,
        photos: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Intervention not found');
    }

    const clientName = dto.clientName?.trim() || existing.client.name;
    const technicianName = dto.technicianName?.trim() || this.extractNoteValue(existing.notes, 'Intervenant') || '';
    const description = dto.interventionDescription?.trim() || existing.description;
    const workedHours = dto.workedHours?.trim() || this.extractNoteValue(existing.notes, "Nombre d'heure") || '';
    const machineType = dto.machineType?.trim() || existing.site.name;
    const warrantyEnabled =
      dto.warrantyEnabled ?? this.extractWarranty(existing.notes) ?? false;

    const client =
      (await this.prisma.client.findFirst({
        where: { name: clientName },
      })) ??
      (await this.prisma.client.create({
        data: { name: clientName },
      }));

    const site =
      (await this.prisma.site.findFirst({
        where: {
          clientId: client.id,
          name: machineType,
        },
      })) ??
      (await this.prisma.site.create({
        data: {
          clientId: client.id,
          name: machineType,
          address: machineType,
        },
      }));

    const notes = [
      `Client: ${clientName}`,
      `Intervenant: ${technicianName}`,
      `Description: ${description}`,
      `Nombre d'heure: ${workedHours}`,
      `Garantie: ${warrantyEnabled ? 'Sous garantie' : 'Non garantie'}`,
      `Type de machine: ${machineType}`,
    ].join('\n');

    await this.prisma.intervention.update({
      where: { id },
      data: {
        clientId: client.id,
        siteId: site.id,
        description,
        notes,
        ...(dto.date ? { date: new Date(dto.date) } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });

    if (dto.signatureUrl != null) {
      await this.prisma.signature.upsert({
        where: { interventionId: id },
        update: {
          url: dto.signatureUrl,
          signerName: dto.signerName?.trim() || clientName,
        },
        create: {
          interventionId: id,
          url: dto.signatureUrl,
          signerName: dto.signerName?.trim() || clientName,
        },
      });
    }

    if (dto.technicianSignatureUrl != null) {
      const existingTechnicianSignature = existing.photos.find((photo) => photo.caption === 'Technician signature');
      if (existingTechnicianSignature) {
        await this.prisma.photo.update({
          where: { id: existingTechnicianSignature.id },
          data: { url: dto.technicianSignatureUrl },
        });
      } else {
        await this.prisma.photo.create({
          data: {
            interventionId: id,
            url: dto.technicianSignatureUrl,
            caption: 'Technician signature',
          },
        });
      }
    }

    await this.auditService.log(actorId, 'UPDATE', 'Intervention', id, dto);
    return this.detail(id);
  }

  private extractNoteValue(notes: string | null | undefined, label: string) {
    if (!notes) {
      return null;
    }

    const match = notes.match(new RegExp(`${label}:\\s*(.+)`));
    return match?.[1]?.trim() ?? null;
  }

  private extractWarranty(notes: string | null | undefined) {
    const value = this.extractNoteValue(notes, 'Garantie');
    if (!value) {
      return null;
    }

    return value.toLowerCase().includes('sous garantie');
  }

  async complete(userId: string, id: string, dto: CompleteInterventionDto) {
    const intervention = await this.prisma.intervention.findUnique({ where: { id } });
    if (!intervention) {
      throw new NotFoundException('Intervention not found');
    }
    const items = dto.items ?? [];
    const photoUrls = dto.photoUrls ?? [];

    const completionNotes = [
      `Client: ${dto.clientName}`,
      `Intervenant: ${dto.technicianName}`,
      `Description: ${dto.interventionDescription}`,
      `Nombre d'heure: ${dto.workedHours}`,
      `Garantie: ${dto.warrantyEnabled ? 'Sous garantie' : 'Non garantie'}`,
      `Type de machine: ${dto.machineType}`,
    ].join('\n');

    await this.prisma.$transaction(async (tx) => {
      await tx.interventionItem.deleteMany({ where: { interventionId: id } });
      await tx.photo.deleteMany({ where: { interventionId: id } });

      await tx.client.update({
        where: { id: intervention.clientId },
        data: { name: dto.clientName },
      });

      await tx.site.update({
        where: { id: intervention.siteId },
        data: {
          name: dto.machineType,
          address: dto.machineType,
        },
      });

      for (const item of items) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        await tx.interventionItem.create({
          data: {
            interventionId: id,
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: Number(item.quantity),
            unitPrice: product.unitPrice,
          },
        });
      }

      await tx.photo.createMany({
        data: [
          ...photoUrls.map((url) => ({ interventionId: id, url })),
          { interventionId: id, url: dto.technicianSignatureUrl },
        ],
      });

      await tx.signature.upsert({
        where: { interventionId: id },
        update: { url: dto.signatureUrl, signerName: dto.signerName },
        create: {
          interventionId: id,
          url: dto.signatureUrl,
          signerName: dto.signerName,
        },
      });

      await tx.intervention.update({
        where: { id },
        data: {
          description: dto.interventionDescription,
          notes: completionNotes,
          status: InterventionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    });

    for (const item of items) {
      await this.stockService.registerMovement(
        userId,
        {
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: Number(item.quantity),
          type: StockMovementType.OUT,
          reference: intervention.number,
          notes: `Consumed during intervention ${intervention.number}`,
        },
        id,
      );
    }

    try {
      await this.reportsService.generateInterventionPdf(id);
    } catch (error) {
      this.logger.warn(`PDF generation failed for intervention ${id}: ${String(error)}`);
    }

    try {
      await this.notificationsService.create(intervention.managerId, {
        type: NotificationType.INTERVENTION_COMPLETED,
        title: `Intervention ${intervention.number} completed`,
        message: 'The assigned technician has completed the intervention.',
      });
    } catch (error) {
      this.logger.warn(`Notification creation failed for intervention ${id}: ${String(error)}`);
    }

    try {
      await this.auditService.log(userId, 'COMPLETE', 'Intervention', id, dto);
    } catch (error) {
      this.logger.warn(`Audit log failed for intervention ${id}: ${String(error)}`);
    }

    return this.detail(id);
  }

  async remove(actorId: string, id: string) {
    const intervention = await this.prisma.intervention.findUnique({ where: { id } });
    if (!intervention) {
      throw new NotFoundException('Intervention not found');
    }

    const linkedMovements = await this.prisma.stockMovement.count({ where: { interventionId: id } });
    if (linkedMovements > 0) {
      throw new BadRequestException(
        'Cette intervention ne peut pas etre supprimee car elle est liee a des mouvements de stock.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.interventionItem.deleteMany({ where: { interventionId: id } });
      await tx.photo.deleteMany({ where: { interventionId: id } });
      await tx.signature.deleteMany({ where: { interventionId: id } });
      await tx.intervention.delete({ where: { id } });
    });

    await this.auditService.log(actorId, 'DELETE', 'Intervention', id, { id });
    return { success: true };
  }
}
