import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RemoveStockDto } from './dto/remove-stock.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 100,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: number,
    @Query('type') type?: string,
    @Query('minStock') minStock?: number,
    @Query('maxStock') maxStock?: number,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.productsService.findAll(
      page, 
      limit, 
      search, 
      categoryId, 
      type, 
      minStock, 
      maxStock, 
      minPrice, 
      maxPrice,
      sortBy,
      sortOrder
    );
  }

  @Get('search/advanced')
  advancedSearch(
    @Query('query') query?: string,
    @Query('fields') fields?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 100,
  ) {
    return this.productsService.advancedSearch(query, fields, page, limit);
  }

  @Get('suggestions/brands')
  getBrandSuggestions(@Query('query') query: string) {
    return this.productsService.getBrandSuggestions(query);
  }

  @Get('validate-code/:code')
  validateCode(@Param('code') code: string) {
    return this.productsService.validateCode(code);
  }

  @Post('calculate-margin')
  calculateMargin(@Body() data: { cost: number; price: number }) {
    return this.productsService.calculateMargin(data);
  }

  @Get('stats')
  getProductStats() {
    return this.productsService.getProductStats();
  }

  @Get('low-stock')
  getLowStockProducts(@Query('threshold') threshold: number = 10) {
    return this.productsService.getLowStockProducts(threshold);
  }

  
  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.productsService.findByCode(code);
  }

  @Post('find-by-codes')
  findByCodes(@Body() data: { codes: string[] }) {
    return this.productsService.findByCodes(data.codes);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Put(':id')
  updatePut(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/remove')
  removeStock(@Param('id', ParseIntPipe) id: number, @Body() data: RemoveStockDto) {
    return this.productsService.removeStock(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}