import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';



async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  let test = {name: 'test'};
let test2 = {name: 'test2'};
test = {...test, ...test2};
console.log(test);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
