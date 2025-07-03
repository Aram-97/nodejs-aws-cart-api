import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverless from 'serverless-http';
import express from 'express';
import helmet from 'helmet';
import 'reflect-metadata';

import { fetchAndInjectSecrets } from './shared/aws/fetch-and-inject-secrets';
import { AppModule } from './app.module';

export async function bootstrap() {
  await fetchAndInjectSecrets(process.env.AWS_SECRETS_MANAGER_NAME);

  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.enableCors({
    origin: (req, callback) => callback(null, true),
  });
  app.use(helmet());

  await app.init();
  return serverless(expressApp, { provider: 'aws' });
}
