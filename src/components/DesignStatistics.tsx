import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDesignStats } from "@/hooks/useDesignStats";
import { TrendingUp, Star, Palette, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const DesignStatistics = () => {
  const { data: stats, isLoading } = useDesignStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Statistiques de Designs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalDesigns === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Statistiques de Designs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aucune statistique disponible. Créez votre premier design pour voir vos statistiques.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Statistiques de Designs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total designs and average rating */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total de designs</p>
            <p className="text-2xl font-bold">{stats.totalDesigns}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Star className="h-4 w-4" />
              Note moyenne
            </p>
            <p className="text-2xl font-bold">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
            </p>
          </div>
        </div>

        {/* Top styles used */}
        {stats.styleUsage.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Styles les plus utilisés
            </h4>
            <div className="space-y-2">
              {stats.styleUsage.slice(0, 5).map((item) => (
                <div key={item.style} className="flex items-center justify-between">
                  <span className="text-sm">{item.style}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary"
                        style={{ 
                          width: `${(item.count / stats.totalDesigns) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top rated styles */}
        {stats.topRatedStyles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Styles les mieux notés
            </h4>
            <div className="space-y-2">
              {stats.topRatedStyles.map((item) => (
                <div key={item.style} className="flex items-center justify-between">
                  <span className="text-sm">{item.style}</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="text-sm font-medium">
                      {item.avgRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {stats.recentActivity.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Activité récente (7 derniers jours)</h4>
            <div className="flex items-end justify-between gap-1 h-20">
              {stats.recentActivity.map((item, index) => {
                const maxCount = Math.max(...stats.recentActivity.map(a => a.count));
                const height = (item.count / maxCount) * 100;
                return (
                  <div key={index} className="flex flex-col items-center flex-1 gap-1">
                    <div 
                      className="w-full bg-primary rounded-t"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                    <span className="text-xs text-muted-foreground truncate w-full text-center">
                      {item.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
