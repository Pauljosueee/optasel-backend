import { IsString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { MovementType } from '@prisma/client'; // ✅ Importar desde Prisma

export class RegisterMovementDto {
  @IsString()
  productCode: string;

  @IsEnum(MovementType)
  type: MovementType; // ✅ Usar el enum de Prisma

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  userId: number;

  @IsOptional()
  @IsString()
  description?: string;
}