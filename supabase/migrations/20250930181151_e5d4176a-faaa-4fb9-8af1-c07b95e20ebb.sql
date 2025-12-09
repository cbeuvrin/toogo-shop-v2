-- Clean up phantom subscription created without payment confirmation
DELETE FROM subscriptions 
WHERE id = 'db2873bb-8ef2-460d-aedb-6477a3085fe5' 
AND status = 'active' 
AND mercadopago_subscription_id = 'fe483ff202414ad587baf367435aae43';