import { useEffect } from 'react';
import { trackPageView } from '../utils/visitorTracking';

/**
 * Hook de React. Úsalo en cada componente de página (o en el layout
 * principal, pasando el nombre de la página/ruta actual).
 *
 * Ejemplo:
 *   function PaginaCotizador() {
 *     useVisitorTracking('Cotizador');
 *     ...
 *   }
 */
export function useVisitorTracking(pageName) {
  useEffect(() => {
    trackPageView(pageName);
  }, [pageName]);
}
