import { SETTING_KEYS, getSetting, saveSetting, type SettingKey } from "@/lib/db";
import { HttpError, handle, readJson } from "@/lib/http";

const MAX_BYTES = 50_000;

function settingKey(key: string): SettingKey {
  if (!(SETTING_KEYS as readonly string[]).includes(key)) throw new HttpError(404, "Unknown setting");
  return key as SettingKey;
}

/** { value } — null until it has been saved once. */
export async function GET(_request: Request, ctx: RouteContext<"/api/settings/[key]">) {
  const { key } = await ctx.params;
  return handle("GET /api/settings/[key]", async () => ({ value: await getSetting(settingKey(key)) }));
}

/** Body { value: {...} } replaces the setting. */
export async function PUT(request: Request, ctx: RouteContext<"/api/settings/[key]">) {
  const { key } = await ctx.params;
  const { value } = await readJson(request);
  return handle("PUT /api/settings/[key]", async () => {
    const k = settingKey(key);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Settings must be an object");
    if (JSON.stringify(value).length > MAX_BYTES) throw new HttpError(400, "Settings are too large");
    return saveSetting(k, value);
  });
}
