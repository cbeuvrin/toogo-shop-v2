-- Update BEUVRINANUAL2024 coupon to 100% discount
UPDATE coupons 
SET discount_value = 100, updated_at = now()
WHERE code = 'BEUVRINANUAL2024';