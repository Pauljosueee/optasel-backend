import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import * as bcrypt from 'bcrypt';

async function seedDefaultAdmin(prisma: PrismaService) {
  try {
    // Verificar si ya existe un usuario admin
    const existingAdmin = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: 'admin@opsatel.com' },
          { role: 'admin' }
        ]
      }
    });

    if (existingAdmin) {
      console.log('✅ Usuario administrador ya existe');
      return;
    }

    // Crear usuario admin por defecto
    const hashedPassword = await bcrypt.hash('Opsatel2023#Admin!', 10);
    
    const admin = await prisma.user.create({
      data: {
        name: 'Administrador OPSATEL',
        email: 'admin@opsatel.com',
        password: hashedPassword,
        role: 'admin'
      }
    });

    console.log('🔐 Usuario administrador creado exitosamente');
    console.log('📧 Email: admin@opsatel.com');
    console.log('🔑 Password: Opsatel2023#Admin!');
  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar CORS para permitir conexiones del frontend
  app.enableCors({
    origin: [
      'http://localhost',       // Frontend nginx (puerto 80)
      'http://localhost:8101',  // Frontend ionic dev
      'http://localhost:8100',
      'http://localhost:4200'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  }); 
  
  // Prefijo global para todas las rutas
  app.setGlobalPrefix('api');

  // Ejecutar seeder para crear admin por defecto
  const prisma = app.get(PrismaService);
  await seedDefaultAdmin(prisma);

  await app.listen(3000);
  console.log('🚀 Backend corriendo en http://localhost:3000');
  console.log('📡 API disponible en http://localhost:3000/api');
}
bootstrap();