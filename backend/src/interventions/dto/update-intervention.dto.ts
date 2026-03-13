import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { InterventionStatus } from '@prisma/client';

export class UpdateInterventionDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(InterventionStatus)
  status?: InterventionStatus;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  technicianName?: string;

  @IsOptional()
  @IsString()
  interventionDescription?: string;

  @IsOptional()
  @IsString()
  workedHours?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  warrantyEnabled?: boolean;

  @IsOptional()
  @IsString()
  machineType?: string;

  @IsOptional()
  @IsString()
  signerName?: string;

  @IsOptional()
  @IsString()
  signatureUrl?: string;

  @IsOptional()
  @IsString()
  technicianSignatureUrl?: string;
}
