import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { Options } from "../helpers/config.js";

export interface TelegramHandle {
  mode: "user";
  client: TelegramClient;
}

export type MessageHandler = (text: string, id: number) => Promise<void>;

export const startTelegramClient = async (
  cfg: Options,
  onMessage: MessageHandler,
): Promise<TelegramHandle | null> => {
  if (!cfg.telegram_session || !cfg.telegram_api_id || !cfg.telegram_api_hash) {
    console.warn("User client missing api_id/api_hash/session; Telegram listener disabled.");
    return null;
  }

  const channels = (cfg.telegram_channel || []).filter(Boolean);
  const pollSeconds = cfg.telegram_poll_seconds ?? 300;
  const pollLimit = cfg.telegram_poll_limit ?? 10;
  const mode = (cfg.telegram_mode || "polling").toLowerCase();
  const useEvents = mode === "events" || mode === "hybrid";
  const usePolling = mode === "polling" || mode === "hybrid";
  console.log(`Telegram listener starting; channels=${channels.length ? channels.join(",") : "none"}`);

  const client = new TelegramClient(
    new StringSession(cfg.telegram_session),
    Number(cfg.telegram_api_id),
    cfg.telegram_api_hash,
    { connectionRetries: 5 },
  );

  console.log("Connecting Telegram user client...");
  let connectResolved = false;
  let handlerRegistered = false;
  const connectTimeout = setTimeout(() => {
    if (!connectResolved) {
      console.warn("Telegram connect still pending after 15s");
    }
  }, 15000);

  try {
    await client.connect();
    connectResolved = true;
    clearTimeout(connectTimeout);
    console.log("Telegram user client connected");
    const authorized = await client.checkAuthorization();
    console.log(`Telegram user client authorized: ${authorized}`);
    if (!authorized) {
      console.warn("Telegram session not authorized; refresh telegram_session.");
    }
  } catch (err) {
    console.error("User client connection failed", err);
    return { mode: "user", client };
  }

  if (handlerRegistered) return { mode: "user", client };
  let allowedPeerIds: Set<string> | null = null;
  const resolvedEntities: any[] = [];
  const lastSeenByPeer = new Map<string, number>();
  const normalizePeerId = (id: any): string | null => {
    if (id == null) return null;
    const raw = String(id);
    if (raw.startsWith("-100") || raw.startsWith("-")) return raw;
    return `-100${raw}`;
  };
  if (channels.length) {
    const resolvedChannels: Array<string> = [];
    for (const channel of channels) {
      try {
        const entity: any = await client.getEntity(channel);
        const resolved = typeof entity === "object" && "id" in entity ? (entity as any).id : channel;
        console.log(`Telegram channel resolved: ${String(channel)} -> ${String(resolved)}`);
        const peerId = await client.getPeerId(entity);
        const peerKey = normalizePeerId(peerId);
        if (peerKey) resolvedChannels.push(peerKey);
        resolvedEntities.push(entity);
      } catch (err: any) {
        console.warn(`Could not resolve channel entity: ${String(channel)}`, err?.message);
        const fallbackKey = normalizePeerId(channel);
        if (fallbackKey) resolvedChannels.push(fallbackKey);
      }
    }
    allowedPeerIds = resolvedChannels.length ? new Set(resolvedChannels) : null;
  }
  console.log(
    `Telegram mode configured: ${mode}; allowed=${allowedPeerIds ? Array.from(allowedPeerIds).join(",") : "all"}`,
  );
  handlerRegistered = true;
  if (useEvents) {
    client.addEventHandler(
      async (event) => {
        try {
          const message = event.message;
          if (!message) return;
          const text = (message.message || "").trim();
          if (!text) return;
          const chatId =
            (message as any).chatId ??
            (message as any).peerId?.channelId ??
            (message as any).peerId?.chatId ??
            (message as any).peerId?.userId;
          const peerKey = normalizePeerId(chatId);
          if (allowedPeerIds && peerKey && !allowedPeerIds.has(peerKey)) {
            return;
          }
          if (peerKey) {
            const idNum = Number(message.id);
            if (!Number.isNaN(idNum)) lastSeenByPeer.set(peerKey, idNum);
          }
          console.log(`Telegram event message received (id=${message.id}, chat=${chatId ?? "unknown"})`);
          await onMessage(text, message.id);
        } catch (err) {
          console.error("Failed to process Telegram event message", err);
        }
      },
      new NewMessage({}),
    );
    console.log("Telegram events enabled");
  }
  if (usePolling && resolvedEntities.length && pollSeconds > 0) {
    const pollOnce = async () => {
      try {
        for (const entity of resolvedEntities) {
          const peerId = normalizePeerId(await client.getPeerId(entity));
          if (!peerId) continue;
          const messages = await client.getMessages(entity, { limit: pollLimit });
          const list = Array.isArray(messages) ? messages : (messages as any) ?? [];
          const sorted = list
            .map((msg: any) => msg)
            .filter(Boolean)
            .sort((a: any, b: any) => Number(a.id) - Number(b.id));
          const lastSeen = lastSeenByPeer.get(peerId) ?? 0;
          const fresh = sorted.filter((msg: any) => Number(msg.id) > lastSeen);
          if (!fresh.length) continue;
          for (const msg of fresh) {
            const text = (msg.message || "").trim();
            if (!text) {
              lastSeenByPeer.set(peerId, Number(msg.id));
              continue;
            }
            if (cfg.prefix && !text.includes(cfg.prefix)) {
              lastSeenByPeer.set(peerId, Number(msg.id));
              continue;
            }
            console.log(`Telegram poll message received (id=${msg.id}, chat=${peerId})`);
            await onMessage(text, msg.id);
            lastSeenByPeer.set(peerId, Number(msg.id));
          }
        }
      } catch (err) {
        console.error("Telegram polling failed", err);
      }
    };
    pollOnce().catch((err) => console.error("Telegram initial poll failed", err));
    setInterval(pollOnce, pollSeconds * 1000);
    console.log(`Telegram polling enabled: every ${pollSeconds}s, limit=${pollLimit}`);
  }

  return { mode: "user", client };
};
