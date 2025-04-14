import { Context as HonoContext } from "hono";
import type { z } from "zod";

// Extend Hono's Context and Request types to fix validator typing issues
declare module "hono" {
  interface Context {
    req: {
      // Allow any string type for validation but with better return typing
      valid<T extends string>(
        target: T
      ): T extends "json" ? any : T extends "param" ? any : any;
    } & Request;
  }
}
