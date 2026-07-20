// test/health.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should be accessible without auth token', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200);
  });

  it('GET /some-protected-route should reject without auth token', () => {
    return request(app.getHttpServer())
      .get('/some-protected-route')
      .expect(401);
  });
});
