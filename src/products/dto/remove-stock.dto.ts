import { IsNumber, IsString, IsOptional, Min, MinLength } from 'class-validator';

export class RemoveStockDto {
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @MinLength(10, { message: 'La razón debe tener al menos 10 caracteres' })
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}