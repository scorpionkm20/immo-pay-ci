import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, ville, quartier } = await req.json();
    
    if (!address && !ville) {
      throw new Error("Address or ville is required");
    }

    const token = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
    if (!token) {
      throw new Error("MAPBOX_PUBLIC_TOKEN not configured");
    }

    // Construct search query - prioritize full address, fall back to ville + quartier
    let searchQuery = address || `${quartier ? quartier + ', ' : ''}${ville}, Côte d'Ivoire`;
    
    // URL encode the search query
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Use Mapbox Geocoding API
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${token}&country=CI&limit=1`;
    
    console.log('Geocoding query:', searchQuery);
    
    const response = await fetch(geocodeUrl);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      throw new Error("No results found for this address");
    }
    
    const [longitude, latitude] = data.features[0].center;
    
    console.log('Geocoded:', { address: searchQuery, latitude, longitude });
    
    return new Response(
      JSON.stringify({ 
        latitude, 
        longitude,
        place_name: data.features[0].place_name 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Geocoding error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
