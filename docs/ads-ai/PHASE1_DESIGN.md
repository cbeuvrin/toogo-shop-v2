# TOOGO Ads IA — Fase 1: Diseño

> Documento de diseño. **Sin código.** Objetivo: campañas de anuncios generadas,
> lanzadas y optimizadas por IA para las tiendas (Meta / Google / TikTok), a
> partir de un brief en lenguaje natural.
>
> ⚠️ Los requisitos exactos de cada plataforma (scopes, tiempos de aprobación,
> límites) deben re-confirmarse contra la documentación vigente de cada API
> antes de implementar. Este doc refleja el estado conocido al escribirse.

---

## 1. Modelo de cuentas

### Las dos opciones

**A) Modelo "Agencia / sombrilla"** (lo que propusiste)
Toogo dueño de las cuentas madre: Google Ads **MCC**, Meta **Business Manager**,
TikTok **Business Center**. Cada tienda = cuenta hija bajo la sombrilla.

| Pros | Contras |
|---|---|
| Gestión centralizada, Toogo puede operar en nombre de la tienda | **Toogo asume responsabilidad/liability** de las campañas de todos |
| Posible margen sobre el ad spend (revenue extra) | Si una tienda viola políticas, **arriesga toda la sombrilla** |
| Facturación unificada posible (Toogo cobra, paga a la plataforma) | Toogo tendría que **frontear el gasto** (riesgo financiero, cobros fallidos) |
| Onboarding del comerciante más simple (no crea su cuenta) | Barra de aprobación **mucho más alta** (agencia verificada, buen standing) |
| | Complejidad fiscal/contable (Toogo mueve dinero de anuncios de terceros) |

**B) Modelo "Directo" (cuenta del comerciante + OAuth)**
Cada tienda crea **su propia** cuenta de anuncios (fuera de Toogo) y la conecta
por OAuth. Estándar de muchas herramientas "conecta tu cuenta". Más fricción de
setup para un usuario no técnico (crear cuenta desde cero) y sin gestión
centralizada. Se descarta como modelo principal (queda como fallback si algún
comerciante ya tiene su cuenta y prefiere solo conectarla).

### ✅ Recomendación (ELEGIDO): **Agencia (Business Manager) con pago por subcuenta del comerciante**

**Clave que define la decisión:** en el modelo agencia, **cada cuenta hija tiene
su propio método de pago**. Toogo crea una cuenta de anuncios por tienda bajo su
sombrilla (Meta Business Manager / Google Ads MCC / TikTok Business Center) y **el
comerciante le pone SU tarjeta a esa cuenta**. El gasto lo cobra la plataforma
directo a la tarjeta del comerciante → **Toogo NO frontea dinero.**

Esto da lo mejor de ambos mundos:

| Ventaja | Detalle |
|---|---|
| **Onboarding suave para el comerciante** | Toogo le crea la cuenta; él solo agrega su tarjeta y concede acceso. Ideal para el usuario no técnico (el taquero). |
| **Toogo no frontea dinero** | Tarjeta del comerciante en su subcuenta → sin riesgo financiero de adelantar gasto. |
| **Gestión centralizada por API** | Toogo administra todas las campañas de todas las tiendas desde su sombrilla. |
| **Base para tier "Gestionado por Toogo"** | Futuro upsell premium con la misma infraestructura. |

**Riesgos que quedan (manejables):**
- **Compliance / reputación del BM:** si una tienda viola políticas, puede afectar
  el standing del Business Manager de Toogo → se mitiga con **revisión de
  creativos antes de publicar** (ya contemplado en el flujo/`ad_actions_log`).
- **Verificación:** Toogo debe estar verificado y en buen standing como negocio/
  partner en cada plataforma (ver §4).
- **Propiedad/portabilidad:** la cuenta vive bajo la sombrilla de Toogo
  (transferible entre Business Managers, pero controlada por Toogo). Conviene
  aclararlo en los términos con el comerciante.

El campo `account_ownership` en las tablas queda por si a futuro se soporta
también "directo" (comerciante que ya tiene cuenta y solo la conecta).

