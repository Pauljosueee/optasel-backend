import { IsOptional, IsEnum, IsNumber, IsString, IsDateString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { LogAction, LogEntity } from '@prisma/client';

export class FilterLogsDto {
  @IsOptional()
  @IsEnum(LogAction)
  action?: LogAction;

  @IsOptional()
  @IsEnum(LogEntity)
  entity?: LogEntity;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  format?: 'csv' | 'excel';
}