import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.id, dto);
  }

  @Get()
  list() {
    return this.productsService.list();
  }

  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.productsService.history(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.productsService.remove(user.id, id);
  }
}
