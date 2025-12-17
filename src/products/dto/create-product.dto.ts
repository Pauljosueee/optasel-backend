import { IsString, IsEnum, IsOptional, IsInt, IsNumber, IsBoolean, Min, MinLength } from 'class-validator';
import { ProductType } from '@prisma/client';

export class CreateProductDto {
  // ✅ CÓDIGO (Obligatorio)
  @IsString()
  @MinLength(1)
  code: string; // Código del producto - OBLIGATORIO

  // ✅ INFORMACIÓN BÁSICA
  @IsString()
  @MinLength(2)
  name: string; // Nombre del producto

  @IsString()
  @IsOptional()
  description?: string; // Descripción detallada

  @IsString()
  @IsOptional()
  brand?: string; // Marca del producto

  // ✅ CLASIFICACIÓN
  @IsEnum(ProductType)
  type: ProductType; // UNIQUE o BULK

  @IsOptional()
  @IsInt()
  categoryId?: number; // Categoría

  @IsString()
  @IsOptional()
  tags?: string; // Tags separados por comas: "electronico,laptop,dell"

  // ✅ PRECIOS Y COSTOS
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number; // Precio de costo

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number; // Precio de venta

  // ✅ INVENTARIO
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number; // Stock inicial

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number; // Stock mínimo (alerta)

  @IsOptional()
  @IsInt()
  @Min(0)
  maxStock?: number; // Stock máximo

  // ✅ CONFIGURACIONES
  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // Producto activo

  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean; // Permitir stock negativo

  @IsOptional()
  @IsBoolean()
  trackSerial?: boolean; // Rastrear números de serie

  // ✅ NOTAS Y OBSERVACIONES
  @IsString()
  @IsOptional()
  notes?: string; // Notas internas

  @IsString()
  @IsOptional()
  warningNotes?: string; // Notas de advertencia
}