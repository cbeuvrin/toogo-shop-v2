import { useTenantContext } from '@/contexts/TenantContext';

// Acceso rápido al Diseñador IA desde el editor visual. El chat ya no vive en
// un panel flotante: Carlos lo quiso "modo Claude" — una pestaña propia del
// dashboard (DesignStudio) con la tienda en vivo al lado. Este botón solo
// dispara el evento que Dashboard3 escucha para cambiar de pestaña.
export const DesignChatPanel = () => {
  const { currentTenantId: tenantId } = useTenantContext();

  if (!tenantId) return null;

  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('toogo:open-design-studio'))}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-violet-700"
    >
      ✨ Diseñador IA
    </button>
  );
};
