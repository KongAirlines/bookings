## Customer Bookings API

Provides the KongAir customer bookings service.

The API specification can be found in the [openapi.yaml](openapi.yaml) file.

Customers are identified by the `x-consumer-username` header. This username is how the service segments customer information.

**This is an example service only. Proper security measures should be followed in production use cases.**

The server mimics a database by storing customer bookings
into a simple file ([bookings.json](bookings.json)) stored in
the servers runtime folder.

### Prerequisites

* `node` : tested with `v17.9.1`
* `npm`  : tested with `8.11.0`

### Server usage

To install dependencies:
```
npm install
```

The repository provides a `Makefile` with common usage.

#### To run unit tests

```
make test
```

#### To run the server on the default port

```
make run
```

#### To run a development server

A development server will detect and autoloads code changes.

```
npm run dev
```

#### Example client requests

Read all customer bookings for the user `dfreese`:
```
curl -s -H "x-consumer-username: dfreese" localhost:3000/bookings
```

Create a new booking for the user `dfreese`:
```
curl -X POST -H "x-consumer-username: dfreese" 'http://localhost:3000/bookings' \
-H 'Content-Type: application/json' \
-d '{
    "flight_number": "KA0277",
    "seat": "19B"
}'
```

Note that the `flight_number` field must be a valid flight number
served from the flights service

See the code for the dependent flight service (`FLIGHT_SVC_ENDPOINT`).
