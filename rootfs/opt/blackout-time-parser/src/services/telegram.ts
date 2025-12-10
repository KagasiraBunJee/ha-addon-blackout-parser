import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { Options } from "../helpers/config.js";

export interface TelegramHandle {
  mode: "user";
  client: TelegramClient;
}

export type MessageHandler = (text: string, id: number) => Promise<void>;

export const startTelegramClient = (
  cfg: Options,
  onMessage: MessageHandler,
): TelegramHandle | null => {
  if (!cfg.telegram_session || !cfg.telegram_api_id || !cfg.telegram_api_hash) {
    console.warn("User client missing api_id/api_hash/session; Telegram listener disabled.");
    return null;
  }

  const client = new TelegramClient(
    new StringSession(cfg.telegram_session),
    Number(cfg.telegram_api_id),
    cfg.telegram_api_hash,
    { connectionRetries: 5 },
  );

  (async () => {
    await client.connect();
    console.log("Telegram user client connected");

    let chatsFilter: any = undefined;
    if (cfg.telegram_channel) {
      try {
        const entity: any = await client.getEntity(cfg.telegram_channel);
        const resolved = typeof entity === "object" && "id" in entity ? (entity as any).id : cfg.telegram_channel;
        chatsFilter = resolved ? [resolved] : undefined;
      } catch (err: any) {
        console.warn("Could not resolve channel entity, using raw filter", err?.message);
        chatsFilter = [cfg.telegram_channel];
      }
    }

    client.addEventHandler(
      async (event) => {
        try {
          const message = event.message;
          if (!message) return;
          const text = (message.message || "").trim();
          if (!text) return;
          await onMessage(text, message.id);
        } catch (err) {
          console.error("Failed to process Telegram message", err);
        }
      },
      new NewMessage({ chats: chatsFilter }),
    );
  })().catch((err) => console.error("User client connection failed", err));

  return { mode: "user", client };
};
