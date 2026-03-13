import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class InterventionItemPayload {
  @IsString()
  productId!: string;

  @IsString()
  warehouseId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CompleteInterventionDto {
  @IsString()
  clientName!: string;

  @IsString()
  technicianName!: string;

  @IsString()
  interventionDescription!: string;

  @IsString()
  workedHours!: string;

  @IsOptional()
  warrantyEnabled?: boolean;

  @IsString()
  machineType!: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => InterventionItemPayload)
  items?: InterventionItemPayload[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  photoUrls?: string[];

  @IsString()
  signerName!: string;

  @IsString()
  signatureUrl!: string;

  @IsString()
  technicianSignatureUrl!: string;
}
