## Customer Bookings API

Provides the KongAir customer bookings service.

The API specification can be found in the [openapi.yaml](openapi.yaml) file.

Customers are identified by the `x-consumer-username` header. This username is how the service segments customer information.

**This is an example service only. Proper security measures should be followed in production use cases.**

The server mimics a database by storing customer bookings
into a simple file ([bookings.json](bookings.json)) stored in
the servers runtime folder.

### Security

See [Security](SECURITY.md) for information on how to report security vulnerabilities.


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

## Konnect Reference Platform

This repository owns the Bookings API contract and its federated Konnect
desired state. It is the protected-API example for the
[Konnect Reference Platform](https://developer.konghq.com/konnect-reference-platform/).

- [`konnect/dev.yaml`](konnect/dev.yaml) owns the private development Catalog
  API and applies this service's Gateway state to `customer-data-dev`.
- [`konnect/prod.yaml`](konnect/prod.yaml) owns the public production Catalog
  API. Production Gateway state is promoted to the
  [platform repository](https://github.com/KongAirlines/platform) for review.
- [`gateway/plugins/ace.yaml`](gateway/plugins/ace.yaml) installs service-scoped
  Access Control Enforcement with `match_policy: required`.
- [`openapi/versions/`](openapi/versions/) retains production release
  specifications while the root `openapi.yaml` remains mutable for development.

Install decK 1.65.2 and run `./scripts/generate-gateway.sh` after changing an
OpenAPI document or Gateway plugin input. Commit the generated development and
production files. CI regenerates them and rejects drift.

The kongctl manifests use control-plane API implementations and external
auth-strategy lookup. Use kongctl 1.14.0 or later when applying them.
