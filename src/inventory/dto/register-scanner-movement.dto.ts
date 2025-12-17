import { IsString, IsEnum, IsInt, IsOptional, Min, IsNotEmpty, IsIn, IsNumber } from 'class-validator';

export class RegisterScannerMovementDto {
  @IsNumber()
  @IsInt()
  @Min(1)
  productId: number;

  @IsEnum(['entry', 'exit'])
  type: 'entry' | 'exit';

  @IsNumber()
  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    // Entry reasons
    'inventory_adjustment', 
    'new_stock', 
    'returned_product',
    // Exit reasons
    'sale', 
    'damaged', 
    'lost', 
    'transfer'
  ])
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @IsNotEmpty()
  scannedCode: string;
}