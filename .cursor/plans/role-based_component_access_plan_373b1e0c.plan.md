---
name: Role-based component access plan
overview: Update Angular routes, navigation, and .NET backend to implement strict role-to-component mapping per the specified policies, where manager policies grant access to multiple components.
todos:
  - id: backend-policies
    content: Add missing multi-role policies to Infrastructure/DependencyInjection.cs
    status: completed
  - id: routes-update
    content: Update 5 route guards in routes.ts (production, quality-assurance, engineering, sales, marketing)
    status: completed
  - id: nav-update
    content: Update 5 nav item roles arrays in _nav.ts
    status: completed
isProject: false
---

## Plan: Role-Based Component Access per Authorization Policies

The goal is: each Keycloak role sees only its own component(s); manager policies (e.g., `Executive-General-And-Administration-Manager`) grant access to multiple components.

---

### Changes Overview

| File                                    | Change                                                           |
| --------------------------------------- | ---------------------------------------------------------------- |
| `Infrastructure/DependencyInjection.cs` | Add missing multi-role policies                                  |
| `keycloak/realm-export.json`            | Add missing Keycloak roles                                       |
| `routes.ts`                             | Update route guards to reflect exact policy-to-component mapping |
| `_nav.ts`                               | Update navigation `roles` arrays to match route guards           |

---

### 1. Backend: Add Missing Multi-Role Policies

In `Infrastructure/DependencyInjection.cs`, add these missing policies (the backend already has the single-role policies matching Keycloak role names):

```csharp
// Add after the existing policy definitions:
.AddPolicy("Manufacturing", policy =>
    policy.RequireRole("Production", "Production-Control"))
.AddPolicy("Executive-General-And-Administration-Manager", policy =>
    policy.RequireRole("Executive", "Information-Services", "Finance", "HumanResources", "Facilities-And-Maintenance"))
.AddPolicy("Quality-Assurance-Manager", policy =>
    policy.RequireRole("Document-Control", "Quality-Assurance"))
.AddPolicy("Research-and-Development", policy =>
    policy.RequireRole("Engineering", "Tool-Design"))
.AddPolicy("Sales-and-Marketing", policy =>
    policy.RequireRole("Sales", "Marketing"))
.AddPolicy("Inventory-Management", policy =>
    policy.RequireRole("Purchasing"));
```

Note: `Information-Services` and `Facilities-And-Maintenance` roles are already in Keycloak (verified). No new Keycloak roles needed.

---

### 2. Frontend: Update `routes.ts`

Update each route's `roleGuard` to match the exact role-to-component mapping:

#### No change needed (already correct):

| Route                  | `roleGuard`                                              |
| ---------------------- | -------------------------------------------------------- |
| `executive`            | `['Executive']`                                          |
| `human-resources`      | `['HumanResources', 'Executive']`                        |
| `finance`              | `['Finance', 'Executive']`                               |
| `information-services` | `['Information-Services', 'Executive']`                  |
| `facilities`           | `['Facilities-And-Maintenance', 'Executive']`            |
| `production-control`   | `['Production-Control', 'Executive']`                    |
| `purchasing`           | `['Purchasing', 'Executive']`                            |
| `document-control`     | `['Document-Control', 'Quality-Assurance', 'Executive']` |
| `tool-design`          | `['Tool-Design', 'Engineering', 'Executive']`            |
| `shipping-receiving`   | `['Shipping-and-Receiving', 'Executive']`                |

#### Need updates:

`**production**` — Change from `['Production', 'Production-Control', 'Executive']` to `['Production', 'Executive']` (Manufacturing policy = Production + Production-Control, so Production role sees Production component; Production-Control role already has its own route):

```typescript
{
  path: 'production',
  canActivate: [roleGuard(['Production', 'Executive'])],
  ...
}
```

`**quality-assurance**` — Change from `['Quality-Assurance', 'Document-Control', 'Executive']` to `['Quality-Assurance', 'Executive']` (Quality-Assurance-Manager = Document-Control + Quality-Assurance, so QA role sees QA component; Document-Control has its own route):

```typescript
{
  path: 'quality-assurance',
  canActivate: [roleGuard(['Quality-Assurance', 'Executive'])],
  ...
}
```

`**engineering**` — Change from `['Engineering', 'Tool-Design', 'Executive']` to `['Engineering', 'Executive']` (Research-and-Development = Engineering + Tool-Design, so Engineering role sees Engineering component; Tool-Design has its own route):

```typescript
{
  path: 'engineering',
  canActivate: [roleGuard(['Engineering', 'Executive'])],
  ...
}
```

`**sales**` — Change from `['Sales', 'Marketing', 'Executive']` to `['Sales', 'Executive']` (Sales-and-Marketing = Sales + Marketing, so Sales role sees Sales component; Marketing has its own route):

```typescript
{
  path: 'sales',
  canActivate: [roleGuard(['Sales', 'Executive'])],
  ...
}
```

`**marketing**` — Change from `['Marketing', 'Sales', 'Executive']` to `['Marketing', 'Executive']` (Sales-and-Marketing = Sales + Marketing, so Marketing role sees Marketing component; Sales has its own route):

```typescript
{
  path: 'marketing',
  canActivate: [roleGuard(['Marketing', 'Executive'])],
  ...
}
```

---

### 3. Frontend: Update `_nav.ts`

Update the navigation `roles` arrays to match the updated route guards (lines 440-529):

```typescript
// Production nav item — change roles from ['Production', 'Production-Control', 'Executive']
// to match route: ['Production', 'Executive']
{
  name: 'Production',
  url: '/roles/production',
  iconComponent: { name: 'cilFactory' },
  roles: ['Production', 'Executive']
} as NavRole,

// Quality Assurance nav item — change from ['Quality-Assurance', 'Document-Control', 'Executive']
// to match route: ['Quality-Assurance', 'Executive']
{
  name: 'Quality Assurance',
  url: '/roles/quality-assurance',
  iconComponent: { name: 'cil-check-circle' },
  roles: ['Quality-Assurance', 'Executive']
} as NavRole,

// Engineering nav item — change from ['Engineering', 'Tool-Design', 'Executive']
// to match route: ['Engineering', 'Executive']
{
  name: 'Engineering',
  url: '/roles/engineering',
  iconComponent: { name: 'cil-contact' },
  roles: ['Engineering', 'Executive']
} as NavRole,

// Sales nav item — change from ['Sales', 'Marketing', 'Executive']
// to match route: ['Sales', 'Executive']
{
  name: 'Sales',
  url: '/roles/sales',
  iconComponent: { name: 'cil-cart' },
  roles: ['Sales', 'Executive']
} as NavRole,

// Marketing nav item — change from ['Marketing', 'Sales', 'Executive']
// to match route: ['Marketing', 'Executive']
{
  name: 'Marketing',
  url: '/roles/marketing',
  iconComponent: { name: 'cil-bullhorn' },
  roles: ['Marketing', 'Executive']
} as NavRole,
```

All other nav items (Executive, HR, Finance, IS, Facilities, Production Control, Purchasing, Document Control, Tool Design, Shipping) already have correct `roles` arrays matching the route guards.

---

### Files to Modify

| File                                                    | Action                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/Infrastructure/DependencyInjection.cs`             | Add 6 missing multi-role policies                                                    |
| `src/WebFrontend/src/app/views/roles/routes.ts`         | Update 5 route guards (production, quality-assurance, engineering, sales, marketing) |
| `src/WebFrontend/src/app/layout/default-layout/_nav.ts` | Update 5 nav item `roles` arrays                                                     |
