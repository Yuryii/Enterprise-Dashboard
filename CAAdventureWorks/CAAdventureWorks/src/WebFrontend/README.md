# CAAdventureWorks

A modern full-stack enterprise application built with .NET Aspire, ASP.NET Core, Entity Framework Core, and Angular 21.

## Architecture Overview

The solution follows a clean, layered architecture orchestrated by [Microsoft .NET Aspire](https://learn.microsoft.com/en-us/dotnet/aspire/):

```
CAAdventureWorks/
├── src/
│   ├── AppHost/              # .NET Aspire orchestration host
│   ├── Application/          # Application layer (MediatR, AutoMapper, FluentValidation)
│   ├── Domain/               # Domain entities and interfaces
│   ├── Infrastructure/       # EF Core, Identity, JWT auth, interceptors
│   ├── ServiceDefaults/      # .NET Aspire service defaults (OpenTelemetry, resilience)
│   ├── Shared/               # Shared DTOs and constants
│   ├── Web/                  # ASP.NET Core Web API with Minimal API endpoints
│   └── WebFrontend/          # Angular 21 admin dashboard (SmartDash)
```

### Backend — .NET Stack

| Project | Role |
|---|---|
| `AppHost` | Aspire orchestrator — wires up all services, Keycloak, and the Angular frontend in a single local run |
| `Web` | ASP.NET Core 10 Web API exposing Minimal API endpoints; hosts Scalar API reference |
| `Application` | Business logic layer using **MediatR** (CQRS pattern), **AutoMapper**, and **FluentValidation** |
| `Domain` | Domain entities and interfaces; references `MediatR.Contracts` and `Microsoft.EntityFrameworkCore` |
| `Infrastructure` | EF Core `SqlServer` data access, JWT Bearer authentication via **Keycloak**, auditable entity interceptors, domain event dispatching |
| `ServiceDefaults` | Standard Aspire configuration: OpenTelemetry (OTLP), HTTP resilience, service discovery |
| `Shared` | Shared types and constants (targets `net10.0`) |

### Frontend — Angular Stack

| Package | Version | Purpose |
|---|---|---|
| Angular | 21 | Core framework |
| CoreUI Angular | ~5.6 | Responsive UI component library |
| PrimeNG | ^21.1 | Advanced UI components |
| angular-auth-oidc-client | ^21 | OIDC/OAuth2 authentication |
| angular-gridster2 | ^21 | Drag-and-drop dashboard grid |
| Chart.js / @coreui/angular-chartjs | — | Data visualization |
| Vitest + Playwright | 4.x | Unit and component testing |

The frontend communicates with the Web API over HTTPS and authenticates via the **Keycloak** realm `CAAdventureWorks`.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Solution Structure](#solution-structure)
- [Backend — Web API](#backend--web-api)
  - [Running the API](#running-the-api)
  - [API Documentation](#api-documentation)
  - [Authentication](#authentication)
  - [Authorization Policies](#authorization-policies)
  - [Database](#database)
- [Frontend — SmartDash](#frontend--smartdash)
  - [Prerequisites](#prerequisites-1)
  - [Installation](#installation)
  - [Development Server](#development-server)
  - [Building](#building)
  - [Testing](#testing)
- [Orchestration with .NET Aspire](#orchestration-with-net-aspire)
- [Keycloak](#keycloak)

---

## Prerequisites

### Required

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) or later
- [.NET Aspire Workload](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/setup-tooling) — install via `dotnet workload install aspire`
- [Node.js](https://nodejs.org/) LTS — Angular 21 requires `^20.19.0 || ^22.12.0 || ^24.0.0`
- [npm](https://www.npmjs.com/) `>= 10`

### Recommended

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — required for Aspire's local container orchestration (Keycloak, SQL Server)
- [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (or use the container managed by Aspire)

---

## Quick Start

### 1. Clone and build

```bash
git clone <repository-url>
cd CAAdventureWorks
dotnet restore
dotnet build
```

### 2. Start with .NET Aspire (recommended)

This starts the full stack — Keycloak, SQL Server (via Aspire), the Web API, and the Angular frontend — with a single command:

```bash
cd src/AppHost
dotnet run
```

Aspire will open its dashboard showing all running services and their endpoints. By default:
- **Web API** — `https://localhost:<port>/scalar` (Scalar API reference)
- **Angular Frontend** — `https://localhost:<port>/webfrontend`
- **Keycloak Admin Console** — `https://localhost:8080` (admin / admin)

### 3. Alternative — Run pieces independently

```bash
# Backend API only
cd src/Web
dotnet run

# Frontend only (from WebFrontend directory)
cd src/WebFrontend
npm install
npm start
```

---

## Solution Structure

```
src/
├── AppHost/
│   ├── Program.cs            # Aspire resource composition
│   ├── Extensions.cs         # Aspire extension methods
│   ├── AppHost.csproj
│   └── appsettings.json
├── Application/
│   ├── Application.csproj    # MediatR, AutoMapper, FluentValidation
│   └── (CQRS handlers, validators, DTOs)
├── Domain/
│   ├── Domain.csproj         # Domain entities, interfaces
│   └── (Entities, events)
├── Infrastructure/
│   ├── DependencyInjection.cs # Service registration, auth policies
│   ├── Data/                  # EF Core DbContext, initialiser, interceptors
│   └── Identity/              # IdentityService
├── ServiceDefaults/
│   └── ServiceDefaults.csproj # OpenTelemetry, resilience, service discovery
├── Shared/
│   └── Shared.csproj          # net10.0 shared types
├── Web/
│   ├── Program.cs             # Web API pipeline, endpoint mapping
│   ├── Web.csproj
│   └── Infrastructure/        # Minimal API helpers, exception handlers
└── WebFrontend/               # Angular 21 application
    ├── angular.json
    ├── package.json
    └── src/
        ├── app/
        │   ├── icons/         # Custom branding icons
        │   └── layout/        # Default layout components
        └── assets/            # Brand images, static files
```

---

## Backend — Web API

### Running the API

```bash
cd src/Web
dotnet run
```

The API listens on `https://localhost:<port>` (configured by Aspire or `appsettings.json`).

### API Documentation

API reference is served via **Scalar** at `/scalar`. When running under Aspire, navigate to the **Scalar API Reference** link shown in the Aspire dashboard.

### Authentication

The Web API uses **JWT Bearer authentication** backed by **Keycloak**:

- Authority and audience are read from `Keycloak:Authority` and `Keycloak:Audience` configuration.
- In production, HTTPS metadata is required (`RequireHttpsMetadata = true`).
- Role claims are mapped from `ClaimTypes.Role`; name claims from `ClaimTypes.Name`.

### Authorization Policies

The following role-based authorization policies are registered:

| Policy | Required Roles |
|---|---|
| `Executive-General-And-Administration-Manager` | Executive, Information-Services, Finance, HumanResources, Facilities-And-Maintenance |
| `Executive` | Executive |
| `Information-Services` | Information-Services |
| `Finance` | Finance |
| `Human-Resources` | HumanResources |
| `Facilities-And-Maintenance` | Facilities-And-Maintenance |
| `Quality-Assurance-Manager` | Document-Control, Quality-Assurance |
| `Document-Control` | Document-Control |
| `Quality-Assurance` | Quality-Assurance |
| `Research-and-Development` | Engineering, Tool-Design |
| `Engineering` | Engineering |
| `Tool-Design` | Tool-Design |
| `Manufacturing` | Production, Production-Control |
| `Production` | Production |
| `Sales-and-Marketing` | Sales, Marketing |
| `Sales` | Sales |
| `Marketing` | Marketing |
| `Inventory-Management` | Purchasing |
| `Shipping-and-Receiving` | Shipping-and-Receiving |

### Database

- **Provider**: SQL Server via `Microsoft.EntityFrameworkCore.SqlServer`
- **Connection**: Configured as `AdventureWorks` in `appsettings.json`; managed by Aspire when running locally
- **Initialisation**: `ApplicationDbContextInitialiser` runs on first start in Development mode (creates schema if needed)
- **Interceptors**:
  - `AuditableEntityInterceptor` — auto-populates audit fields (CreatedAt, CreatedBy, ModifiedAt, ModifiedBy)
  - `DispatchDomainEventsInterceptor` — dispatches domain events after `SaveChanges`

---

## Frontend — SmartDash

The Angular frontend lives in `src/WebFrontend` and provides a responsive admin dashboard.

### Prerequisites

Verify your environment:

```bash
node -v   # ^20.19.0 || ^22.12.0 || ^24.0.0
npm -v    # >= 10
```

### Installation

```bash
cd src/WebFrontend
npm install
```

### Development Server

```bash
npm start          # or: ng serve
```

The app will be available at `http://localhost:4200`. It automatically reloads when source files change.

### Building

```bash
npm run build          # Production build (output: dist/smartdash/)
npm run build:dev      # Development build
npm run watch          # Watch mode for iterative development
```

Production builds replace `src/environments/environment.ts` with `environment.production.ts` and enable output hashing.

### Testing

Unit tests run via Vitest:

```bash
npm test              # Run tests once
npm test -- --watch  # Watch mode
```

---

## Orchestration with .NET Aspire

The `AppHost` project wires everything together:

1. **Keycloak** — imported from `keycloak/realm-export.json` with admin credentials (admin/admin) and a persistent data volume
2. **Web API** — references Keycloak for auth; waits for Keycloak before starting; exposes Scalar at `/scalar`
3. **WebFrontend** — Angular dev server started via Aspire's JavaScript hosting; receives `apiBaseUrl`, `keycloakUrl`, and `NG_CLI_ANALYTICS=false` as environment variables

Run the full stack:

```bash
cd src/AppHost
dotnet run
```

---

## Keycloak

Keycloak is managed by .NET Aspire and runs at port `8080`. The realm `CAAdventureWorks` is imported on first start.

- **Admin Console**: `http://localhost:8080` — sign in with `admin` / `admin`
- **Realm URL for Angular**: `http://localhost:8080/realms/CAAdventureWorks`

The Angular frontend uses `angular-auth-oidc-client` to handle the OIDC flow against this realm.

---

## License

Code in this repository is released under the MIT license.
