# Toogo Shop Builder V2

This is the V2 repository for Toogo Shop Builder, migrated from Lovable to a standalone GitHub repository for enhanced security and type safety.

## Project Architecture

- **Frontend**: React + Vite
- **UI Framework**: Shadcn UI + Tailwind CSS
- **Backend/Auth**: Supabase
- **Language**: TypeScript (Strict Mode)

## Getting Started

1.  Clone the repository:
    ```bash
    git clone https://github.com/cbeuvrin/toogo-shop-v2.git
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    Create a `.env` file with your Supabase credentials.
4.  Run development server:
    ```bash
    npm run dev
    ```

## Deploying to Vercel

1.  Import this repository into Vercel.
2.  Add the required environment variables:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
    - `VITE_SUPABASE_PROJECT_ID`
    - `VITE_DEMO_STORE_ID`
3.  Deploy!
