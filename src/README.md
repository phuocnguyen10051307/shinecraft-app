# Source structure

This project uses Expo Router, so files inside `app` define application routes.
Shared layouts that are not routes belong in `layouts`.

```text
src/
|-- app/                 # Expo Router routes and route layouts
|-- components/          # Shared UI components
|-- features/            # Feature-specific code
|   |-- auth/
|   |-- admin/
|   |-- customers/
|   |-- home/
|   `-- staff/
|-- hooks/               # Shared hooks
|-- layouts/             # Shared layout components that are not routes
|-- lib/                 # Third-party service configuration
|-- store/               # Global state
|-- types/               # Shared TypeScript types
`-- theme/               # Colors, spacing, typography, and theme setup
```

Each feature can contain:

```text
feature/
|-- components/          # Feature-only components
|-- screens/             # Screen implementations
`-- hooks/               # Feature-only hooks
```

The application entry point remains `expo-router/entry` from `package.json`;
an `App.tsx` file is not required.
