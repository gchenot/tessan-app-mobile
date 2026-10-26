import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Waiting room API', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates, reads and cancels a ticket', async () => {
    const reasons = await request(app.getHttpServer()).get('/reasons');
    expect(reasons.status).toBe(200);
    expect(reasons.body).toContainEqual({ id: 'fievre', label: 'Fièvre' });

    const created = await request(app.getHttpServer())
      .post('/tickets')
      .send({ reason: 'fievre' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      reason: 'fievre',
      status: 'waiting',
      position: 4,
      estimatedWaitMinutes: 20,
    });

    const id: string = created.body.id;
    const found = await request(app.getHttpServer()).get(`/tickets/${id}`);
    expect(found.status).toBe(200);
    expect(found.body.id).toBe(id);

    const cancelled = await request(app.getHttpServer()).delete(
      `/tickets/${id}`,
    );
    expect(cancelled.status).toBe(204);
    const closed = await request(app.getHttpServer()).get(`/tickets/${id}`);
    expect(closed.body.status).toBe('cancelled');
  });

  it('returns 400, 404 and 409 for invalid requests', async () => {
    expect(
      (await request(app.getHttpServer()).post('/tickets').send({})).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post('/tickets')
          .send({ reason: 'inconnu' })
      ).status,
    ).toBe(400);
    expect(
      (await request(app.getHttpServer()).get('/tickets/missing')).status,
    ).toBe(404);

    const created = await request(app.getHttpServer())
      .post('/tickets')
      .send({ reason: 'autre' });
    const id: string = created.body.id;
    await request(app.getHttpServer()).delete(`/tickets/${id}`);
    expect(
      (await request(app.getHttpServer()).delete(`/tickets/${id}`)).status,
    ).toBe(409);
  });
});
