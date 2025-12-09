/**
 * Processes HTML content to add IDs to heading elements (h2, h3, h4)
 * This enables anchor linking and smooth scrolling
 */
export function processHeadingsWithIds(htmlContent: string): string {
  // Validación temprana
  if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.trim() === '') {
    console.warn('⚠️ processHeadingsWithIds: contenido vacío o inválido');
    return '';
  }

  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const headings = tempDiv.querySelectorAll('h2, h3, h4');
    
    headings.forEach((heading, index) => {
      // Solo agregar ID si no existe
      if (!heading.id) {
        const text = heading.textContent || '';
        let id = text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
          .trim()
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .substring(0, 50); // Limit length
        
        // Fallback if ID is empty or only dashes
        if (!id || id.replace(/-/g, '') === '') {
          id = `heading-${index}`;
        }
        
        // Ensure uniqueness
        let finalId = id;
        let counter = 1;
        while (tempDiv.querySelector(`#${finalId}`) && tempDiv.querySelector(`#${finalId}`) !== heading) {
          finalId = `${id}-${counter}`;
          counter++;
        }
        
        heading.id = finalId;
      }
    });
    
    return tempDiv.innerHTML;
  } catch (error) {
    console.error('❌ Error procesando headings:', error);
    return htmlContent; // Retornar original si hay error
  }
}

/**
 * Extracts all headings from HTML content
 */
export function extractHeadings(htmlContent: string): { id: string; text: string; level: number }[] {
  if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.trim() === '') {
    return [];
  }

  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const headingElements = tempDiv.querySelectorAll('h2, h3, h4');
    const headings: { id: string; text: string; level: number }[] = [];
    
    headingElements.forEach((heading, index) => {
      const text = heading.textContent || '';
      const level = parseInt(heading.tagName.charAt(1));
      const id = heading.id || `heading-${index}`;
      
      headings.push({ id, text, level });
    });
    
    return headings;
  } catch (error) {
    console.error('❌ Error extrayendo headings:', error);
    return [];
  }
}
