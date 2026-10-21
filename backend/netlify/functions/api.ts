import serverless from "serverless-http";
import app from "../../dist/app";

export const handler = serverless(app);
