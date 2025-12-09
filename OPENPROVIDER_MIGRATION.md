# Migración de Porkbun a Openprovider - Completada

**Fecha**: 10 de Enero, 2025  
**Estado**: ✅ Migración Completada - En Producción

---

## 📋 Resumen

Se completó la migración del sistema de registro de dominios de **Porkbun** a **Openprovider** debido a la discontinuación del servicio API de Porkbun.

---

## ✅ Cambios Implementados

### 1. Base de Datos
- ✅ Agregadas columnas `openprovider_domain_id` y `openprovider_handle` a `domain_purchases`
- ✅ Default provider cambiado de 'porkbun' a 'openprovider'
- ✅ Índice creado para optimizar búsquedas por provider

### 2. Edge Function
- ✅ Creado `supabase/functions/openprovider-domains/index.ts`
- ✅ Implementadas todas las acciones:
  - `health` - Health check
  - `diagnostics` - Diagnóstico de configuración
  - `validate-credentials` - Validar login con Openprovider
  - `pricing` - Obtener precios con **45% markup**
  - `check-availability` - Verificar disponibilidad de dominios
  - `purchase` - Registrar dominios
  - `setup-dns` - Configurar DNS automáticamente
  - `transfer` - Transferir dominios

### 3. Configuración
- ✅ Agregada configuración en `supabase/config.toml`
- ✅ Configurados secretos de Openprovider:
  - `OPENPROVIDER_USERNAME`
  - `OPENPROVIDER_PASSWORD`
  - `OPENPROVIDER_API_URL` = https://api.openprovider.eu (PRODUCCIÓN)

### 4. Frontend
- ✅ Actualizado `AdminDomainPurchases.tsx` para usar `openprovider-domains`
- ✅ Actualizado `OnboardingModal.tsx` para usar `openprovider-domains`
- ✅ Textos de UI actualizados de "Porkbun" a "Openprovider"

---

## 🔧 Configuración de Openprovider

### Customer Handle (Keting Media)
```typescript
{
  firstName: "Keting",
  lastName: "Media",
  companyName: "Keting Media",
  email: "c.beuvrin@ketingmedia.com",
  phone: "+54 3830150",
  address: "Av Alvaro Obregon 179, Buenos Aires, Argentina"
}
```

Este handle se usa para **TODOS** los dominios registrados (owner, admin, tech, billing).

### Precio con Markup
- **Base Openprovider**: Precio original en USD
- **Markup aplicado**: 45%
- **Conversión a MXN**: Precio USD con markup × 20

**Ejemplo**:
- Precio base: $10 USD
- Con markup: $10 × 1.45 = $14.50 USD
- En MXN: $14.50 × 20 = $290 MXN

### DNS Automático
Se configuran automáticamente estos registros:
```
A    @    → 76.76.21.21 (Lovable)
A    www  → 76.76.21.21
CNAME *   → @
```

---

## 🧪 Testing Requerido

### ⚠️ IMPORTANTE: Pruebas en Producción
Como se implementó directo en producción (sin CTE), es **CRÍTICO** realizar pruebas antes de abrir a usuarios:

### Test 1: Validar Credenciales ✅
1. Ir a `/admin` → Dominios
2. Click "Validar Credenciales Openprovider"
3. Debe mostrar ✅ éxito

### Test 2: Check Availability ⏳
1. En onboarding, ingresar nombre de dominio de prueba
2. Verificar que muestra disponibilidad y precio con markup
3. **Revisar que el precio incluye el 45% de markup**

### Test 3: Comprar Dominio de Prueba ⏳
**RECOMENDACIÓN**: Comprar 1-2 dominios baratos (`.xyz` o `.online` ~$1-3 USD) para testing:

1. Completar flujo de compra
2. Verificar en base de datos:
   - Estado = 'active'
   - `openprovider_domain_id` tiene valor
   - `provider` = 'openprovider'
   - `openprovider_handle` = 'c.beuvrin@ketingmedia.com'

3. Verificar en panel de Openprovider:
   - El dominio aparece registrado
   - Se restó del saldo de la cuenta

### Test 4: DNS Setup ⏳
1. Verificar que se configuraron los DNS records
2. Usar herramienta como https://dnschecker.org para verificar propagación
3. Esperar 24-48 horas para propagación completa

### Test 5: Verificación DNS (CRON) ⏳
1. Esperar 24-48 horas después de compra
2. Verificar que CRON `check-dns-status` marca dominio como verificado
3. Confirmar que `dns_verified_bool` = true

---

## 📊 Monitoreo Post-Migración

### Revisar Logs de Edge Function
```sql
-- Ver logs en Supabase Dashboard
-- Functions → openprovider-domains → Logs
```

Buscar:
- ✅ Autenticación exitosa con Openprovider
- ❌ Errores de autenticación (código 196)
- ❌ Errores de saldo insuficiente (código 487)
- ❌ Dominios no disponibles (código 305)