---

## 2. Flujo de OAuth por plataforma (modelo Directo)

Patrón general (modelo Agencia; reutiliza el que ya tienes con **MercadoPago OAuth**):

```
Dashboard tienda → "Conectar [Meta/Google/TikTok]"
   → redirect a OAuth de la plataforma (scopes de ads + business)
   → callback a edge function `ads-oauth-callback`
   → intercambia code por token de larga duración
   → guarda token en Supabase Vault (NO en tabla plana, NO en frontend)
   → Toogo CREA una cuenta de anuncios hija bajo su sombrilla (BM/MCC/BC)
     para este tenant (o reclama acceso si el comerciante ya tiene una)
   → el comerciante AGREGA SU TARJETA a esa subcuenta (deep-link) y concede acceso
   → crea fila en ad_platform_connections (account_ownership='agency', status='connected')
   → listo para crear campañas en borrador
```

### Meta (Facebook/Instagram)
1. **Facebook Login for Business** con scopes `ads_management`,
   `business_management`, `pages_read_engagement` (según necesidad).
2. Callback → token de usuario de larga duración (60 días, renovable) o token
   de sistema de la Business.
3. Toogo **crea la Ad Account (act_XXXX) bajo su Business Manager** para este
   tenant y la vincula a la **Página** de FB + cuenta de IG del comerciante
   (Toogo ya integra Meta Pixel/Instagram → sinergia).
4. **Método de pago:** cada Ad Account tiene el suyo. Toogo **deep-linkea** al
   comerciante a "Configuración de pagos" de esa subcuenta para que agregue **su
   tarjeta**. El gasto lo cobra Meta directo a su tarjeta → Toogo no frontea.

### Google Ads
1. **OAuth 2.0** de Google con scope `https://www.googleapis.com/auth/adwords`.
2. Callback → refresh token (guardar en Vault).
3. Vincular su **Google Ads Account** (customer ID). En directo, la cuenta es
   del comerciante; en agencia iría bajo el MCC de Toogo.
4. **Método de pago:** en su cuenta de Google Ads (billing setup).
5. ⚠️ Requiere **developer token** de Toogo aprobado (ver bloqueos §4).

### TikTok Ads
1. **TikTok Marketing API OAuth** (`Login Kit` / OAuth de TikTok for Business).
2. Callback → access token + refresh (Vault).
3. Vincular su **Advertiser Account** (advertiser_id).
4. **Método de pago:** en su cuenta de TikTok Ads.
5. ⚠️ Requiere **app aprobada/auditada** por TikTok (ver bloqueos §4).

---

## 3. Tablas nuevas en Supabase

Encajan con el esquema actual (todo cuelga de `tenants`, RLS por tenant,
lecturas públicas vía RPC `SECURITY DEFINER` cuando aplique; los **tokens NO
van en estas tablas** sino en **Supabase Vault**).

### Diagrama ER

