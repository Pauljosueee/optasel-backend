import { IsEnum, IsOptional, IsString, IsNumber, IsObject, IsDateString } from 'class-validator';
import { LogAction, LogEntity } from '@prisma/client';

export class CreateLogDto {
  @IsEnum(LogAction)
  action: LogAction;

  @IsEnum(LogEntity)
  entity: LogEntity;

  @IsOptional()
  @IsNumber()
  entityId?: number;

  @IsOptional()
  @IsString()
  entityName?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsObject()
  details?: any;
}