### Revisar Base de Datos
```sql
-- Ver todos los dominios con Openprovider
SELECT * FROM domain_purchases 
WHERE provider = 'openprovider' 
ORDER BY created_at DESC;

-- Ver dominios fallidos
SELECT domain, status, metadata->'error' as error
FROM domain_purchases 
WHERE provider = 'openprovider' AND status = 'failed';

-- Estadísticas
SELECT 
  status,
  COUNT(*) as count
FROM domain_purchases
WHERE provider = 'openprovider'
GROUP BY status;
```

### Monitorear Saldo en Openprovider
- **Frecuencia**: Revisar semanalmente (mínimo)
- **Alerta**: Configurar notificación cuando saldo < $100 USD
- **Acción**: Recargar saldo cuando sea necesario

---

## 🚨 Códigos de Error Importantes

| Código | Descripción | Acción |
|--------|-------------|--------|
| 0 | Success | Todo OK ✅ |
| 196 | Authentication failed | Verificar credenciales en secretos |
| 305 | Domain not available | Informar al usuario |
| 324 | Invalid domain name | Validar formato antes de enviar |
| 487 | Insufficient balance | Recargar saldo en Openprovider |

---

## 🔄 Próximos Pasos

### Inmediato (Hoy)
- [ ] Ejecutar Test 1: Validar credenciales
- [ ] Ejecutar Test 2: Check availability
- [ ] Ejecutar Test 3: Comprar dominio barato de prueba

### Corto Plazo (Esta Semana)
- [ ] Monitorear primeras compras reales
- [ ] Verificar DNS propagation de dominios de prueba
- [ ] Confirmar que CRON `check-dns-status` funciona correctamente
- [ ] Revisar logs diariamente

### Mediano Plazo (2-4 Semanas)
- [ ] Evaluar si el markup del 45% es adecuado
- [ ] Considerar implementar customer handles dinámicos por tenant
- [ ] Optimizar manejo de errores basado en casos reales
- [ ] Documentar edge cases encontrados

---

## 🧹 Cleanup (DESPUÉS de 7 días estables)

**NO EJECUTAR HASTA CONFIRMAR QUE TODO FUNCIONA PERFECTAMENTE**

Una vez que tengas al menos **7 días** de operación estable y sin problemas:

### 1. Eliminar Edge Function de Porkbun
```bash
rm -rf supabase/functions/porkbun-domains/
```

### 2. Actualizar config.toml
Eliminar estas líneas:
```toml
[functions.porkbun-domains]
verify_jwt = false
```

### 3. Limpiar Secretos de Porkbun
En Supabase Dashboard → Settings → Edge Functions → Secrets:
- Eliminar `PORKBUN_API_KEY`
- Eliminar `PORKBUN_SECRET_KEY`

### 4. Commit Final
```bash
git add .
git commit -m "chore: Remove Porkbun integration after successful Openprovider migration"
git push origin main
```

---

## 📚 Referencias

### Documentación de Openprovider
- API Docs: https://doc.openprovider.com/
- Authentication: https://doc.openprovider.com/#tag/Authentication
- Domains: https://doc.openprovider.com/#tag/DomainService
- DNS: https://doc.openprovider.com/#tag/DNSService

### Archivos Modificados
- `supabase/functions/openprovider-domains/index.ts` - NUEVO
- `supabase/config.toml` - Agregada config de openprovider-domains
- `src/components/admin/AdminDomainPurchases.tsx` - Actualizado a openprovider-domains
- `src/components/OnboardingModal.tsx` - Actualizado a openprovider-domains
- Migration SQL: Agregadas columnas openprovider_domain_id y openprovider_handle

### Archivos Mantenidos (Backup Temporal)
- `supabase/functions/porkbun-domains/` - MANTENER hasta cleanup final
- Secretos de Porkbun - MANTENER hasta cleanup final

---

## 💡 Notas Importantes

1. **Modo Producción**: Esta migración se implementó directamente en producción. No hay sandbox/CTE.

2. **Saldo Prepago**: Openprovider funciona con saldo prepago. Asegúrate de mantener saldo suficiente.

3. **Customer Handle Único**: Se usa un solo handle (Keting Media) para todos los dominios. Esto simplifica el proceso pero significa que todos los dominios están a nombre de Keting Media.

4. **Markup del 45%**: El precio final incluye 45% de markup sobre el precio base de Openprovider. Ajusta si es necesario.

5. **DNS Propagation**: La verificación DNS puede tomar 24-48 horas. El CRON corre cada 6 horas.

6. **Rollback**: NO hay rollback a Porkbun (su API está discontinuada). Si algo falla, hay que arreglar la integración con Openprovider.

7. **TLDs Soportados**: `.com`, `.mx`, `.store`, `.online`, `.xyz`, `.site`, `.shop`

---

## 👤 Contacto de Soporte

**Proveedor**: Openprovider  
**Cuenta**: c.beuvrin@ketingmedia.com  
**Soporte**: https://support.openprovider.com/

---

**Última actualización**: 10 de Enero, 2025  
**Responsable**: Sistema de migración automatizado
