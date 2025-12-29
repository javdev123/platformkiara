const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // ✅ Tus credenciales de Supabase (las mismas de tu index.html)
  const SUPABASE_URL = "https://wpmlpctrbfxkzpsnwpvj.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbWxwY3RyYmZ4a3pwc253cHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNDk0MTgsImV4cCI6MjA4MTgyNTQxOH0.9JAHigOfjdBlYPcgW5TyDNfGIdxvt_G-VMj2pVLXwNE";
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  try {
    console.log('🔄 Ejecutando keep-alive para Supabase...');
    
    // ✅ Lista el bucket 'videos' para generar actividad
    const { data, error } = await supabase.storage
      .from('videos')
      .list('', { limit: 1 });
    
    if (error) {
      console.error('❌ Error al acceder a Supabase:', error);
      throw error;
    }
    
    console.log('✅ Supabase activo - Videos encontrados:', data.length);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Supabase Storage activo',
        videosCount: data.length,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('❌ Error en keep-alive:', error.message);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// ✅ Se ejecuta cada 5 días (margen de seguridad antes de los 7 días)
exports.config = {
  schedule: "0 0 */5 * *" // Cada 5 días a medianoche
};