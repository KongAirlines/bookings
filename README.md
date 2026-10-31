## Customer Bookings API

Provides the KongAir customer bookings service.

The API specification can be found in the [openapi.yaml](openapi.yaml) file.

Gateway clients supply a Dev Portal application API key in `X-API-Key`.
ACE authorizes the application registration. A service-scoped post-function
then overwrites `X-KongAir-Account-ID` with the authenticated application's
principal ID and strips the API key before proxying. This stable account ID
survives API-key rotation.

Each application receives its own fictional customer and bookings sandbox.
The application identity does not represent a logged-in passenger. Services
must be reachable only through the trusted Gateway boundary; the internal
account header is not a credential for directly exposed services.

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

Direct local requests bypass Kong Gateway, so supply a test identity header:
```
curl -s -H "X-KongAir-Account-ID: 11111111-1111-4111-8111-111111111111" localhost:3000/bookings
```

Create a new booking for the same local test identity:
```
curl -X POST -H "X-KongAir-Account-ID: 11111111-1111-4111-8111-111111111111" 'http://localhost:3000/bookings' \
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
  API and synchronizes this service's Gateway state to `customer-data-dev`.
- [`konnect/prod.yaml`](konnect/prod.yaml) owns the public production Catalog
  API. Production Gateway state is promoted to the
  [platform repository](https://github.com/KongAirlines/platform) for review.
- The Platform repository owns the Key Auth application strategies, global ACE,
  and its anonymous Consumer. This repository selects the stage's strategy and
  rejects anonymous requests at the protected Gateway Service.
- Register a Portal application, request API access, obtain approval, and
  generate an API key. The Gateway account ID is the application's principal
  ID; no manually maintained application-to-passenger mapping is needed.
- The root [`openapi.yaml`](openapi.yaml) is the next beta contract, while
  [`openapi/versions/`](openapi/versions/) retains immutable stable releases.

Advance the root `info.version` for every contract change. This creates a new
Catalog API version instead of modifying an existing version. The additive
`konnect/dev-versions.yaml` manifest is applied before development state is
synchronized; the sync manifest intentionally omits `versions` so older
development versions are retained.

The managed development and production APIs declare `force_delete: true`,
using kongctl 1.21 or newer to authorize updates that remove ACE-mapped
operations. This does not request API deletion or disable application access
control. The authorization remains enabled while the field is present.
kongctl now selects the current version declaratively; no imperative
transition script is needed. This also applies to public APIs linked to an
ACE-enabled control plane, regardless of application-auth strategy selection.

Service developers work API-first by changing the root `openapi.yaml` or an
explicit Gateway transformation input. Credential-free CI converts those
inputs into decK state, validates it, and a separate trusted workflow commits
the materialized development and production files back to the same-repository
PR. Reviewers therefore see the exact Gateway state alongside the contract
change. The trusted workflow also maintains a PR comment summarizing changed
inputs and the generated development and production Gateway diffs. Generated
files are automation-owned and must not be edited directly.

After merge, CI proves the committed files still match deterministic
generation before synchronizing development. Production automation copies the
exact committed stable candidate to the platform repository for governed
review; it does not regenerate the candidate after review.

The deployment workflows intentionally install the latest stable kongctl
release so this example continuously exercises current declarative behavior.

### Production backend connectivity

[`gateway/prod/upstream.yaml`](gateway/prod/upstream.yaml) is a standard decK
patch applied during production Gateway generation. It supplies the private
backend hostname, protocol, and port without changing the client-facing OpenAPI
server URL. Adapt these values to your deployment; every production data plane
must be able to resolve and reach that backend. Changing this patch follows the
same generated-state PR review and Platform promotion as other Gateway inputs.
The development upstream is unchanged during this production migration.

### Development and releases

Normal service PRs edit only the beta version in the root `openapi.yaml`. The API's
top-level `version` in `konnect/prod.yaml` selects the stable specification
used for production Catalog and Gateway state; generation scripts read that
selector, so they never need a release-specific edit.

To release the current beta, run the **Prepare API release** workflow with the
stable release version and the next development version. For example, releasing
`0.2.0-beta.N` with inputs `0.2.0` and `0.3.0` opens a service PR that:

1. Retains `openapi/versions/0.2.0.yaml` as an immutable stable contract.
2. Sets `konnect/prod.yaml` current version to `0.2.0` while retaining older
   versions.
3. Advances the root contract to `0.3.0-beta.1`.
4. Materializes and validates the development and production Gateway state in
   the release PR.

Merging that service PR synchronizes the next beta to development and starts the
existing governed production promotion. The workflows use short-lived tokens
from the organization-owned GitHub App configured by
`REFERENCE_PLATFORM_APP_CLIENT_ID` and `REFERENCE_PLATFORM_APP_PRIVATE_KEY`.

### Configuration linting

See [native lint policies](lint/README.md) for the credential-free kongctl and
decK checks, regression cases, and the release checks that compare files and Git
history. PR validation runs these checks before uploading generated state.
