import { Client } from "dwolla-v2";

const dwollaEnv = (process.env.DWOLLA_ENV ?? "sandbox") as
  | "production"
  | "sandbox";

export const dwollaClient = new Client({
  key: process.env.DWOLLA_KEY ?? "",
  secret: process.env.DWOLLA_SECRET ?? "",
  environment: dwollaEnv,
});
