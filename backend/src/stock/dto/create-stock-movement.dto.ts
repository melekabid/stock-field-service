import { StockMovementType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateStockMovementDto {
  @IsString()
  productId!: string;

  @IsString()
  warehouseId!: string;

  @IsEnum(StockMovementType)
  type!: StockMovementType;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
