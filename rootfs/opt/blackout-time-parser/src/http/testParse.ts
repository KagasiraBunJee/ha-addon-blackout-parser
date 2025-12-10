import { Request, Response } from "express";
import { parseAndPersistFactory } from "../routes/parsePersist.js";

export const testParseHandler = (parseAndPersist: ReturnType<typeof parseAndPersistFactory>) =>
  async (req: Request, res: Response) => {
    if (!req.body?.text) {
      res.status(400).json({ error: "Missing text" });
      return;
    }
    console.log("[test-parse] Received text length:", req.body.text?.length ?? 0);
    try {
      const result = await parseAndPersist(req.body.text, "manual");
      console.log("[test-parse] Result:", result);
      res.json(result ?? { message: "No ranges detected" });
    } catch (err: any) {
      console.error("[test-parse] Manual parse failed", err);
      res.status(500).json({ error: err.message });
    }
  };
