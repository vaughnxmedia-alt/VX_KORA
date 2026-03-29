# Supabase Declarative Schema Migration Guide

This guide provides the official, standardized workflow for managing database schema changes using the Supabase CLI and a declarative approach. Following these steps ensures that our local and remote database environments stay consistent and version-controlled.

This workflow is based on the [official Supabase documentation for declarative schemas](https://supabase.com/docs/guides/local-development/declarative-database-schemas).

## Core Concept

Instead of writing `ALTER TABLE` statements manually, we define the desired final state of our schema in `.sql` files within the `supabase/schemas/` directory. The Supabase CLI then compares this desired state with the current state of the database and automatically generates the necessary migration scripts.

---

## Complete Migration Workflow

### Step 1: Update the Schema Files

Make all desired schema changes by editing the `.sql` files inside the `supabase/schemas/` directory.

- **One Object, One File:** For best results, each file should define a single database object (e.g., a table, a view, a function). For example:
    - `supabase/schemas/01_customers_table.sql`
    - `supabase/schemas/02_products_table.sql`
- **Execution Order:** The CLI executes these files in alphabetical (lexicographical) order. You can prefix filenames with numbers (e.g., `01_`, `02_`) to control the order and ensure dependencies are created correctly (e.g., a `users` table must exist before a `posts` table that references it).

### Step 2: Generate the Migration File

Once you have updated your schema files, run the `db diff` command. This compares the schema in your `supabase/schemas` folder against the migrations that have already been run and generates a new migration file containing the precise SQL to get the database to the desired state.

```bash
# Use a short, descriptive name for the change you made
# Example: supabase db diff -f add_phone_to_customers
supabase db diff -f <your_migration_name>
```

A new, timestamped `.sql` file will be created in the `supabase/migrations/` directory. It's a good practice to review this file to ensure the generated SQL is what you expect.

### Step 3: Test the Migration Locally

Before applying any changes to the live database, always test them locally.

```bash
# 1. Start your local Supabase environment (if not already running)
supabase start

# 2. Apply the newly created migration to your local database
supabase migration up
```

After the command succeeds, open your local Supabase Studio (the dashboard running on your machine) to visually inspect the database and confirm the changes are correct.

### Step 4: Deploy the Migration to the Live Database

Once you have confirmed that the migration works as expected locally, you can push it to your live Supabase project.

```bash
# 1. Log in to the Supabase CLI (if you haven't already)
supabase login

# 2. Link your project (only needs to be done once)
supabase link --project-ref <your-project-ref>

# 3. Push the new migration to the live database
supabase db push
```

The CLI will detect the new migration file, ask for your confirmation, and then apply it to your live database. Once complete, your live schema will be up-to-date. 