```
                         ┌───────────────┐
                         │    tenants    │  (existente)
                         └───────┬───────┘
                                 │ 1
              ┌──────────────────┼───────────────────┐
              │ N                                     │ N
   ┌────────────────────────┐              ┌────────────────────┐
   │ ad_platform_connections│              │    ad_campaigns    │
   │────────────────────────│              │────────────────────│
   │ id (pk)                │◄────┐        │ id (pk)            │
   │ tenant_id (fk)         │     │ 1    N │ tenant_id (fk)     │
   │ platform  meta|google  │     └────────┤ connection_id (fk) │
   │           |tiktok      │              │ platform           │
   │ account_ownership      │              │ external_campaign_id│
   │   direct|agency        │              │ name / objective   │
   │ external_account_id    │              │ status draft|active │
   │ vault_secret_id  ──────┼──► Vault     │        |paused|...  │
   │ scopes / status        │  (token)     │ budget_type/amount  │
   │ connected_at           │              │ brief_text          │
   └────────────────────────┘              │ created_by_ai bool  │
                                           │ created_at          │
                                           └─────────┬───────────┘
                                                     │ 1
                        ┌────────────────────────────┼───────────────┐
                        │ N                           │ N             │ N
             ┌────────────────────┐      ┌────────────────────┐  ┌──────────────────┐
             │    ad_creatives    │      │    ad_audiences    │  │    ad_metrics    │
             │────────────────────│      │────────────────────│  │──────────────────│
             │ id (pk)            │      │ id (pk)            │  │ id (pk)          │
             │ campaign_id (fk)   │      │ campaign_id (fk)   │  │ campaign_id (fk) │
             │ type img|video|... │      │ geo (radio/lat/lng)│  │ date             │
             │ asset_url          │      │ age_min/age_max    │  │ impressions/clicks│
             │ headline/primary   │      │ interests jsonb    │  │ spend/conversions │
             │ cta                │      │ external_audience_id│  │ ctr/cpc/roas      │
             │ external_creative_id│     └────────────────────┘  │ raw jsonb         │
             │ status             │                              └──────────────────┘
             └────────────────────┘

   ┌────────────────────────┐        ┌────────────────────────┐
   │      ad_budgets        │        │    ad_actions_log      │  (auditoría IA)
   │────────────────────────│        │────────────────────────│
   │ id / tenant_id         │        │ id / tenant_id         │
   │ campaign_id (fk)       │        │ campaign_id (fk)       │
   │ monthly_cap            │        │ action  create|pause|  │
   │ spent_to_date          │        │   raise_budget|edit    │
   │ currency               │        │ actor  ai|merchant     │
   │ alert_threshold        │        │ money_impact bool      │
   └────────────────────────┘        │ payload jsonb / at     │
                                      └────────────────────────┘
```

### Detalle de cada tabla

- **`ad_platform_connections`** — una por (tenant, plataforma). Guarda el
  `external_account_id`, `account_ownership` (direct|agency), scopes, estado, y
  un **`vault_secret_id`** que apunta al token cifrado en Supabase Vault. **El
  token nunca en texto plano aquí.**
- **`ad_campaigns`** — campañas. `status` (draft|active|paused|ended|rejected),
  `budget_type` (daily|lifetime), `budget_amount`, `brief_text` (el prompt del
  comerciante), `created_by_ai`, `external_campaign_id`.
- **`ad_creatives`** — copy + imagen/video generados (reusa tu pipeline de IA
  de imágenes: Gemini genera creativos). Referencia al `external_creative_id`.
- **`ad_audiences`** — segmentación: radio geográfico (desde la dirección de la
  tienda), edad, intereses. `external_audience_id`.
- **`ad_metrics`** — filas diarias sincronizadas de la plataforma (impresiones,
  clics, gasto, conversiones, CTR, CPC, ROAS). `raw` jsonb con el payload crudo.
- **`ad_budgets`** — tope mensual, gastado a la fecha, umbral de alerta.
  Refuerza la regla "todo gasto real necesita control".
- **`ad_actions_log`** — auditoría de **cada acción de la IA** (creó, pausó,
  subió presupuesto), con `money_impact` para exigir confirmación humana en las
  que gastan dinero. Clave para transparencia y la regla de seguridad.

**RLS:** todas por `tenant_id` (el dueño solo ve lo suyo). Las llamadas que
tocan APIs externas se hacen desde **edge functions con service role**, nunca
desde el frontend.

---

## 4. Bloqueos externos por plataforma (dependen de un tercero)

| Plataforma | Bloqueo | ¿Depende de tercero? | Tiempo estimado |
|---|---|---|---|
| **Google Ads** | **Developer token** (acceso básico→estándar). Sin él, la API solo funciona en cuentas de prueba, no reales. | 🔴 **SÍ — Google revisa** | **Lento (semanas)**, impredecible |
| Google Ads | Verificación OAuth de la app (scopes sensibles) | 🔴 SÍ | Días–semanas |
| **Meta** | **App Review** para `ads_management` / `business_management` | 🔴 **SÍ — Meta revisa** | Moderado (días–semanas) |
| Meta | **Business Verification** del negocio Toogo | 🔴 SÍ | Moderado |
| **TikTok** | **Aprobación/auditoría de la app** de Marketing API | 🔴 **SÍ — TikTok revisa** | Moderado–lento |

