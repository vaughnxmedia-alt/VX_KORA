-- Create enum for client status
CREATE TYPE public.client_status AS ENUM (
  'lead_captured',
  'meeting_scheduled', 
  'contract_sent',
  'second_meeting',
  'active_client',
  'inactive'
);

-- Add client_status column to customers table
ALTER TABLE public.customers 
ADD COLUMN client_status public.client_status DEFAULT 'lead_captured';

-- Add index for status filtering
CREATE INDEX idx_customers_client_status ON public.customers (client_status);