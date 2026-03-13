import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  code!: string;

  @IsString()
  barcode!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  categoryId!: string;

  @IsString()
  supplierId!: string;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsInt()
  @Min(0)
  alertThreshold!: number;

  @IsIn(['MACHINE', 'CONSUMABLE'])
  kind!: 'MACHINE' | 'CONSUMABLE';
}
