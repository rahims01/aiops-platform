This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

This project runs entirely in Docker — no host Node.js install required, just Docker + Docker Compose.

Start the development server (with hot reload):

```bash
docker compose -f docker-compose.local.yml up --build
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The source is volume-mounted into the container, so the page auto-updates as you edit.

Run one-off commands inside the container:

```bash
docker compose -f docker-compose.local.yml run --rm app npm run lint         # Lint
docker compose -f docker-compose.local.yml run --rm app npx tsc --noEmit     # Type-check
docker compose -f docker-compose.local.yml run --rm app npm run build        # Production build
```

Stop the dev server:

```bash
docker compose -f docker-compose.local.yml down
```

For full dev/prod instructions, see [RUNBOOK.md](./RUNBOOK.md).

## Documentation

Browsable HTML versions of all Markdown docs live in [docs/](./docs/) — open `docs/index.html`. Regenerate them after editing any `.md`:

```bash
docker compose -f docker-compose.local.yml run --rm app npm run docs
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
