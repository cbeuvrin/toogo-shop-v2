import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { List } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
interface Heading {
  id: string;
  text: string;
  level: number;
}
interface TableOfContentsProps {
  headings: Heading[];
}
export function TableOfContents({
  headings
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile); // Desktop: abierto, Móvil: cerrado
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll spy con cleanup adecuado
  useEffect(() => {
    if (headings.length === 0) return;

    // Limpiar observer anterior si existe
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    }, {
      rootMargin: '-20% 0% -35% 0%',
      threshold: 1
    });

    // Observe all heading elements
    headings.forEach(({
      id
    }) => {
      const element = document.getElementById(id);
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [headings]);
  if (headings.length === 0) {
    return null;
  }
  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Header offset
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };
  const renderHeadings = () => <nav className="space-y-1">
      {headings.map(heading => <button key={heading.id} onClick={() => handleClick(heading.id)} className={`
            w-full text-left text-sm transition-all duration-200 rounded-md px-3 py-2
            ${heading.level === 2 ? 'font-medium' : ''}
            ${heading.level === 3 ? 'pl-6 text-muted-foreground' : ''}
            ${heading.level === 4 ? 'pl-9 text-muted-foreground text-xs' : ''}
            ${activeId === heading.id ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary' : 'hover:bg-accent hover:text-accent-foreground'}
          `}>
          {heading.text}
        </button>)}
    </nav>;
  return <>
      {/* Desktop Version - Sticky y Collapsible */}
      <div className="hidden lg:block">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card className="sticky top-24 shadow-lg overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-accent">
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Tabla de Contenidos</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {isOpen ? 'Cerrar' : 'Abrir'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              {renderHeadings()}
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Mobile Version - Collapsible */}
      <div className="lg:hidden mb-8">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-accent">
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Tabla de Contenidos</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {isOpen ? 'Cerrar' : 'Ver índice'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              {renderHeadings()}
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </>;
}