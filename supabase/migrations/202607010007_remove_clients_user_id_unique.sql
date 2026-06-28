-- Allow a user to own multiple client/company records
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_user_id_unique;
