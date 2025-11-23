import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useMapboxToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "sk.eyJ1IjoiZGplZG91NzUiLCJhIjoiY21pYjF0dHp5MHZraTJqc2FxdGVzaTB2NyJ9.10perJfKwn4mmx-zeiv7Dw",
        );

        if (error) {
          console.error("Error fetching Mapbox token:", error);
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Impossible de charger la carte",
          });
          setLoading(false);
          return;
        }

        if (data?.token) {
          setToken(data.token);
        }
      } catch (error) {
        console.error("Error:", error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger la carte",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [toast]);

  return { token, loading };
};
