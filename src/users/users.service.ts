import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    try {
      // Verificar que no exista un usuario con el mismo email
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }

      // Encriptar la contraseña
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const user = await this.prisma.user.create({
        data: {
          ...createUserDto,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return {
        success: true,
        message: 'Usuario creado exitosamente',
        data: user,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Error al crear el usuario');
    }
  }

  async findAll(page: number = 1, limit: number = 50, search?: string, role?: string) {
    try {
      const where: any = {};

      // Filtro por búsqueda (nombre o email)
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
        ];
      }

      // Filtro por rol
      if (role) {
        where.role = role;
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            _count: {
              select: { movements: true },
            },
          },
          orderBy: { name: 'asc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        success: true,
        message: 'Usuarios obtenidos exitosamente',
        data: users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      };
    } catch (error) {
      throw new BadRequestException('Error al obtener los usuarios');
    }
  }

  async findOne(id: number) {
    try {
      console.log('Buscando usuario con ID:', id);
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          movements: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              product: {
                select: { id: true, code: true, name: true },
              },
            },
          },
          _count: {
            select: { movements: true },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      return {
        success: true,
        message: 'Usuario encontrado',
        data: user,
      };
    } catch (error) {
      console.error('Error en findOne:', error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Error al buscar el usuario: ${error.message}`);
    }
  }

  async findByEmail(email: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      return {
        success: true,
        message: 'Usuario encontrado',
        data: user,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Error al buscar el usuario por email');
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      // Verificar que el usuario existe
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Si se está actualizando el email, verificar que no exista otro usuario con ese email
      if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
        const userWithEmail = await this.prisma.user.findUnique({
          where: { email: updateUserDto.email },
        });

        if (userWithEmail) {
          throw new ConflictException('Ya existe un usuario con ese email');
        }
      }

      // Preparar datos para actualizar
      const updateData: any = { ...updateUserDto };

      // Si se proporciona una nueva contraseña, encriptarla
      if (updateUserDto.password) {
        updateData.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return {
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: user,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Error al actualizar el usuario');
    }
  }

  async remove(id: number) {
    try {
      // Verificar que el usuario existe
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Verificar si tiene movimientos de inventario
      const hasMovements = await this.prisma.inventoryMovement.count({
        where: { userId: id },
      });

      if (hasMovements > 0) {
        throw new BadRequestException('No se puede eliminar un usuario que tiene movimientos de inventario registrados');
      }

      await this.prisma.user.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Usuario eliminado exitosamente',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar el usuario');
    }
  }

  // Cambiar contraseña
  async changePassword(id: number, currentPassword: string, newPassword: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Contraseña actual incorrecta');
      }

      // Encriptar nueva contraseña
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      await this.prisma.user.update({
        where: { id },
        data: { password: hashedNewPassword },
      });

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al cambiar la contraseña');
    }
  }

  // Obtener estadísticas de actividad del usuario
  async getUserStats(id: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const [totalMovements, movementsThisMonth, recentMovements] = await Promise.all([
        this.prisma.inventoryMovement.count({
          where: { userId: id },
        }),
        this.prisma.inventoryMovement.count({
          where: {
            userId: id,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        this.prisma.inventoryMovement.findMany({
          where: { userId: id },
          include: {
            product: {
              select: { code: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      return {
        success: true,
        message: 'Estadísticas del usuario obtenidas exitosamente',
        data: {
          user,
          stats: {
            totalMovements,
            movementsThisMonth,
            recentMovements,
          },
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Error al obtener estadísticas del usuario');
    }
  }
}