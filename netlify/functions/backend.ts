import serverless from "serverless-http";
import app from "../../backend/src/app";

// Request ke /api/backend/* diteruskan ke fungsi ini oleh netlify.toml.
// Ubah path-nya kembali ke /api/* supaya cocok dengan route Express.
const handlerApp = (req: any, res: any) => {
  req.url = req.url.replace(/^\/(?:\.netlify\/functions\/backend|api\/backend)(?=\/|$|\?)/, "/api");
  return app(req, res);
};

export const handler = serverless(handlerApp);
