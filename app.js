module.exports = function (bookingsStore) {
  const express = require('express');
  const YAML = require('yamljs');
  const path = require('path');
  const openapiValidator = require('express-openapi-validator');
  const axios = require('axios'); // HTTP client

  require('dotenv').config()

  const demoAccount = require('./demoAccount');
  const app = express();
  app.use(express.json());

  // Operational health is intentionally available to the runtime platform,
  // but it is not part of the client-facing OpenAPI contract or Gateway routes.
  app.get('/health', (_, res) => {
    res.status(200).json({ status: 'OK' });
  });

  // Load the OpenAPI spec file
  const openApiSpecPath = path.join(__dirname, 'openapi.yaml');
  const openApiDocument = YAML.load(openApiSpecPath);

  // Middleware to validate Requests and Responses per the OAS
  app.use(
    openapiValidator.middleware({
      apiSpec: openApiDocument,
      validateRequests: true,
      validateResponses: true,
      // ACE authorizes the Portal application; Gateway overwrites the account header.
      validateSecurity: false,
    }),
  );

  app.use((req, res, next) => {

    if (req.path === '/health') {
      return next();
    }

    const account = demoAccount(req.headers['x-kongair-account-id']);
    if (!account) return res.status(401).end();
    req.account = account;
    next();
  });

  // Routes
  // ********* GET /bookings *********
  app.get('/bookings', (req, res) => {
    const userBookings = bookingsStore.getAccountBookings(req.account.id);
    if (!userBookings)
      return res.json([]); // Return empty array if no bookings for this user
    res.json(userBookings);
  });

  // ********* GET /bookings/:ticketNumber *********
  app.get('/bookings/:ticketNumber', (req, res) => {
    const booking = bookingsStore.getAccountBooking(
      req.account.id,
      req.params.ticketNumber,
    );

    if (!booking) {
      return res.status(404).end();
    }

    res.json(booking);
  });

  // ********* POST /bookings *********
  app.post('/bookings', async (req, res, next) => {
    try {
      const flightResponse = await axios.get(
        `${process.env.FLIGHT_SVC_ENDPOINT}${req.body.flight_number}`);

      const newBooking = {
        ticket_number:
          Math.random()
            .toString(36)
            .substring(2, 12)
            .toUpperCase(),
        seat: req.body.seat,
        flight: flightResponse.data,
      };

      bookingsStore.addBooking(req.account.id, newBooking);

      res.status(201).json({ ticket_number: newBooking.ticket_number });

    } catch (error) {
      if (error.response && error.response.status === 404) {
        res.sendStatus(404);
      } else {
        next(error);
      }
    }
  });

  // Error handler
  app.use((err, req, res, _) => {
    // If it's the health check path, provide a clear response
    if (req.path === '/health') {
      return res.status(503).json({ status: 'unhealthy' });
    }

    // format error for other paths
    res.status(err.status || 500).json({
      message: err.message,
      errors: err.errors,
    });
  });

  return app;
};
