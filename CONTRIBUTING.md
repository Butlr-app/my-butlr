# Contributing to My Butlr

## Development Setup

1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your Supabase credentials
4. Run `npm run dev` to start the dev server

## Code Style

- **TypeScript** strict mode
- **Monochrome design** — no accent colors, use black/white/grey only
- **Fonts**: Inter (UI text), Geist Mono (monospace/labels)
- Follow existing component patterns in `src/components/ui/`
- Use the `useTable<T>` generic hook for standard CRUD operations
- Place all Supabase hooks in `src/lib/useSupabase.ts`
- Use `Modal` and `ConfirmModal` for all create/edit/delete operations

## Conventions

- Imports at the top of every file
- Use path alias `@/` for `src/` imports
- All forms must have client-side validation
- Show loading states during async operations
- Show toast notifications after mutations
- Use `ConfirmModal` before destructive actions

## Branch Strategy

- Create feature branches from `main`
- Name branches: `feature/description` or `fix/description`
- Submit pull requests with clear descriptions
- Ensure `npm run build` and `npx tsc --noEmit` pass before submitting

## Database Changes

- Add new migrations to `supabase/schema.sql`
- Always enable RLS on new tables
- Add appropriate policies for authenticated users
