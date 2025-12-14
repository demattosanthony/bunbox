# Bunbox Middleware Authentication Example

This example demonstrates how to use **route-level middleware** in Bunbox for authentication and authorization.

## Features Demonstrated

- ✅ **Route Protection** - Protect entire app with root middleware
- ✅ **Public Routes** - Override protection for auth routes
- ✅ **Role-Based Access** - Restrict routes by user role
- ✅ **Cascading Middleware** - Child middleware overrides parent
- ✅ **Context Passing** - User data flows to loaders and pages

## Project Structure

```
app/
├── middleware.ts              # Root middleware (protects all routes)
├── page.tsx                   # Home page (protected)
├── layout.tsx                 # Root layout
├── auth/
│   ├── middleware.ts          # Allows public access to /auth/*
│   └── login/
│       └── page.tsx           # Login page (public)
├── dashboard/
│   └── page.tsx               # Dashboard (requires auth)
└── admin/
    ├── middleware.ts          # Requires admin role
    └── page.tsx               # Admin panel (requires admin role)
```

## How It Works

### 1. Root Middleware (`app/middleware.ts`)

Protects **all routes** by default:

```typescript
export async function middleware({ request }: MiddlewareContext) {
  const authToken = getCookie(request, "auth_token");

  if (!authToken) {
    return redirect("/auth/login"); // Not authenticated
  }

  return { user: parseToken(authToken) }; // Pass user to pages
}
```

### 2. Auth Middleware (`app/auth/middleware.ts`)

**Overrides** root middleware to allow public access:

```typescript
export async function middleware() {
  return {}; // Allow public access
}
```

### 3. Admin Middleware (`app/admin/middleware.ts`)

Adds **role-based** access control:

```typescript
export async function middleware({ context }: MiddlewareContext) {
  const user = context.user; // From parent middleware

  if (user.role !== "admin") {
    return redirect("/dashboard"); // Not authorized
  }

  return { user }; // Admin access granted
}
```

## Running the Example

```bash
# Install dependencies
bun install

# Start dev server
bun dev
```

Then visit:
- `http://localhost:3000/` - Redirects to login (protected)
- `http://localhost:3000/auth/login` - Login page (public)
- `http://localhost:3000/dashboard` - Dashboard (requires auth)
- `http://localhost:3000/admin` - Admin panel (requires admin role)

## Try This

1. **Login as User** - Can access home and dashboard, but not admin
2. **Login as Admin** - Can access all pages
3. **Logout** - All protected routes redirect to login

## Key Concepts

### Middleware Execution Order

Middleware runs **child → parent** (reverse order):

```
/admin/page.tsx request
  ↓
1. app/admin/middleware.ts   (runs first - checks role)
  ↓
2. app/middleware.ts         (runs only if child returns undefined)
  ↓
3. Page loader & component   (receives combined context)
```

### Return Values

- `Response` - Short-circuit (redirect, 401, etc)
- `object` - Merge into context + stop parent execution
- `undefined` - Continue to parent middleware

### Context Flow

```
middleware → loader → page component
```

User data from middleware is available everywhere:

```typescript
// In loader
export async function loader({ context }: LoaderContext) {
  const user = context.user; // From middleware!
  return { user };
}

// In page
export default function Page({ data }: PageProps) {
  const user = data.user; // From loader!
}
```

## Learn More

- [Bunbox Documentation](https://github.com/demattosanthony/bunbox)
- [Middleware Utilities](../../packages/bunbox/src/core/middleware.ts)

