import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { RegisterMovementDto } from './dto/register-movement.dto';
import { RegisterScannerMovementDto } from './dto/register-scanner-movement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movement')
  registerMovement(@Body() registerMovementDto: RegisterMovementDto) {
    return this.inventoryService.registerMovement(registerMovementDto);
  }

  // ✅ Nuevo endpoint para escáner HID
  @Post('scanner-movement')
  async registerScannerMovement(
    @Body() registerScannerMovementDto: RegisterScannerMovementDto,
    @Request() req: any
  ) {
    const userId = req.user.id;
    const userName = req.user.name;
    const userRole = req.user.role;
    
    return this.inventoryService.registerScannerMovement(
      registerScannerMovementDto, 
      userId, 
      userName,
      userRole
    );
  }

  @Post()
  create(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('productCode') productCode?: string,
  ) {
    return this.inventoryService.findAll(page, limit, productCode);
  }

  @Get('product/:code/stock')
  getProductStock(@Param('code') code: string) {
    return this.inventoryService.getProductStock(code);
  }

  // ✅ Mantener solo una ruta para movimientos por producto
  @Get('product/:productCode/movements')
  getMovementsByProduct(
    @Param('productCode') productCode: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.inventoryService.getMovementsByProduct(productCode, page, limit);
  }

  // ❌ ELIMINAR esta función duplicada - era la que causaba el error
  // @Get('product/:code/history')
  // getMovementsByProduct(
  //   @Param('code') code: string,
  //   @Query('page') page: number = 1,
  //   @Query('limit') limit: number = 20,
  // ) {
  //   return this.inventoryService.getMovementsByProduct(code, page, limit);
  // }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateInventoryDto: UpdateInventoryDto) {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.remove(id);
  }
}