import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLogDto } from './dto/create-log.dto';
import { FilterLogsDto } from './dto/filter-logs.dto';
import { LogAction, LogEntity } from '@prisma/client';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async createLog(createLogDto: CreateLogDto, userId: number, userName: string, userRole: string, ipAddress?: string, userAgent?: string) {
    try {
      const log = await this.prisma.auditLog.create({
        data: {
          action: createLogDto.action,
          entity: createLogDto.entity,
          entityId: createLogDto.entityId ? BigInt(createLogDto.entityId) : null,
          entityName: createLogDto.entityName,
          description: createLogDto.description,
          userId: userId,
          userName: userName,
          userRole: userRole as any,
          details: createLogDto.details || null,
          ipAddress: ipAddress,
          userAgent: userAgent,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Log registrado correctamente',
        data: {
          id: Number(log.id),
          action: log.action,
          entity: log.entity,
          entityId: log.entityId ? Number(log.entityId) : null,
          entityName: log.entityName,
          description: log.description,
          userId: log.userId,
          userName: log.userName,
          userRole: log.userRole,
          timestamp: log.timestamp,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          user: log.user,
        },
      };
    } catch (error) {
      console.error('Error al crear log:', error);
      throw new BadRequestException('Error al registrar el log');
    }
  }

  async findLogs(filters: FilterLogsDto) {
    try {
      const {
        action,
        entity,
        userId,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
        search,
      } = filters;

      const where: any = {};

      if (action) where.action = action;
      if (entity) where.entity = entity;
      if (userId) where.userId = userId;

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      if (search) {
        where.OR = [
          { description: { contains: search } },
          { entityName: { contains: search } },
          { userName: { contains: search } },
        ];
      }

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
          take: Math.min(limit, 500), // Máximo 500 registros por página
          skip: offset,
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      const processedLogs = logs.map(log => ({
        id: Number(log.id), // Convertir BigInt a Number
        action: log.action,
        entity: log.entity,
        entityId: log.entityId ? Number(log.entityId) : null,
        entityName: log.entityName,
        description: log.description,
        userId: log.userId,
        userName: log.userName,
        userRole: log.userRole,
        timestamp: log.timestamp,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        user: log.user,
      }));

      return {
        success: true,
        message: 'Logs obtenidos correctamente',
        logs: processedLogs,
        totalLogs: total,
        hasMore: offset + limit < total,
        pagination: {
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      console.error('Error al obtener logs:', error);
      throw new BadRequestException('Error al obtener los logs');
    }
  }

  async exportLogs(filters: FilterLogsDto, format: 'csv' | 'excel' = 'csv') {
    try {
      // Para la exportación, obtenemos todos los logs sin paginación
      const exportFilters = { ...filters, limit: 10000, offset: 0 };
      const result = await this.findLogs(exportFilters);

      if (format === 'csv') {
        return this.generateCsv(result.logs);
      } else {
        return this.generateExcel(result.logs);
      }
    } catch (error) {
      console.error('Error al exportar logs:', error);
      throw new BadRequestException('Error al exportar los logs');
    }
  }

  private generateCsv(logs: any[]): { content: string; filename: string } {
    const headers = [
      'ID',
      'Acción',
      'Entidad',
      'ID Entidad',
      'Nombre Entidad',
      'Descripción',
      'Usuario',
      'Rol',
      'Fecha',
      'IP',
    ];

    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.id,
        log.action,
        log.entity,
        log.entityId || '',
        log.entityName || '',
        `"${log.description.replace(/"/g, '""')}"`,
        log.userName,
        log.userRole,
        log.timestamp,
        log.ipAddress || '',
      ].join(','))
    ].join('\n');

    const timestamp = new Date().toISOString().slice(0, 10);
    return {
      content: csvContent,
      filename: `audit_logs_${timestamp}.csv`,
    };
  }

  private generateExcel(logs: any[]): { content: string; filename: string } {
    // Para simplificar, retornamos CSV por ahora
    // En el futuro se puede implementar Excel usando librerías como xlsx
    return this.generateCsv(logs);
  }

  // Método helper para registrar logs desde otros servicios
  async logAction(
    action: LogAction,
    entity: LogEntity,
    description: string,
    userId: number,
    userName: string,
    userRole: string,
    entityId?: number,
    entityName?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.createLog(
      {
        action,
        entity,
        entityId,
        entityName,
        description,
        details,
      },
      userId,
      userName,
      userRole,
      ipAddress,
      userAgent,
    );
  }
}