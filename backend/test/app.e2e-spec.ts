import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.TELEGRAM_BOT_TOKEN =
      process.env.TELEGRAM_BOT_TOKEN || '0000000000:TEST_TOKEN_FOR_E2E';
    process.env.WEBAPP_URL = process.env.WEBAPP_URL || 'https://example.com';
    process.env.ALLOW_DEV_AUTH = 'true';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./prisma/test.db';
    process.env.ADMIN_IDS = '1';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  it('/api/auth/telegram (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/auth/telegram')
      .send({ initData: '' })
      .expect(201)
      .expect((res) => {
        if (!res.body.user?.id) {
          throw new Error('нет user');
        }
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
