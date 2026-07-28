import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // nginx transmet déjà X-Forwarded-For ; sans cette ligne le throttler compte
  // toute l'app comme un seul client (l'IP du proxy) et renvoie 429 dès le 2e
  // navigateur connecté.
  app.set('trust proxy', 1);
  // CSP off: Vite dev + Cloudinary assets would otherwise be blocked.
  app.use(helmet({ contentSecurityPolicy: false }));
  // Behind nginx the frontend and API share an origin, so CORS is a no-op there;
  // it lets the frontend reach the API directly (e.g. Vite dev on another port).
  // Bearer tokens, not cookies, carry the session.
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('Pinterest API')
    .setDescription('The Pinterest API description')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);


}
bootstrap();
