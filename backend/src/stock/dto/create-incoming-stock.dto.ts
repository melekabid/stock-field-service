import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateIncomingStockDto {
  @IsString()
  productId!: string;

  @IsString()
  warehouseId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsDateString()
  expectedAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
