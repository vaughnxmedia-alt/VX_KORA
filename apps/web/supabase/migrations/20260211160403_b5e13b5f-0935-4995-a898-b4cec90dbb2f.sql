-- Add validation constraints to support_messages table
ALTER TABLE public.support_messages
ADD CONSTRAINT support_msg_name_length CHECK (char_length(name) <= 100),
ADD CONSTRAINT support_msg_email_length CHECK (char_length(email) <= 255),
ADD CONSTRAINT support_msg_message_length CHECK (char_length(message) <= 5000);