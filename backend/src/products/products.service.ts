import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../config/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private normalizeBarcode(barcode: string) {
    return barcode.replace(/\s+/g, '').trim();
  }

  async create(actorId: string, dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        ...dto,
        barcode: this.normalizeBarcode(dto.barcode),
      },
    });
    await this.auditService.log(actorId, 'CREATE', 'Product', product.id, dto);
    return product;
  }

  list() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        supplier: true,
        warehouseStocks: { include: { warehouse: true } },
      },
    });
  }

  history(productId: string) {
    return this.prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: { user: true, warehouse: true, intervention: true },
    });
  }

  async update(actorId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        barcode: dto.barcode ? this.normalizeBarcode(dto.barcode) : undefined,
      },
    });
    await this.auditService.log(actorId, 'UPDATE', 'Product', id, dto);
    return product;
  }

  async remove(actorId: string, id: string) {
    const [stockCount, movementCount, interventionCount] = await Promise.all([
      this.prisma.productStock.count({ where: { productId: id } }),
      this.prisma.stockMovement.count({ where: { productId: id } }),
      this.prisma.interventionItem.count({ where: { productId: id } }),
    ]);

    if (stockCount > 0 || movementCount > 0 || interventionCount > 0) {
      throw new BadRequestException(
        'Ce produit ne peut pas etre supprime car il est deja utilise dans le stock ou l historique.',
      );
    }

    const product = await this.prisma.product.delete({ where: { id } });
    await this.auditService.log(actorId, 'DELETE', 'Product', id, { id });
    return product;
  }
}
