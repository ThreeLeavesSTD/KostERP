import app from "./app";

const PORT = process.env.PORT || 5000;

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Kost ERP Backend REST API running on port ${PORT}`);
  console.log(`📡 Connected to Supabase at ${process.env.SUPABASE_URL || "default url"}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
});
