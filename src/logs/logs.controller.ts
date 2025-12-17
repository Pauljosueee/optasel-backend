import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  UseGuards, 
  Request,
  Res,
  HttpStatus,
  ForbiddenException
} from '@nestjs/common';
import { Response } from 'express';
import { LogsService } from './logs.service';
import { CreateLogDto } from './dto/create-log.dto';
import { FilterLogsDto } from './dto/filter-logs.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post()
  @Roles('admin')
  async createLog(@Body() createLogDto: CreateLogDto, @Request() req: any) {
    const user = req.user;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.logsService.createLog(
      createLogDto,
      user.id,
      user.name,
      user.role,
      ipAddress,
      userAgent,
    );
  }

  @Get()
  @Roles('admin')
  async findLogs(@Query() filters: FilterLogsDto) {
    return this.logsService.findLogs(filters);
  }

  @Get('export')
  @Roles('admin')
  async exportLogs(
    @Query() filters: FilterLogsDto,
    @Res() res: Response,
  ) {
    try {
      const format = filters.format || 'csv';
      const exportData = await this.logsService.exportLogs(filters, format);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
      res.status(HttpStatus.OK).send(exportData.content);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al exportar logs',
        error: error.message,
      });
    }
  }
}