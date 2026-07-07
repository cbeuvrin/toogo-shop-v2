// Catálogo único de plantillas: lo consumen el selector del dashboard
// (TemplateSelector) y el carrusel de la landing (Index). Al agregar una
// plantilla nueva aquí, aparece en ambos lados automáticamente.
export interface TemplateInfo {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
    tags: string[];
    requires: string[];
}

export const TEMPLATES: TemplateInfo[] = [
    {
        id: 'default',
        name: 'Atlántico',
        description: 'Diseño limpio y equilibrado. Ideal para cualquier tipo de tienda.',
        thumbnail: '/assets/templates/atlantico.png',
        tags: ['Versátil', 'Clásico'],
        requires: []
    },
    {
        id: 'simple_live',
        name: 'Pacífico',
        description: 'Energía y movimiento. Diseño dinámico con grandes visuales. Inspirado en marcas deportivas.',
        thumbnail: '/assets/templates/pacifico.png',
        tags: ['Deporte', 'Dinámico', 'Moderno'],
        requires: []
    },
    {
        id: 'minimal',
        name: 'Mediterráneo',
        description: 'Sofisticación y espacio en blanco. Para marcas de alta gama.',
        thumbnail: '/assets/templates/mediterraneo.png',
        tags: ['Lujo', 'Moda'],
        requires: []
    },
    {
        id: 'fashion',
        name: 'Adriático',
        description: 'Diseño moderno estilo revista. Ideal para marcas de ropa con fuerte identidad visual.',
        thumbnail: '/assets/templates/adriatico.png',
        tags: ['Moda', 'Editorial', 'Moderno'],
        requires: []
    },
    {
        id: 'fashion_hero',
        name: 'Índico',
        description: 'Hero dividido: foto a la izquierda, texto a la derecha. Sin banner superior. Elegante y minimalista.',
        thumbnail: '/assets/templates/indico.png',
        tags: ['Moda', 'Hero Foto', 'Split Layout'],
        requires: []
    },
    {
        id: 'trendy_fashion',
        name: 'Caribe',
        description: 'Hero con foto en forma orgánica a la derecha y texto elegante a la izquierda. Ideal para marcas de moda premium.',
        thumbnail: '/assets/templates/caribe.png',
        tags: ['Moda', 'Elegante', 'Premium'],
        requires: []
    },
    {
        id: 'nature',
        name: 'Nature & Earth',
        description: 'Diseño natural y orgánico con un layout limpio y elegante. Ideal para marcas ecológicas, outdoor o sustentables.',
        thumbnail: '/assets/templates/nature.png',
        tags: ['Ecológico', 'Outdoor', 'Limpio'],
        requires: []
    },
    {
        id: 'premium_brand',
        name: 'Premium Brand',
        description: 'Plantilla de alta conversión con colores oscuros, ideal para mostrar múltiples características y recomendaciones.',
        thumbnail: '/assets/templates/premium_brand.svg',
        tags: ['Premium', 'Café', 'Oscuro'],
        requires: []
    },
    {
        id: 'bauhaus',
        name: 'Bauhaus',
        description: 'Editorial con geometría y colores primarios. Tipografía masiva y layout asimétrico. Ideal para marcas de arte, diseño y productos creativos.',
        thumbnail: '/assets/templates/bauhaus.svg',
        tags: ['Editorial', 'Arte', 'Geométrico'],
        requires: []
    },
    {
        id: 'cyber',
        name: 'Cyber',
        description: 'Modo oscuro futurista con acentos neón, glassmorphism y tipografía monoespacio. Ideal para tech, gaming, streetwear o productos digitales.',
        thumbnail: '/assets/templates/cyber.svg',
        tags: ['Tech', 'Dark', 'Neón'],
        requires: []
    },
];
