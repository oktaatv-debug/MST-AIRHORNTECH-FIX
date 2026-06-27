export async function onRequestPost({ request, env }) {
  try {
    if (!env.MON_USERS) return json({ ok:false, message:"MON_USERS belum terhubung di wrangler.toml." });
    const b = await request.json();
    const code = String(b.code || "").trim().toUpperCase();
    const pin = String(b.pin || "");
    const deviceId = String(b.deviceId || "");
    const userAgent = String(b.userAgent || "").slice(0, 180);
    if (!code || !pin || !deviceId) return json({ ok:false, message:"Data login tidak lengkap." });
    const raw = await env.MON_USERS.get("users");
    const users = raw ? JSON.parse(raw) : {};
    const u = users[code];
    if (!u) return json({ ok:false, message:"Kode tidak terdaftar." });
    if (u.pin !== pin) return json({ ok:false, message:"PIN salah." });
    if (u.active === false) return json({ ok:false, message:"Kode diblokir / tidak aktif." });
    const today = new Date().toISOString().slice(0,10);
    if (u.expired && today > u.expired) return json({ ok:false, message:"Kode sudah expired." });
    const max = Number(u.maxDevice || 2);
    u.devices = u.devices || {};
    if (!u.devices[deviceId] && Object.keys(u.devices).length >= max) return json({ ok:false, message:`Kode ini sudah dipakai di ${max} HP. Hubungi admin untuk reset.` });
    u.devices[deviceId] = { lastLogin:new Date().toISOString(), userAgent };
    u.lastLogin = new Date().toISOString();
    users[code] = u;
    await env.MON_USERS.put("users", JSON.stringify(users));
    return json({ ok:true, user:{ code, name:u.name, expired:u.expired } });
  } catch(e) { return json({ ok:false, message:e.message }, 500); }
}
function json(d, s=200) { return new Response(JSON.stringify(d), { status:s, headers:{ "Content-Type":"application/json" }}); }
