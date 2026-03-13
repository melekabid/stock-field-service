import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Delete, Param, Patch } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateIncomingStockDto } from './dto/create-incoming-stock.dto';
import { ScanStockBarcodeDto } from './dto/scan-stock-barcode.dto';
import { UpdateIncomingStockDto } from './dto/update-incoming-stock.dto';
import { StockService } from './stock.service';

@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  dashboard() {
    return this.stockService.dashboard();
  }

  @Get('mobile')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  mobileCatalog() {
    return this.stockService.mobileCatalog();
  }

  @Get('incoming')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  incoming() {
    return this.stockService.incoming();
  }

  @Post('movements')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateStockMovementDto) {
    return this.stockService.registerMovement(user.id, dto);
  }

  @Post('incoming')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createIncoming(@CurrentUser() user: { id: string }, @Body() dto: CreateIncomingStockDto) {
    return this.stockService.createIncoming(user.id, dto);
  }

  @Patch('incoming/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateIncoming(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateIncomingStockDto,
  ) {
    return this.stockService.updateIncoming(user.id, id, dto);
  }

  @Post('incoming/:id/receive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  receiveIncoming(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.stockService.receiveIncoming(user.id, id);
  }

  @Delete('incoming/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  removeIncoming(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.stockService.removeIncoming(user.id, id);
  }

  @Post('scan-barcode')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  scanBarcode(
    @CurrentUser() user: { id: string; firstName: string; lastName: string; email: string },
    @Body() dto: ScanStockBarcodeDto,
  ) {
    return this.stockService.scanBarcode(user, dto);
  }
}
