import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService], // Exportamos para usar en otros módulos
})
export class LogsModule {}