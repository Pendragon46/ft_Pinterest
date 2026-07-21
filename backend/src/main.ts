import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';



async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  //to authorize connection from another origin, you can use the following code to allow CORS from any origin
  app.enableCors({
	origin: '*',
  });
  //change to app.enableCors({
  //origin: 'http://localhost:5173',
  //credentials: true, // for cookies, session
  //});
}
bootstrap();
