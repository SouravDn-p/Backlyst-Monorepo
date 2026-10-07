# Authentication Guide

## Overview

The system provides two guard types for controlling access:

* `UserGuard`
* `AdminGuard`

By default, **all routes are public** unless explicitly protected.

---

## Guards

### `@UserGuard`

Use this guard for routes that require authentication from any logged-in user.

* Accessible by **all authenticated users**
* Ignores user role
* Suitable for general protected endpoints

```ts
@UserGuard()
```

---

### `@AdminGuard`

Use this guard for admin-only routes.

* Accessible **only by users with ADMIN role**
* Restricts all non-admin users

```ts
@AdminGuard()
```

---

## Current User Access

Use the `@CurrentUser()` decorator to access authenticated user information from the JWT token.

### JWT Payload Structure

```ts
export type JwtPayload = {
  id: string;
  email: string;
  role: string;
};
```

---

## Extracting User Data

You can retrieve the full user object:

```ts
@CurrentUser()
```

Or extract a specific property directly:

```ts
@CurrentUser("id")
@CurrentUser("email")
@CurrentUser("role")
```

---

## Summary

| Feature      | Usage            | Access Level        |
| ------------ | ---------------- | ------------------- |
| Public Route | default          | Anyone              |
| UserGuard    | `@UserGuard()`   | Authenticated users |
| AdminGuard   | `@AdminGuard()`  | Admin only          |
| Current User | `@CurrentUser()` | JWT payload access  |
