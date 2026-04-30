import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dns from 'dns';

const dnsServers = process.env.NODE_DNS_SERVERS;
if (dnsServers) {
  const servers = dnsServers.split(',').map((s) => s.trim()).filter(Boolean);
  if (servers.length) {
    dns.setServers(servers);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar ValidationPipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades no decoradas
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
      transform: true, // Transforma automáticamente los datos
      transformOptions: {
        enableImplicitConversion: true, // Convierte tipos implícitamente
      },
    }),
  );

  app.enableCors();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
