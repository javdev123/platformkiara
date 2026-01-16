// netlify/functions/get-config.js
exports.handler = async function(event, context) {
  // Obtener variables de entorno de Netlify
  const config = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_ANON_KEY,
    VIDEO_PUBLICITARIO: "publicidad.mp4",
    SESSION_KEY: "ar_session",
    SESSION_DURATION: 24 * 60 * 60 * 1000
  };

  // Validar que existan las credenciales
  if (!config.SUPABASE_URL || !config.SUPABASE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Missing environment variables. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in Netlify." 
      })
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600" // Cache por 1 hora
    },
    body: JSON.stringify(config)
  };
};