**Conclusión:** el cuello de botella más lento e impredecible es el **developer
token de Google**. Aunque construyamos Meta primero, conviene **iniciar HOY el
trámite del developer token de Google en paralelo** (es "gratis" de tiempo
nuestro y destraba el futuro).

---

## 5. ✅ Recomendación: empezar por **Meta Ads**

**Por qué Meta primero:**
1. **Encaje con el público objetivo.** El ejemplo (tacos, público local) vive en
   Instagram/Facebook. La segmentación por **radio geográfico + intereses** de
   Meta es ideal para negocios locales.
2. **El comerciante ya está ahí.** Casi toda tienda tiene página de FB / IG.
   Toogo **ya integra Meta Pixel e Instagram** → sinergia directa (datos,
   remarketing).
3. **Creativos visuales.** Meta es formato-imagen/video → encaja con tu pipeline
   de generación de imágenes con IA (Gemini) que ya funciona.
4. **API madura** y bien documentada (Marketing API).
5. **Bloqueo más manejable** que el developer token de Google.

**Orden sugerido:** **Meta → Google → TikTok.**
(Iniciar el trámite del token de Google desde ya, aunque se construya después.)

---

## 6. Fase 2 — Módulo de IA (diseño de alto nivel, para después)

Flujo del "agente de campañas":
1. **Brief NL** → el comerciante escribe/dicta ("promociona mis tacos, cerca de
   mi local, $500 al mes"). Reutiliza el cerebro que ya tienes (Claude) para
   parsear intención → objetivo, presupuesto, geo, producto.
2. **Enriquecimiento con datos de la tienda** (Supabase): dirección → radio
   geográfico; catálogo → producto a promocionar; categorías → intereses.
3. **Generación de creativos**: copy (Claude) + imagen/video (Gemini, pipeline
   existente). Varias variantes para A/B.
4. **Estructura de campaña**: objetivo, audiencia, presupuesto diario, ubicaciones.
5. **Publicación por API** → **siempre primero en BORRADOR** (Fase 3).
6. **Monitoreo + optimización**: job periódico lee `ad_metrics`, y la IA propone
   (o ejecuta con tope) subir presupuesto a lo que rinde, pausar lo que no.
   Toda acción con `money_impact` → registro en `ad_actions_log` y confirmación.

## 7. Fase 3 — Implementación incremental (para después, con TODOs)

Empezar SOLO por **Meta**, y solo hasta **modo borrador (sin gastar)**:
- [ ] Trámite: iniciar App Review + Business Verification de Meta (y token de
      Google en paralelo).
- [ ] Edge function `ads-oauth-start` + `ads-oauth-callback` (Meta) con guardado
      de token en **Vault**.
- [ ] Tabla `ad_platform_connections` + RLS.
- [ ] UI en dashboard: "Conectar Meta" + selección de Ad Account/Página.
- [ ] Edge function `ads-create-campaign` que crea campaña **en estado
      borrador/paused** vía Marketing API (sin gastar $).
- [ ] Tablas `ad_campaigns` / `ad_creatives` / `ad_audiences`.
- [ ] Resto (métricas, optimización, Google, TikTok, gasto real) → TODOs.

## 8. Reglas de seguridad (obligatorias en todas las fases)
- **Tokens/credenciales = secretos.** Nunca en frontend ni en el repo. Supabase
  **Vault** para tokens; llamadas a APIs solo desde edge functions (service role).
- **Todo gasto real requiere confirmación explícita** del comerciante. Borrador
  por defecto; publicar/activar/subir presupuesto = acción confirmada y logueada
  en `ad_actions_log`.
- **Topes de presupuesto** por campaña y por mes (`ad_budgets`), con alertas.
- **Respetar políticas de anuncios** de cada plataforma (revisión de creativos
  antes de publicar; manejar rechazos).
- **Human-in-the-loop** para cambios de dinero significativos.
```
```
