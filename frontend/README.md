

## Setup

1. Install dependencies:
```bash
npm install
```

2. Make sure `.env.local` file exists with the following variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pages

- `/` - Home page with links to supervisor dashboard
- `/supervisor` - Supervisor dashboard for managing help requests

## API Routes

- `GET /api/supervisor/pending` - Get all pending help requests
- `GET /api/supervisor/requests` - Get all help requests
- `POST /api/supervisor/resolve` - Resolve a help request
- `POST /api/supervisor/check-timeouts` - Check for timed out requests
- `GET /api/knowledge` - Get all knowledge base entries
- `POST /api/knowledge` - Add a new knowledge base entry
- `GET /api/cron/check-timeouts` - Cron job to check timeouts

## Features

- Real-time updates every 5 seconds
- Automatic timeout checking every minute
- Knowledge base management
- Request history tracking
- Clean and responsive UI with Tailwind CSS
