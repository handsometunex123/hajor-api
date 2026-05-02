import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generate() {
  console.log('generate-openapi: creating Nest app for docs');

  const app = await NestFactory.create(AppModule, { logger: false });
  console.log('generate-openapi: app created');

  const config = new DocumentBuilder()
    .setTitle('Hajor API')
    .setDescription('API documentation for Hajor fintech system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outDir = path.resolve(process.cwd(), 'docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'openapi.json'), JSON.stringify(document, null, 2));
  console.log('Wrote docs/openapi.json');

  await app.close();
}

generate().catch((err) => {
  console.error('Failed to generate OpenAPI document', err);
  process.exit(1);
});
