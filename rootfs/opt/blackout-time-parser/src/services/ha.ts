import axios from "axios";
import { Options } from "../helpers/config.js";
import { State } from "../helpers/state.js";

export const callHomeAssistantSwitch = async (
  entityIds: string[],
  desiredState: "on" | "off",
): Promise<void> => {
  const token = process.env.SUPERVISOR_TOKEN;
  if (!token) {
    console.warn("SUPERVISOR_TOKEN missing; cannot control switch");
    return;
  }
  const service = desiredState === "on" ? "turn_on" : "turn_off";
  const url = `http://supervisor/core/api/services/switch/${service}`;
  for (const entityId of entityIds) {
    try {
      await axios.post(
        url,
        { entity_id: entityId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      console.log(`Switch ${entityId} -> ${desiredState}`);
    } catch (err: any) {
      console.error("Failed to call Home Assistant service", err.response?.data || err.message);
    }
  }
};

export const sendNotifications = async (
  notifiers: string[],
  title: string,
  message: string,
) => {
  if (!notifiers.length) return;
  const token = process.env.SUPERVISOR_TOKEN;
  if (!token) {
    console.warn("SUPERVISOR_TOKEN missing; cannot send notifications");
    return;
  }
  for (const notifier of notifiers) {
    const url = `http://supervisor/core/api/services/notify/${notifier}`;
    try {
      await axios.post(
        url,
        { title, message },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      console.log(`Notify ${notifier}: ${title}`);
    } catch (err: any) {
      console.error(`Failed to notify ${notifier}`, err.response?.data || err.message);
    }
  }
};
