import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IncomingStockStatus, NotificationType, StockMovementType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../config/prisma.service';
import { CreateIncomingStockDto } from './dto/create-incoming-stock.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { ScanStockBarcodeDto } from './dto/scan-stock-barcode.dto';
import { UpdateIncomingStockDto } from './dto/update-incoming-stock.dto';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private normalizeBarcode(barcode: string) {
    return barcode.replace(/\s+/g, '').trim();
  }

  private compactBarcode(barcode: string) {
    return this.normalizeBarcode(barcode).replace(/[^0-9A-Za-z]/g, '');
  }

  async registerMovement(actorId: string, dto: CreateStockMovementDto, interventionId?: string) {
    const sign = dto.type === StockMovementType.OUT ? -1 : 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const stock = await tx.productStock.upsert({
        where: {
          productId_warehouseId: {
            productId: dto.productId,
            warehouseId: dto.warehouseId,
          },
        },
        update: {
          quantity: { increment: sign * dto.quantity },
        },
        create: {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          quantity: sign * dto.quantity,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          ...dto,
          userId: actorId,
          interventionId,
        },
      });

      const product = await tx.product.findUniqueOrThrow({ where: { id: dto.productId } });

      if (stock.quantity <= product.alertThreshold) {
        const managers = await tx.user.findMany({
          where: { role: { in: ['ADMIN', 'MANAGER'] } },
          select: { id: true },
        });

        await tx.notification.createMany({
          data: managers.map((user) => ({
            userId: user.id,
            ...{
              type: NotificationType.STOCK_ALERT,
              title: `Low stock: ${product.name}`,
              message: `Remaining quantity is ${stock.quantity} in warehouse ${dto.warehouseId}.`,
            },
          })),
        });
      }

      return { stock, movement };
    });

    await this.auditService.log(actorId, 'STOCK_MOVEMENT', 'StockMovement', result.movement.id, dto);
    return result;
  }

  dashboard() {
    return this.prisma.product.findMany({
      include: {
        warehouseStocks: { include: { warehouse: true } },
        category: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  incoming() {
    return this.prisma.incomingStock.findMany({
      include: {
        product: {
          include: {
            category: true,
            supplier: true,
          },
        },
        warehouse: true,
      },
      orderBy: [{ status: 'asc' }, { expectedAt: 'asc' }],
    });
  }

  async createIncoming(actorId: string, dto: CreateIncomingStockDto) {
    const incoming = await this.prisma.incomingStock.create({
      data: {
        productId: dto.productId,
        warehouseId: dto.warehouseId,
        quantity: dto.quantity,
        expectedAt: new Date(dto.expectedAt),
        notes: dto.notes,
      },
      include: {
        product: { include: { category: true, supplier: true } },
        warehouse: true,
      },
    });

    await this.auditService.log(actorId, 'CREATE', 'IncomingStock', incoming.id, dto);
    return incoming;
  }

  async updateIncoming(actorId: string, id: string, dto: UpdateIncomingStockDto) {
    const incoming = await this.prisma.incomingStock.update({
      where: { id },
      data: {
        ...(dto.productId ? { productId: dto.productId } : {}),
        ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
        ...(dto.quantity ? { quantity: dto.quantity } : {}),
        ...(dto.expectedAt ? { expectedAt: new Date(dto.expectedAt) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: {
        product: { include: { category: true, supplier: true } },
        warehouse: true,
      },
    });

    await this.auditService.log(actorId, 'UPDATE', 'IncomingStock', incoming.id, dto);
    return incoming;
  }

  async receiveIncoming(actorId: string, id: string) {
    const incoming = await this.prisma.incomingStock.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    });

    if (!incoming) {
      throw new NotFoundException("Commande d'entree introuvable");
    }

    if (incoming.status === IncomingStockStatus.RECEIVED) {
      throw new BadRequestException('Cette commande est deja marquee comme recue.');
    }

    await this.registerMovement(actorId, {
      productId: incoming.productId,
      warehouseId: incoming.warehouseId,
      type: StockMovementType.IN,
      quantity: incoming.quantity,
      reference: `INCOMING-${incoming.product.code}`,
      notes: incoming.notes || `Reception planifiee du produit ${incoming.product.name}`,
    });

    const updated = await this.prisma.incomingStock.update({
      where: { id },
      data: {
        status: IncomingStockStatus.RECEIVED,
        receivedAt: new Date(),
      },
      include: {
        product: { include: { category: true, supplier: true } },
        warehouse: true,
      },
    });

    await this.auditService.log(actorId, 'RECEIVE', 'IncomingStock', id, { id });
    return updated;
  }

  async removeIncoming(actorId: string, id: string) {
    const incoming = await this.prisma.incomingStock.findUnique({ where: { id } });
    if (!incoming) {
      throw new NotFoundException("Commande d'entree introuvable");
    }

    if (incoming.status === IncomingStockStatus.RECEIVED) {
      throw new BadRequestException('Cette commande a deja ete recue et ne peut plus etre supprimee.');
    }

    await this.prisma.incomingStock.delete({ where: { id } });
    await this.auditService.log(actorId, 'DELETE', 'IncomingStock', id, { id });
    return { success: true };
  }

  async mobileCatalog() {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
        warehouseStocks: { include: { warehouse: true } },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });

    return products.map((product) => {
      const totalQuantity = product.warehouseStocks.reduce((sum, item) => sum + item.quantity, 0);
      const primaryStock = product.warehouseStocks[0];

      return {
        id: product.id,
        name: product.name,
        reference: product.code,
        barcode: product.barcode ?? '',
        kind: product.kind,
        category: product.category.name,
        quantity: totalQuantity,
        warehouseId: primaryStock?.warehouseId,
        warehouseCode: primaryStock?.warehouse.code,
        warehouseName: primaryStock?.warehouse.name,
        alertThreshold: product.alertThreshold,
        description: product.description,
      };
    });
  }

  async scanBarcode(
    actor: { id: string; firstName: string; lastName: string; email: string },
    dto: ScanStockBarcodeDto,
  ) {
    const normalizedBarcode = this.normalizeBarcode(dto.barcode);
    const compactDigits = this.compactBarcode(dto.barcode);
    const warehouse = dto.warehouseCode
      ? await this.prisma.warehouse.findUnique({ where: { code: dto.warehouseCode } })
      : await this.prisma.warehouse.findUnique({ where: { code: 'MAIN' } });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        OR: [
          { barcode: normalizedBarcode },
          { barcode: compactDigits },
          { code: normalizedBarcode },
          { code: compactDigits },
          ...(compactDigits.length === 0
              ? []
              : [
                  { barcode: { endsWith: compactDigits } },
                  { barcode: { contains: compactDigits } },
                  { code: { contains: compactDigits } },
                ]),
        ],
      },
      include: {
        category: true,
        warehouseStocks: {
          where: { warehouseId: warehouse.id },
          include: { warehouse: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!product) {
      throw new NotFoundException(`Produit introuvable pour ce code-barres : ${normalizedBarcode}`);
    }

    const stock = product.warehouseStocks[0];
    const quantity = dto.quantity ?? 1;

    if (!stock || stock.quantity < quantity) {
      throw new BadRequestException('Stock insuffisant pour cette reference');
    }

    await this.registerMovement(actor.id, {
      productId: product.id,
      warehouseId: warehouse.id,
      type: StockMovementType.OUT,
      quantity,
      reference: `SCAN-${product.code}`,
      notes: `Sortie mobile par ${actor.firstName} ${actor.lastName} (${actor.email})`,
    });

    const updatedStock = await this.prisma.productStock.findUnique({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse.id,
        },
      },
    });

    return {
      message: `${product.name} retire du stock`,
      takenBy: `${actor.firstName} ${actor.lastName}`,
      product: {
        id: product.id,
        name: product.name,
        reference: product.code,
        barcode: product.barcode ?? '',
        category: product.category.name,
        kind: product.kind,
      },
      quantityTaken: quantity,
      remainingQuantity: updatedStock?.quantity ?? 0,
      warehouse: {
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
      },
    };
  }
}
