# Trigger Complete Domain Setup

Para completar la configuración de `toogoprueba.info`, ejecuta en la consola del navegador:

```javascript
const { data, error } = await supabase.functions.invoke('complete-domain-setup', {
  body: {
    domainPurchaseId: 'ddf31b77-5c94-4b80-8ab0-1163330f3759',
    forceAll: false
  }
});

console.log('Setup result:', data, error);
```

O simplemente usa el botón "Reintentar" en la interfaz de admin.
