import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const category = await this.prisma.category.create({
        data: createCategoryDto,
        include: {
          parent: true,
          children: true,
        },
      });

      return {
        success: true,
        message: 'Categoría creada exitosamente',
        data: category,
      };
    } catch (error) {
      throw new Error('Error al crear la categoría');
    }
  }

  async findAll() {
    try {
      const categories = await this.prisma.category.findMany({
        include: {
          parent: true,
          children: true,
          _count: {
            select: { products: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        message: 'Categorías obtenidas exitosamente',
        data: categories,
      };
    } catch (error) {
      throw new Error('Error al obtener las categorías');
    }
  }

  async findOne(id: number) {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id },
        include: {
          parent: true,
          children: true,
          products: true,
        },
      });

      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }

      return {
        success: true,
        message: 'Categoría encontrada',
        data: category,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error('Error al buscar la categoría');
    }
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
        include: {
          parent: true,
          children: true,
        },
      });

      return {
        success: true,
        message: 'Categoría actualizada exitosamente',
        data: category,
      };
    } catch (error) {
      throw new Error('Error al actualizar la categoría');
    }
  }

  async remove(id: number) {
    try {
      // Verificar si tiene productos asociados
      const hasProducts = await this.prisma.product.count({
        where: { categoryId: id },
      });

      if (hasProducts > 0) {
        throw new Error('No se puede eliminar una categoría que tiene productos asociados');
      }

      await this.prisma.category.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Categoría eliminada exitosamente',
      };
    } catch (error) {
      throw new Error(error.message || 'Error al eliminar la categoría');
    }
  }
}