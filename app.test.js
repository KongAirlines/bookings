const request = require('supertest');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const axios = require('axios');
const BookingsStore = require('./bookingsStore');
jest.mock('axios');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
let app, directory, store;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kongair-bookings-'));
  store = new BookingsStore(path.join(directory, 'bookings.json'));
  app = require('./app')(store);
});
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));
test('health is available without an application identity', async () => {
  expect((await request(app).get('/health')).status).toBe(200);
});
test('rejects missing, malformed, and legacy passenger identities', async () => {
  expect((await request(app).get('/bookings')).status).toBe(401);
  expect((await request(app).get('/bookings').set('X-KongAir-Account-ID', 'jdoe')).status).toBe(401);
  expect((await request(app).get('/bookings').set('X-Consumer-Username', 'jdoe')).status).toBe(401);
});
test('isolates seeded bookings and ticket lookups between applications', async () => {
  const a = await request(app).get('/bookings').set('X-KongAir-Account-ID', A);
  const b = await request(app).get('/bookings').set('X-KongAir-Account-ID', B);
  expect(a.status).toBe(200);
  expect(b.status).toBe(200);
  expect(a.body[0].ticket_number).not.toBe(b.body[0].ticket_number);
  expect((await request(app).get('/bookings/' + a.body[0].ticket_number).set('X-KongAir-Account-ID', A)).status).toBe(200);
  expect((await request(app).get('/bookings/' + a.body[0].ticket_number).set('X-KongAir-Account-ID', B)).status).toBe(404);
});
test('booking creation and persistence remain isolated by application', async () => {
  const flight = store.getAccountBookings(A)[0].flight;
  axios.get.mockResolvedValue({ data: flight });
  const created = await request(app).post('/bookings').set('X-KongAir-Account-ID', A)
    .send({ flight_number: flight.number, seat: '20A' });
  expect(created.status).toBe(201);
  const restored = new BookingsStore(store.filePath);
  expect(restored.getAccountBooking(A, created.body.ticket_number)).toBeDefined();
  expect(restored.getAccountBooking(B, created.body.ticket_number)).toBeUndefined();
});
test('legacy usernames cannot override the trusted application account', async () => {
  const res = await request(app).get('/bookings').set('X-KongAir-Account-ID', A)
    .set('X-Consumer-Username', 'jdoe');
  expect(res.body).toEqual(store.getAccountBookings(A));
});


