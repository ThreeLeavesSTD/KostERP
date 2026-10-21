import dotenv from "dotenv";
import app from "./app";

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Kost ERP Backend REST API running on port ${PORT}`);
  console.log(`📡 Connected to Supabase at ${process.env.SUPABASE_URL || "default url"}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
});
