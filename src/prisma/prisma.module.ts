// filepath: c:\Users\LENOVO\Documents\PRACTICAS OPSATEL\Inventario\backend\src\prisma\prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}