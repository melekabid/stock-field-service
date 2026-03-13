import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../config/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async create(actorId: string, dto: CreateCategoryDto) {
    const category = await this.prisma.category.create({ data: dto });
    await this.auditService.log(actorId, 'CREATE', 'Category', category.id, dto);
    return category;
  }

  async update(actorId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.update({
      where: { id },
      data: dto,
    });
    await this.auditService.log(actorId, 'UPDATE', 'Category', id, dto);
    return category;
  }

  async remove(actorId: string, id: string) {
    const productsCount = await this.prisma.product.count({ where: { categoryId: id } });

    if (productsCount > 0) {
      throw new BadRequestException('Cette categorie ne peut pas etre supprimee car elle contient deja des produits.');
    }

    const category = await this.prisma.category.delete({ where: { id } });
    await this.auditService.log(actorId, 'DELETE', 'Category', id, { id });
    return category;
  }
}
