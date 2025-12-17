import { Injectable, NotFoundException, BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { RegisterMovementDto } from './dto/register-movement.dto';
import { RegisterScannerMovementDto } from './dto/register-scanner-movement.dto';
import { MovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService
  ) {}

  async registerMovement(dto: RegisterMovementDto) {
    try {
      // Buscar el producto por código
      const product = await this.prisma.product.findUnique({
        where: { code: dto.productCode },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      // ✅ Cambiar a MAYÚSCULAS
      if (dto.type === MovementType.SALIDA && product.stock < dto.quantity) {
        throw new BadRequestException(`Stock insuficiente. Stock actual: ${product.stock}`);
      }

      // ✅ Cambiar a MAYÚSCULAS
      const newStock = dto.type === MovementType.ENTRADA 
        ? product.stock + dto.quantity 
        : product.stock - dto.quantity;

      // Crear movimiento y actualizar stock en una transacción
      const result = await this.prisma.$transaction(async (prisma) => {
        // Crear el movimiento
        const movement = await prisma.inventoryMovement.create({
          data: {
            productId: product.id,
            movementType: dto.type,
            quantity: dto.quantity,
            userId: dto.userId,
            description: dto.description,
          },
          include: {
            product: true,
            user: true,
          },
        });

        // Actualizar stock del producto
        await prisma.product.update({
          where: { id: product.id },
          data: { stock: newStock },
        });

        return movement;
      });

      return {
        success: true,
        // ✅ Cambiar a MAYÚSCULAS
        message: `${dto.type === MovementType.ENTRADA ? 'Entrada' : 'Salida'} registrada exitosamente`,
        data: result,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al registrar movimiento');
    }
  }

  // ✅ Nuevo método para escáner HID
  async registerScannerMovement(dto: RegisterScannerMovementDto, userId: number, userName: string, userRole: string) {
    try {
      // 1. Verificar que el producto existe
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
        select: {
          id: true,
          name: true,
          code: true,
          stock: true,
          allowNegativeStock: true
        }
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      // 2. Validar motivo según tipo de movimiento
      this.validateMovementReason(dto.type, dto.reason);

      // 3. Calcular nuevo stock
      const oldStock = product.stock;
      let newStock: number;

      if (dto.type === 'entry') {
        newStock = oldStock + dto.quantity;
      } else {
        // Validar stock suficiente para salida
        if (!product.allowNegativeStock && oldStock < dto.quantity) {
          throw new UnprocessableEntityException(
            `Stock insuficiente. Stock actual: ${oldStock}, cantidad solicitada: ${dto.quantity}`
          );
        }
        newStock = oldStock - dto.quantity;
      }

      // 4. Crear movimiento y actualizar stock en transacción
      const result = await this.prisma.$transaction(async (prisma) => {
        // Crear el movimiento
        const movement = await prisma.inventoryMovement.create({
          data: {
            productId: dto.productId,
            movementType: dto.type === 'entry' ? MovementType.ENTRADA : MovementType.SALIDA,
            quantity: dto.quantity,
            userId: userId,
            description: `${dto.reason}: ${dto.notes || ''}`.trim(),
            reason: dto.reason,
            notes: dto.notes,
            scannedCode: dto.scannedCode,
            oldStock: oldStock,
            newStock: newStock,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
        });

        // Actualizar stock del producto
        await prisma.product.update({
          where: { id: dto.productId },
          data: { stock: newStock },
        });

        return movement;
      });

      // 5. Log automático del movimiento
      try {
        await this.logsService.createLog(
          {
            action: 'UPDATE',
            entity: 'INVENTORY',
            entityId: result.id,
            entityName: `${product.name} (${product.code})`,
            description: `Movimiento de ${dto.type === 'entry' ? 'entrada' : 'salida'}: ${dto.quantity} unidades por ${dto.reason}`,
            details: {
              productId: dto.productId,
              productName: product.name,
              productCode: product.code,
              movementType: dto.type,
              quantity: dto.quantity,
              reason: dto.reason,
              oldStock: oldStock,
              newStock: newStock,
              scannedCode: dto.scannedCode,
              notes: dto.notes
            }
          },
          userId,
          userName,
          userRole
        );
      } catch (logError) {
        console.error('Error al crear log de movimiento:', logError);
        // No fallar la operación principal por un error de logging
      }

      return {
        success: true,
        message: 'Movimiento registrado correctamente',
        data: {
          movementId: result.id,
          productId: result.productId,
          type: dto.type,
          quantity: result.quantity,
          reason: result.reason,
          notes: result.notes,
          oldStock: result.oldStock,
          newStock: result.newStock,
          timestamp: result.createdAt.toISOString(),
          userId: result.userId,
          userName: userName,
          product: result.product,
          user: result.user
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof UnprocessableEntityException) {
        throw error;
      }
      console.error('Error al registrar movimiento de escáner:', error);
      throw new BadRequestException('Error al registrar el movimiento');
    }
  }

  // ✅ Método auxiliar para validar motivos
  private validateMovementReason(type: string, reason: string): void {
    const entryReasons = ['inventory_adjustment', 'new_stock', 'returned_product'];
    const exitReasons = ['sale', 'damaged', 'lost', 'transfer'];

    if (type === 'entry' && !entryReasons.includes(reason)) {
      throw new BadRequestException(`Motivo inválido para entrada: ${reason}`);
    }

    if (type === 'exit' && !exitReasons.includes(reason)) {
      throw new BadRequestException(`Motivo inválido para salida: ${reason}`);
    }
  }

  async create(createInventoryDto: CreateInventoryDto) {
    return this.registerMovement(createInventoryDto as RegisterMovementDto);
  }

  async findAll(page: number = 1, limit: number = 50, productCode?: string) {
    try {
      const where = productCode 
        ? { product: { code: { contains: productCode } } }
        : {};

      const [movements, total] = await Promise.all([
        this.prisma.inventoryMovement.findMany({
          where,
          include: {
            product: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        this.prisma.inventoryMovement.count({ where }),
      ]);

      return {
        success: true,
        message: 'Movimientos obtenidos exitosamente',
        data: movements,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      };
    } catch (error) {
      throw new BadRequestException('Error al obtener movimientos');
    }
  }

  async findOne(id: number) {
    try {
      const movement = await this.prisma.inventoryMovement.findUnique({
        where: { id },
        include: {
          product: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (!movement) {
        throw new NotFoundException('Movimiento no encontrado');
      }

      return {
        success: true,
        message: 'Movimiento encontrado',
        data: movement,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Error al buscar movimiento');
    }
  }

  async getProductStock(productCode: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { code: productCode },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          stock: true,
          category: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      return {
        success: true,
        message: 'Stock obtenido exitosamente',
        data: product,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Error al obtener stock');
    }
  }

  async getMovementsByProduct(productCode: string, page: number = 1, limit: number = 20) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { code: productCode },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      const [movements, total] = await Promise.all([
        this.prisma.inventoryMovement.findMany({
          where: { productId: product.id },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        this.prisma.inventoryMovement.count({
          where: { productId: product.id },
        }),
      ]);

      return {
        success: true,
        message: 'Historial obtenido exitosamente',
        data: {
          product,
          movements,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
          },
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Error al obtener historial');
    }
  }

  async update(id: number, updateInventoryDto: UpdateInventoryDto) {
    try {
      const movement = await this.prisma.inventoryMovement.update({
        where: { id },
        data: {
          description: updateInventoryDto.description,
        },
        include: {
          product: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return {
        success: true,
        message: 'Movimiento actualizado exitosamente',
        data: movement,
      };
    } catch (error) {
      throw new BadRequestException('Error al actualizar movimiento');
    }
  }

  async remove(id: number) {
    throw new BadRequestException('No se pueden eliminar movimientos de inventario por auditoría');
  }
}