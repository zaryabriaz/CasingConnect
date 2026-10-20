import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CasingConnect foundation API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function tokenOf(response: request.Response) {
    return response.body.data.accessToken as string;
  }

  /** Captcha verify is skipped in NODE_ENV=test; validation still needs fields. */
  const captchaFields = {
    captchaToken: 'e2e-captcha-token-ok',
    captchaAnswer: '0',
  };

  it('registers a business, keeps the token scoped, and blocks staff from changes', async () => {
    const stamp = Date.now();
    const ownerEmail = `owner-${stamp}@casingconnect.test`;
    const staffEmail = `staff-${stamp}@casingconnect.test`;

    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Owner',
        email: ownerEmail,
        password: 'demo1234',
        businessName: `Yard ${stamp}`,
        activities: ['PROCESSOR', 'EXPORTER'],
        city: 'Sialkot',
        ...captchaFields,
      })
      .expect(201);

    expect(registered.body.data.accessToken).toEqual(expect.any(String));
    expect(registered.body.data.role).toBe('OWNER');
    expect(registered.body.data.business.activities).toEqual(['PROCESSOR', 'EXPORTER']);
    expect(JSON.stringify(registered.body)).not.toContain('passwordHash');
    const ownerToken = tokenOf(registered);

    const types = await request(app.getHttpServer())
      .get('/api/v1/casing-types')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const sheep = types.body.data.find((item: { code: string }) => item.code === 'SHEEP');
    const beef = types.body.data.find((item: { code: string }) => item.code === 'BEEF');
    expect(sheep.qualities.map((item: { name: string }) => item.name)).toContain('18/20 A');
    expect(beef.active).toBe(false);

    const partner = await request(app.getHttpServer())
      .post('/api/v1/partners')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Nordic Foods', roles: ['CUSTOMER', 'BUYER'], country: 'Germany' })
      .expect(201);
    const listed = await request(app.getHttpServer())
      .get('/api/v1/partners?role=CUSTOMER')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(listed.body.data.items.some((item: { id: string }) => item.id === partner.body.data.id)).toBe(true);

    await request(app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Yard Staff', email: staffEmail, password: 'demo1234', role: 'STAFF' })
      .expect(201);

    const staffLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: staffEmail, password: 'demo1234' })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/v1/business')
      .set('Authorization', `Bearer ${tokenOf(staffLogin)}`)
      .send({ city: 'Lahore' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Owner',
        email: ownerEmail,
        password: 'demo1234',
        businessName: 'Second try',
        activities: ['TRADER'],
        ...captchaFields,
      })
      .expect(409);
  });

  it('moves an existing person onto another business with a new token', async () => {
    const stamp = Date.now();
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'First Owner',
        email: `first-${stamp}@casingconnect.test`,
        password: 'demo1234',
        businessName: `First ${stamp}`,
        activities: ['COLLECTOR'],
        ...captchaFields,
      })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Second Owner',
        email: `second-${stamp}@casingconnect.test`,
        password: 'demo1234',
        businessName: `Second ${stamp}`,
        activities: ['TRADER'],
        ...captchaFields,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${tokenOf(second)}`)
      .send({ name: 'First Owner', email: `first-${stamp}@casingconnect.test`, role: 'MANAGER' })
      .expect(201);

    const switched = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-business')
      .set('Authorization', `Bearer ${tokenOf(first)}`)
      .send({ businessId: second.body.data.business.id })
      .expect(200);

    expect(switched.body.data.role).toBe('MANAGER');
    expect(switched.body.data.business.id).toBe(second.body.data.business.id);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenOf(switched)}`)
      .expect(200);
    expect(me.body.data.memberships).toHaveLength(2);
    expect(me.body.data.accessToken).toBeUndefined();
  });
});
