import axios from "axios";

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
