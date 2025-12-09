# 🚨 CHECKLIST CRÍTICO PARA PRODUCCIÓN

## ⚠️ ANTES DE LANZAR A PRODUCCIÓN - REMOVER CÓDIGO DE SANDBOX

### 1. Porkbun - Configuración de Producción
- [ ] Obtener API keys de producción de Porkbun
- [ ] Actualizar `PORKBUN_API_KEY` en Supabase Secrets (producción)
- [ ] Actualizar `PORKBUN_SECRET_KEY` en Supabase Secrets (producción)
- [ ] Verificar que las API keys funcionen con un dominio real de prueba

### 2. Edge Function: check-dns-status/index.ts
**⚠️ CRÍTICO: Remover auto-aprobación de dominios sandbox**

- [ ] **LÍNEA 17**: ELIMINAR esta línea:
  ```typescript
  console.log("🚨 SANDBOX MODE ACTIVE - Sandbox domains will be auto-verified");
  ```

- [ ] **LÍNEAS 65-71**: REVERTIR a verificación DNS real:
  ```typescript
  // REMOVER ESTAS LÍNEAS:
  const isDnsReady = domainRecord.sandbox_bool 
    ? true  // Auto-approve sandbox domains for testing
    : await checkDnsStatus(domain);
  
  if (domainRecord.sandbox_bool) {
    console.log(`[SANDBOX] Auto-approving DNS for sandbox domain: ${domain}`);
  }
  
  // REEMPLAZAR CON:
  const isDnsReady = await checkDnsStatus(domain);
  ```

### 3. Edge Function: porkbun-domains/index.ts
- [ ] Verificar que NO haya código de simulación activo
- [ ] Confirmar que las llamadas a Porkbun API sean reales
- [ ] Revisar logs para asegurar que no hay mensajes `[TEST MODE]`

### 4. Verificación de DNS y CRON
- [ ] Verificar que el CRON job esté configurado (cada 5 minutos)
- [ ] Confirmar que `check-dns-status` se ejecute correctamente
- [ ] Probar con un dominio real ANTES del lanzamiento oficial

### 5. Notificaciones Email (send-store-ready-notification)
- [ ] Verificar que `RESEND_API_KEY` esté configurado en producción
- [ ] Verificar que el dominio de envío esté validado en Resend
- [ ] Probar envío de email con un dominio real

### 6. Base de Datos
- [ ] Verificar que no haya dominios de prueba/sandbox en producción
- [ ] Limpiar registros de prueba en `domain_purchases`
- [ ] Limpiar registros de prueba en `tenants`
- [ ] Verificar RLS policies estén activas

### 7. Testing Pre-Producción
- [ ] Comprar un dominio real de prueba (barato, ej: .xyz)
- [ ] Verificar todo el flujo end-to-end:
  - [ ] Compra de dominio
  - [ ] Registro en Porkbun
  - [ ] Verificación DNS automática
  - [ ] Email de bienvenida
  - [ ] Acceso al dashboard
  - [ ] Creación de tenant

### 8. Monitoreo Post-Lanzamiento
- [ ] Configurar alertas para fallos en edge functions
- [ ] Monitorear logs de `check-dns-status` los primeros 3 días
- [ ] Verificar que los emails se envíen correctamente
- [ ] Revisar métricas de compras y activaciones

---

## 🔍 Búsqueda Rápida de Código Sandbox

Buscar en el proyecto estos términos para asegurar limpieza completa:
- `SANDBOX MODE`
- `TEST MODE`
- `sandbox_bool ? true`
- `Auto-approve`
- `simulating`
- `simulation`

---

## 📝 Notas Importantes

1. **NO ELIMINAR** el campo `sandbox_bool` de la tabla `domain_purchases` - es útil para identificar compras de prueba
2. **MANTENER** la lógica de verificación DNS real en `checkDnsStatus(domain)`
3. **DOCUMENTAR** cualquier cambio adicional que se haga durante el desarrollo

---

**Fecha de creación**: 2025-10-09  
**Última actualización**: 2025-10-09  
**Responsable**: Equipo de Desarrollo

---

## ✅ Confirmación Final

Una vez completados TODOS los ítems arriba:
- [ ] Revisión de código por segundo desarrollador
- [ ] Testing en ambiente de staging
- [ ] Aprobación de Product Owner
- [ ] Backup de base de datos antes del deploy
- [ ] Deploy a producción programado
- [ ] Monitoreo activo post-deploy (primeras 24h)
