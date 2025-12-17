import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Conectado a la base de datos con Prisma');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}