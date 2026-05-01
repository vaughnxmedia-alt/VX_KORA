# KORA SDK

Standalone TypeScript contracts and utilities for the KORA intelligence system.

This package is intentionally infrastructure-light. It contains portable types, event contracts, Learning Log System helpers, auth helpers, and a small typed HTTP client that can be used by web apps, workers, and backend services without coupling them to the JahKnowsPR frontend.

## Install

```sh
npm install @kora/sdk
```

For private GitHub usage before package registry publishing:

```sh
npm install git+https://github.com/vaughnxmedia-alt/kora-sdk.git
```

## Usage

```ts
import { createKoraClient, createKoraAuthHeaders, type KoraEvent } from "@kora/sdk";

const client = createKoraClient({
  baseUrl: "https://api.kora.example",
  headers: createKoraAuthHeaders({ bearerToken: process.env.KORA_API_TOKEN }),
});

const event = await client.request<KoraEvent>("/events/latest");
```

## Local Development

```sh
npm install
npm run typecheck
npm run build
```

## Public Split Notes

KORA backend implementation systems can continue running inside the existing operational infrastructure while this SDK becomes the shared interface between apps, workers, agents, and future KORA-owned services.
