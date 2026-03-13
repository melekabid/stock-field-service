import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ScanStockBarcodeDto {
  @IsString()
  barcode!: string;

  @IsOptional()
  @IsString()
  warehouseCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
