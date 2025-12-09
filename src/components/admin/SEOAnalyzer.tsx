import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { useAnalyzeSEO } from '@/hooks/useBlogPosts';

interface SEOAnalyzerProps {
  title: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
}

export const SEOAnalyzer = ({ title, content, seoTitle, seoDescription, keywords }: SEOAnalyzerProps) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const { mutate: analyzeSEO, isPending } = useAnalyzeSEO();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (title || content) {
        analyzeSEO(
          { title, content, seoTitle, seoDescription, keywords },
          {
            onSuccess: (data) => setAnalysis(data),
          }
        );
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content, seoTitle, seoDescription, keywords]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 border-green-600';
    if (score >= 60) return 'bg-yellow-100 border-yellow-600';
    return 'bg-red-100 border-red-600';
  };

  const getIssueIcon = (type: 'error' | 'warning' | 'success') => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  if (!analysis && !isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis SEO</CardTitle>
          <CardDescription>Escribe contenido para ver el análisis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Análisis SEO</span>
          {isPending && <span className="text-sm text-muted-foreground">Analizando...</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis && (
          <>
            {/* Score */}
            <div className="flex items-center justify-center">
              <div className={`rounded-full w-24 h-24 flex items-center justify-center border-4 ${getScoreBgColor(analysis.score)}`}>
                <div className={`text-3xl font-bold ${getScoreColor(analysis.score)}`}>
                  {analysis.score}
                </div>
              </div>
            </div>

            {/* Issues */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Análisis de contenido</h4>
              {analysis.issues?.map((issue: any, index: number) => (
                <div key={index} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  {getIssueIcon(issue.type)}
                  <span className="text-sm flex-1">{issue.message}</span>
                </div>
              ))}
            </div>

            {/* Suggestions */}
            {analysis.suggestions && analysis.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  Sugerencias de mejora
                </h4>
                <div className="space-y-2">
                  {analysis.suggestions.map((suggestion: string, index: number) => (
                    <div key={index} className="p-2 rounded bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-900">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score badge */}
            <div className="flex items-center justify-center pt-2">
              <Badge variant={analysis.score >= 80 ? 'default' : analysis.score >= 60 ? 'secondary' : 'destructive'}>
                {analysis.score >= 80 ? '¡Excelente!' : analysis.score >= 60 ? 'Bien' : 'Necesita mejoras'}
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
