# Conference Registration System - Client

Next.js 14 client application with real-time updates via Socket.IO.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS, shadcn/ui
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios with JWT interceptors
- **State Management**: React Context
- **TypeScript**: Full type safety
- **Deployment**: Railway

## Project Structure

```
conference_client/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/
│   │   │       ├── page.tsx
│   │   │       └── success/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Dashboard layout with nav
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── select-area/page.tsx
│   │   │   ├── signal-validator/page.tsx
│   │   │   ├── clusters/page.tsx
│   │   │   ├── opportunities/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── admin/page.tsx
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   └── auth-provider.tsx      # Auth context provider
│   ├── lib/
│   │   ├── api.ts                  # Axios instance
│   │   ├── socket.ts               # Socket.IO client
│   │   └── utils.ts                # Utility functions
│   ├── hooks/
│   │   └── useAreas.ts             # Areas CRUD with Socket.IO
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   └── middleware.ts               # Route protection
├── public/
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
├── railway.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Running server instance (conference_server)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd conference_client
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Development

Start the development server:
```bash
npm run dev
```

Application will start on `http://localhost:3000`

### Production Build

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Features

### Authentication
- User registration with profile creation
- JWT-based login with refresh tokens
- Automatic token refresh via Axios interceptors
- Protected routes with Next.js middleware
- Real-time Socket.IO connection on auth

### Real-time Updates
- WebSocket connection with JWT authentication
- Automatic sync of area changes across all clients
- Live updates without page refresh

### Pages

#### Public Routes
- **Landing Page** (`/`) - Marketing/info page
- **Login** (`/login`) - User authentication
- **Register** (`/register`) - New user registration
- **Registration Success** (`/register/success`) - Confirmation page

#### Protected Routes (Dashboard)
- **Select Area** (`/select-area`) - Manage areas of interest with real-time sync
- **Dashboard** (`/dashboard`) - Main dashboard
- **Signal Validator** (`/signal-validator`) - Placeholder for future feature
- **Clusters** (`/clusters`) - Placeholder for future feature
- **Opportunities** (`/opportunities`) - Placeholder for future feature
- **Settings** (`/settings`) - User settings
- **Admin** (`/admin`) - Admin-only dashboard with stats and profiles

### UI Components

Built with shadcn/ui:
- Button
- Card
- Input
- Label
- Select
- Custom layouts and navigation

## Deployment to Railway

### Prerequisites

1. Server instance deployed and running
2. Server URL available (e.g., `https://your-server.railway.app`)

### Setup Steps

1. **Create New Service** on Railway:
   - Click "New" → "GitHub Repo" → Select `conference_client`
   - Railway auto-detects Next.js from `package.json`

2. **Configure Environment Variables**:
   Go to service → "Variables" tab and add:
   ```
   NEXT_PUBLIC_API_URL=https://your-server.railway.app
   NEXT_PUBLIC_SOCKET_URL=https://your-server.railway.app
   ```

3. **Generate Public Domain**:
   - Go to "Settings" → "Networking"
   - Click "Generate Domain"
   - Copy the URL (e.g., `https://your-client.railway.app`)

4. **Update Server CORS**:
   Go to your server service and update:
   ```
   CORS_ORIGIN=https://your-client.railway.app
   ```

5. **Verify Deployment**:
   - Visit your client URL
   - Register a new account
   - Test real-time updates on select-area page

## Authentication Flow

1. **Registration**:
   - User fills registration form
   - POST to `/api/auth/register`
   - Redirect to success page
   - User navigates to login

2. **Login**:
   - User enters credentials
   - POST to `/api/auth/login`
   - Receives access + refresh tokens
   - Tokens stored in cookies
   - Socket.IO connects with token
   - Redirect to `/select-area`

3. **Token Refresh**:
   - Access token expires after 15 minutes
   - Axios interceptor catches 401 error
   - Automatically calls `/api/auth/refresh`
   - Updates access token
   - Retries original request

4. **Logout**:
   - POST to `/api/auth/logout`
   - Clears cookies
   - Disconnects Socket.IO
   - Redirects to home

## Real-time Features

### Areas Management

The `/select-area` page demonstrates real-time synchronization:

1. User creates/deletes an area
2. Client emits Socket.IO event
3. Server broadcasts to all connected clients
4. All clients receive update and refresh their lists
5. Changes appear instantly without page refresh

**Socket Events**:
- `area:created` - New area added
- `area:updated` - Area modified
- `area:deleted` - Area removed

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO server URL | `http://localhost:3001` |

Note: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Security Notes

- Access tokens stored in cookies (httpOnly recommended for production)
- Automatic token refresh prevents session expiration
- Route protection via Next.js middleware
- Socket.IO connections authenticated with JWT
- HTTPS enforced in production via Railway

## Troubleshooting

### Connection Issues

If you see "Failed to load areas" or connection errors:
1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check that server is running
3. Ensure CORS is configured on server
4. Check browser console for errors

### Real-time Not Working

If real-time updates don't appear:
1. Check Socket.IO connection in browser DevTools
2. Verify `NEXT_PUBLIC_SOCKET_URL` matches server
3. Ensure you're logged in (Socket.IO requires auth)
4. Check that WebSocket connections are allowed

### Build Errors

If build fails:
1. Delete `.next` folder and `node_modules`
2. Run `npm install` again
3. Ensure all environment variables are set
4. Check for TypeScript errors with `npm run lint`

## License

ISC
