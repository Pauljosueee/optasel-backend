import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RemoveStockDto } from './dto/remove-stock.dto';
import { ProductType, MovementType, LogAction, LogEntity } from '@prisma/client';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      // Validar que el código sea obligatorio
      if (!createProductDto.code) {
        throw new BadRequestException('El código del producto es obligatorio');
      }

      // Verificar que no exista un producto con el mismo código
      const existingProduct = await this.prisma.product.findUnique({
        where: { code: createProductDto.code },
      });

      if (existingProduct) {
        throw new ConflictException('Ya existe un producto con ese código');
      }

      // Verificar que la categoría existe (si se proporciona)
      if (createProductDto.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: createProductDto.categoryId },
        });

        if (!category) {
          throw new NotFoundException('Categoría no encontrada');
        }
      }

      const product = await this.prisma.product.create({
        data: {
          code: createProductDto.code,
          name: createProductDto.name,
          description: createProductDto.description,
          brand: createProductDto.brand,
          type: createProductDto.type,
          categoryId: createProductDto.categoryId || null,
          tags: createProductDto.tags,
          cost: createProductDto.cost || 0,
          price: createProductDto.price || 0,
          stock: createProductDto.stock || 0,
          minStock: createProductDto.minStock || 0,
          maxStock: createProductDto.maxStock,
          isActive: createProductDto.isActive ?? true,
          allowNegativeStock: createProductDto.allowNegativeStock ?? false,
          trackSerial: createProductDto.trackSerial ?? false,
          notes: createProductDto.notes,
          warningNotes: createProductDto.warningNotes,
        },
        include: {
          category: true,
        },
      });

      return {
        success: true,
        message: 'Producto creado exitosamente',
        data: product,
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error al crear producto:', error);
      throw new BadRequestException('Error al crear el producto: ' + error.message);
    }
  }

  async findAll(
    page: number = 1, 
    limit: number = 100, 
    search?: string, 
    categoryId?: number,
    type?: string,
    minStock?: number,
    maxStock?: number,
    minPrice?: number,
    maxPrice?: number,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ) {
    try {
      const where: any = {};

      // Filtro por búsqueda (código o nombre)
      if (search) {
        where.OR = [
          { code: { contains: search } },
          { name: { contains: search } },
          { brand: { contains: search } },
        ];
      }

      // Filtro por categoría
      if (categoryId) {
        where.categoryId = categoryId;
      }

      // Filtro por tipo de producto
      if (type) {
        where.type = type;
      }

      // Filtros por stock
      if (minStock !== undefined || maxStock !== undefined) {
        where.stock = {};
        if (minStock !== undefined) where.stock.gte = minStock;
        if (maxStock !== undefined) where.stock.lte = maxStock;
      }

      // Filtros por precio
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
      }

      // Solo productos activos por defecto
      where.isActive = true;

      // Configurar ordenamiento
      let orderBy: any = { name: 'asc' };
      
      if (sortBy) {
        const validSortFields = ['name', 'code', 'price', 'stock', 'createdAt', 'brand'];
        if (validSortFields.includes(sortBy)) {
          orderBy = { [sortBy]: sortOrder };
        }
      }

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include: {
            category: true,
            _count: {
              select: { movements: true },
            },
          },
          orderBy,
          take: limit > 500 ? 500 : limit,
          skip: (page - 1) * limit,
        }),
        this.prisma.product.count({ where }),
      ]);

      return {
        success: true,
        message: 'Productos obtenidos exitosamente',
        data: products,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
        filters: {
          search,
          categoryId,
          type,
          minStock,
          maxStock,
          minPrice,
          maxPrice,
          sortBy,
          sortOrder,
        },
      };
    } catch (error) {
      console.error('Error en ProductsService.findAll:', error);
      throw new BadRequestException(`Error al obtener los productos: ${error.message}`);
    }
  }

  async findOne(id: number) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          movements: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      return {
        success: true,
        message: 'Producto encontrado',
        data: product,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Error al buscar el producto');
    }
  }

  async findByCode(code: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { code },
        include: {
          category: true,
          _count: {
            select: { movements: true },
          },
        },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      return {
        success: true,
        message: 'Producto encontrado',
        data: product,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Error al buscar el producto por código');
    }
  }

  async findByBarcode(barcode: string) {
    try {
      throw new BadRequestException('Funcionalidad de código de barras no implementada');
    } catch (error) {
      throw new BadRequestException('Error al buscar el producto por código de barras');
    }
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    try {
      // Crear una copia para evitar mutar el objeto original
      const productData: any = { ...updateProductDto };
      
      // Filtrar campos que no existen en el modelo (como barcode)
      delete productData.barcode;
      
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new NotFoundException('Producto no encontrado');
      }

      // Si no se proporciona código, usar el código existente
      if (!productData.code) {
        productData.code = existingProduct.code;
      }

      // Si no se proporciona tipo, usar el tipo existente
      if (!productData.type) {
        productData.type = existingProduct.type;
      }

      // Validar código según el tipo de producto
      if ((productData.type === 'UNIQUE' || productData.type === ProductType.UNIQUE) && (!productData.code || productData.code === '')) {
        throw new BadRequestException('Los productos de tipo ÚNICO requieren un código');
      }

      // Si se está actualizando el código, verificar que no exista otro producto con ese código
      if (productData.code && productData.code !== existingProduct.code) {
        const productWithCode = await this.prisma.product.findUnique({
          where: { code: productData.code },
        });

        if (productWithCode) {
          throw new ConflictException('Ya existe un producto con ese código');
        }
      }

      // Verificar que la categoría existe (si se proporciona)
      if (productData.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: productData.categoryId },
        });

        if (!category) {
          throw new NotFoundException('Categoría no encontrada');
        }
      }

      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...productData,
          updatedAt: new Date(),
        },
        include: {
          category: true,
        },
      });

      // Registrar log de auditoría
      try {
        await this.logsService.logAction(
          LogAction.UPDATE,
          LogEntity.PRODUCT,
          `Producto actualizado: ${product.name} (${product.code})`,
          1, // TODO: Obtener del usuario autenticado
          'Sistema', // TODO: Obtener del usuario autenticado
          'admin', // TODO: Obtener del usuario autenticado
          product.id,
          product.name,
          {
            changes: productData,
            previousData: {
              name: existingProduct.name,
              price: existingProduct.price,
              stock: existingProduct.stock,
            },
          },
        );
      } catch (logError) {
        console.error('Error al registrar log:', logError);
      }

      return {
        success: true,
        message: 'Producto actualizado exitosamente',
        data: product,
      };
    } catch (error) {
      console.error('Error en update:', error);
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error al actualizar el producto: ${error.message}`);
    }
  }

  async removeStock(id: number, removeStockDto: RemoveStockDto) {
    try {
      const { quantity, reason, notes } = removeStockDto;
      
      console.log('Datos recibidos para retiro:', { productId: id, quantity, reason, notes });

      // Buscar el producto
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: { category: true },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      console.log('Producto encontrado:', { id: product.id, name: product.name, stock: product.stock });

      // Validar que la cantidad no exceda el stock disponible
      if (quantity > product.stock) {
        throw new BadRequestException(`No se puede retirar ${quantity} unidades. Stock disponible: ${product.stock}`);
      }

      // Calcular el nuevo stock
      const newStock = product.stock - quantity;
      
      // Usuario del sistema por defecto (TODO: Obtener del token de autenticación)
      // Verificar si existe un usuario del sistema, si no, usar null o crear uno
      let systemUserId = 1;
      
      try {
        const systemUser = await this.prisma.user.findUnique({
          where: { id: systemUserId }
        });
        
        if (!systemUser) {
          console.log('Usuario del sistema no encontrado, usando ID por defecto');
          // Si no existe el usuario, intentar encontrar cualquier usuario admin
          const anyAdmin = await this.prisma.user.findFirst({
            where: { role: 'admin' }
          });
          
          if (anyAdmin) {
            systemUserId = anyAdmin.id;
            console.log('Usando admin existente:', anyAdmin.id);
          } else {
            // Si no hay ningún admin, usar ID 1 y manejar el error
            console.log('No se encontró ningún usuario admin, usando ID 1');
          }
        }
      } catch (userError) {
        console.log('Error al verificar usuario del sistema:', userError);
      }
      
      console.log('Calculando retiro:', { stockActual: product.stock, cantidadRetiro: quantity, nuevoStock: newStock });

      // Si el nuevo stock es 0, eliminar el producto
      if (newStock === 0) {
        console.log('Eliminación completa del producto');
        
        // Registrar el movimiento de inventario antes de eliminar
        await this.prisma.inventoryMovement.create({
          data: {
            movementType: MovementType.SALIDA,
            quantity: quantity,
            description: `ELIMINACIÓN: ${reason}${notes ? ` - ${notes}` : ''}`,
            productId: id,
            userId: systemUserId,
          },
        });

        // Eliminar el producto
        await this.prisma.product.delete({
          where: { id },
        });

        // Registrar log de auditoría
        try {
          await this.logsService.logAction(
            LogAction.DELETE,
            LogEntity.PRODUCT,
            `Producto eliminado completamente: ${product.name} (${product.code}) - Retiro de ${quantity} unidades. Razón: ${reason}`,
            systemUserId,
            'Sistema', // TODO: Obtener del usuario autenticado
            'admin', // TODO: Obtener del usuario autenticado
            product.id,
            product.name,
            {
              quantityRemoved: quantity,
              reason,
              notes,
              finalStock: 0,
            },
          );
        } catch (logError) {
          console.error('Error al registrar log:', logError);
        }

        return {
          success: true,
          message: `Producto eliminado completamente. Se retiraron ${quantity} unidades`,
          data: {
            action: 'DELETED',
            quantityRemoved: quantity,
            reason,
            notes,
            product: product,
          },
        };
      } else {
        console.log('Retiro parcial del producto');
        
        // Actualizar el stock del producto
        const updatedProduct = await this.prisma.product.update({
          where: { id },
          data: {
            stock: newStock,
            updatedAt: new Date(),
          },
          include: { category: true },
        });

        console.log('Producto actualizado:', { id: updatedProduct.id, nuevoStock: updatedProduct.stock });

        // Registrar el movimiento de inventario
        await this.prisma.inventoryMovement.create({
          data: {
            movementType: MovementType.SALIDA,
            quantity: quantity,
            description: `RETIRO: ${reason}${notes ? ` - ${notes}` : ''}`,
            productId: id,
            userId: systemUserId,
          },
        });

        console.log('Movimiento de inventario registrado correctamente');

        // Registrar log de auditoría
        try {
          await this.logsService.logAction(
            LogAction.REMOVE,
            LogEntity.PRODUCT,
            `Retiro parcial de producto: ${product.name} (${product.code}) - ${quantity} unidades retiradas. Stock restante: ${newStock}. Razón: ${reason}`,
            systemUserId,
            'Sistema', // TODO: Obtener del usuario autenticado
            'admin', // TODO: Obtener del usuario autenticado
            product.id,
            product.name,
            {
              quantityRemoved: quantity,
              previousStock: product.stock,
              newStock,
              reason,
              notes,
            },
          );
        } catch (logError) {
          console.error('Error al registrar log:', logError);
        }

        return {
          success: true,
          message: `Stock actualizado. Se retiraron ${quantity} unidades. Stock restante: ${newStock}`,
          data: {
            action: 'UPDATED',
            quantityRemoved: quantity,
            previousStock: product.stock,
            newStock: newStock,
            reason,
            notes,
            product: updatedProduct,
          },
        };
      }
    } catch (error) {
      console.error('Error en removeStock:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error al retirar stock del producto: ${error.message}`);
    }
  }

  async remove(id: number) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          movements: true, // Incluir movimientos para logging
        },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      // ✅ Eliminar en transacción: primero movimientos, luego producto
      await this.prisma.$transaction(async (prisma) => {
        // 1. Eliminar todos los movimientos de inventario relacionados
        const movementsCount = await prisma.inventoryMovement.count({
          where: { productId: id },
        });

        if (movementsCount > 0) {
          await prisma.inventoryMovement.deleteMany({
            where: { productId: id },
          });
          console.log(`✅ Eliminados ${movementsCount} movimientos de inventario del producto ${product.name} (${product.code})`);
        }

        // 2. Eliminar el producto
        await prisma.product.delete({
          where: { id },
        });
      });

      return {
        success: true,
        message: 'Producto eliminado exitosamente (incluyendo su historial de movimientos)',
        data: {
          id: product.id,
          name: product.name,
          code: product.code,
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error al eliminar producto:', error);
      throw new BadRequestException('Error al eliminar el producto');
    }
  }

  // ✅ FUNCIONALIDADES BÁSICAS

  async getLowStockProducts(threshold: number = 10) {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          stock: { lte: threshold },
          isActive: true,
        },
        include: {
          category: true,
        },
        orderBy: { stock: 'asc' },
      });

      return {
        success: true,
        message: 'Productos con stock bajo obtenidos exitosamente',
        data: products,
      };
    } catch (error) {
      throw new BadRequestException('Error al obtener productos con stock bajo');
    }
  }

  async advancedSearch(query?: string, fields?: string, page: number = 1, limit: number = 100) {
    try {
      if (!query) {
        return this.findAll(page, limit);
      }

      const searchFields = fields ? fields.split(',') : ['code', 'name'];
      const where: any = {};

      const orConditions: any[] = [];

      if (searchFields.includes('code')) {
        orConditions.push({ code: { contains: query } });
      }

      if (searchFields.includes('name')) {
        orConditions.push({ name: { contains: query } });
      }

      if (searchFields.includes('brand')) {
        orConditions.push({ brand: { contains: query } });
      }

      if (searchFields.includes('category')) {
        orConditions.push({
          category: {
            name: { contains: query }
          }
        });
      }

      if (searchFields.includes('tags')) {
        orConditions.push({ tags: { contains: query } });
      }

      if (orConditions.length > 0) {
        where.OR = orConditions;
      }

      where.isActive = true;

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include: {
            category: true,
            _count: {
              select: { movements: true },
            },
          },
          orderBy: { name: 'asc' },
          take: limit > 500 ? 500 : limit,
          skip: (page - 1) * limit,
        }),
        this.prisma.product.count({ where }),
      ]);

      return {
        success: true,
        message: `Búsqueda avanzada completada. Encontrados ${total} productos`,
        data: products,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
        searchInfo: {
          query,
          fields: searchFields,
        },
      };
    } catch (error) {
      throw new BadRequestException('Error en la búsqueda avanzada');
    }
  }

  async getBrandSuggestions(query: string) {
    try {
      const brands = await this.prisma.product.findMany({
        where: {
        // ✅ Combinar las condiciones de brand en una sola
        brand: { 
          contains: query,
          not: null 
        },
        isActive: true,
      },
        select: { brand: true },
        distinct: ['brand'],
        take: 10,
      });

      return {
        success: true,
        data: brands.map(item => item.brand).filter(Boolean),
      };
    } catch (error) {
      throw new BadRequestException('Error al obtener sugerencias de marcas');
    }
  }

  async validateCode(code: string) {
    try {
      // Buscar por código interno
      const existsByCode = await this.prisma.product.findUnique({
        where: { code },
        select: { id: true, name: true, code: true },
      });

      return {
        success: true,
        data: {
          exists: !!existsByCode,
          product: existsByCode || null,
        },
      };
    } catch (error) {
      throw new BadRequestException('Error al validar código');
    }
  }

  async calculateMargin(data: { cost: number; price: number }) {
    try {
      const margin = data.price - data.cost;
      const marginPercentage = data.cost > 0 ? (margin / data.cost) * 100 : 0;

      return {
        success: true,
        data: {
          cost: data.cost,
          price: data.price,
          margin: Math.round(margin * 100) / 100,
          marginPercentage: Math.round(marginPercentage * 100) / 100,
        },
      };
    } catch (error) {
      throw new BadRequestException('Error al calcular margen');
    }
  }

  async getProductStats() {
    try {
      const [
        totalProducts,
        activeProducts,
        lowStockProducts,
        productsByCategory,
        productsByType,
        avgPrice
      ] = await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({
          where: { isActive: true }
        }),
        this.prisma.product.count({
          where: { 
            stock: { lte: 10 },
            isActive: true 
          }
        }),
        this.prisma.product.groupBy({
          by: ['categoryId'],
          _count: { _all: true },
          where: { 
            categoryId: { not: null },
            isActive: true 
          }
        }),
        this.prisma.product.groupBy({
          by: ['type'],
          _count: { _all: true },
          where: { isActive: true }
        }),
        this.prisma.product.aggregate({
          _avg: { price: true },
          where: { isActive: true }
        })
      ]);

      return {
        success: true,
        message: 'Estadísticas de productos obtenidas exitosamente',
        data: {
          totalProducts,
          activeProducts,
          lowStockProducts,
          productsByCategory,
          productsByType,
          averagePrice: avgPrice._avg.price || 0,
        },
      };
    } catch (error) {
      throw new BadRequestException('Error al obtener estadísticas de productos');
    }
  }

  async findByCodes(codes: string[]) {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          code: { in: codes },
          isActive: true,
        },
        include: {
          category: true,
        },
      });

      const foundCodes = products.map(p => p.code);
      const notFoundCodes = codes.filter(code => !foundCodes.includes(code));

      return {
        success: true,
        message: `${products.length} de ${codes.length} productos encontrados`,
        data: {
          found: products,
          notFound: notFoundCodes,
          summary: {
            total: codes.length,
            found: products.length,
            notFound: notFoundCodes.length,
          }
        },
      };
    } catch (error) {
      throw new BadRequestException('Error al buscar productos por códigos');
    }
  }
}