import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DesignStats {
  totalDesigns: number;
  styleUsage: { style: string; count: number }[];
  averageRating: number;
  recentActivity: { date: string; count: number }[];
  topRatedStyles: { style: string; avgRating: number }[];
}

export const useDesignStats = () => {
  return useQuery({
    queryKey: ['design-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: designs, error } = await supabase
        .from('saved_bedroom_designs')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Calculate statistics
      const totalDesigns = designs?.length || 0;

      // Style usage
      const styleCount: Record<string, number> = {};
      designs?.forEach(design => {
        styleCount[design.style_name] = (styleCount[design.style_name] || 0) + 1;
      });
      const styleUsage = Object.entries(styleCount)
        .map(([style, count]) => ({ style, count }))
        .sort((a, b) => b.count - a.count);

      // Average rating
      const ratingsSum = designs?.reduce((sum, d) => sum + (d.rating || 0), 0) || 0;
      const ratingsCount = designs?.filter(d => d.rating !== null).length || 0;
      const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

      // Recent activity (last 7 days)
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      const recentDesigns = designs?.filter(d => new Date(d.created_at) >= last7Days) || [];
      
      const activityByDate: Record<string, number> = {};
      recentDesigns.forEach(design => {
        const date = new Date(design.created_at).toLocaleDateString('fr-FR', { 
          month: 'short', 
          day: 'numeric' 
        });
        activityByDate[date] = (activityByDate[date] || 0) + 1;
      });
      const recentActivity = Object.entries(activityByDate)
        .map(([date, count]) => ({ date, count }))
        .slice(-7);

      // Top rated styles
      const styleRatings: Record<string, { sum: number; count: number }> = {};
      designs?.forEach(design => {
        if (design.rating) {
          if (!styleRatings[design.style_name]) {
            styleRatings[design.style_name] = { sum: 0, count: 0 };
          }
          styleRatings[design.style_name].sum += design.rating;
          styleRatings[design.style_name].count += 1;
        }
      });
      const topRatedStyles = Object.entries(styleRatings)
        .map(([style, { sum, count }]) => ({ 
          style, 
          avgRating: sum / count 
        }))
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 5);

      const stats: DesignStats = {
        totalDesigns,
        styleUsage,
        averageRating,
        recentActivity,
        topRatedStyles,
      };

      return stats;
    },
  });
};
