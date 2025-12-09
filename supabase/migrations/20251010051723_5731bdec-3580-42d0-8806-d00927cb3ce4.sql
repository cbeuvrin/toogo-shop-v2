-- Delete tenant pruebatoogo.com (e5f3870f-0223-4dee-965a-2a088a54cd59) and all related data
-- This is a transactional operation - all or nothing

DO $$
DECLARE
  tenant_to_delete UUID := 'e5f3870f-0223-4dee-965a-2a088a54cd59';
  deleted_count INT;
BEGIN
  RAISE NOTICE 'Starting deletion of tenant: pruebatoogo.com (%)...', tenant_to_delete;

  -- Delete coupon_usage first (foreign key constraint)
  DELETE FROM coupon_usage WHERE tenant_id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % records from coupon_usage', deleted_count;

  -- Delete user_onboarding_progress
  DELETE FROM user_onboarding_progress WHERE tenant_id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % records from user_onboarding_progress', deleted_count;

  -- Delete tenant_settings
  DELETE FROM tenant_settings WHERE tenant_id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % records from tenant_settings', deleted_count;

  -- Delete visual_editor_data
  DELETE FROM visual_editor_data WHERE tenant_id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % records from visual_editor_data', deleted_count;

  -- Delete dashboard2_settings
  DELETE FROM dashboard2_settings WHERE tenant_id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % records from dashboard2_settings', deleted_count;

  -- Delete dashboard4_settings
  DELETE FROM dashboard4_settings WHERE tenant_id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % records from dashboard4_settings', deleted_count;

  -- Delete subscriptions
  DELETE FROM subscriptions WHERE tenant_id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % records from subscriptions', deleted_count;

  -- Delete cancellation_requests
  DELETE FROM cancellation_requests WHERE tenant_id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % records from cancellation_requests', deleted_count;

  -- Delete domain_purchases (if any exist)
  DELETE FROM domain_purchases WHERE tenant_id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % records from domain_purchases', deleted_count;

  -- Delete user_roles
  DELETE FROM user_roles WHERE tenant_id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % records from user_roles', deleted_count;

  -- Delete banners
  DELETE FROM banners WHERE tenant_id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % records from banners', deleted_count;

  -- Delete categories
  DELETE FROM categories WHERE tenant_id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % records from categories', deleted_count;

  -- Delete the main tenant record
  DELETE FROM tenants WHERE id = tenant_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % tenant record', deleted_count;

  RAISE NOTICE 'Tenant pruebatoogo.com successfully deleted!';
END $$;