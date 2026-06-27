async function admin(c) {
  const t = c.request.headers.get("X-Admin-Token");
  return Boolean(t && c.env.ADMIN_PASSWORD && t === c.env.ADMIN_PASSWORD);
}
function json(d, s=200) { return new Response(JSON.stringify(d), { status:s, headers:{ "Content-Type":"application/json" }}); }
async function getUsers(env) {
  if (!env.MON_USERS) throw new Error("MON_USERS belum terhubung di wrangler.toml.");
  const raw = await env.MON_USERS.get("users");
  return raw ? JSON.parse(raw) : {};
}
async function putUsers(env, users) {
  if (!env.MON_USERS) throw new Error("MON_USERS belum terhubung di wrangler.toml.");
  await env.MON_USERS.put("users", JSON.stringify(users));
}
export async function onRequestGet(c) {
  try { if (!(await admin(c))) return json({ ok:false, message:"Unauthorized" }, 401); return json({ ok:true, users: await getUsers(c.env) }); }
  catch(e){ return json({ ok:false, message:e.message }, 500); }
}
export async function onRequestPost(c) {
  try {
    if (!(await admin(c))) return json({ ok:false, message:"Unauthorized" }, 401);
    const b = await c.request.json();
    const code = String(b.code || "").trim().toUpperCase();
    if (!code) return json({ ok:false, message:"Kode wajib diisi." });
    const users = await getUsers(c.env);
    users[code] = { pin:String(b.pin||""), name:String(b.name||code), active:b.active!==false, expired:String(b.expired||""), maxDevice:Number(b.maxDevice||2), devices:users[code]?.devices||{}, createdAt:users[code]?.createdAt||new Date().toISOString() };
    await putUsers(c.env, users);
    return json({ ok:true, user: users[code] });
  } catch(e){ return json({ ok:false, message:e.message }, 500); }
}
export async function onRequestPatch(c) {
  try {
    if (!(await admin(c))) return json({ ok:false, message:"Unauthorized" }, 401);
    const b = await c.request.json();
    const code = String(b.code || "").trim().toUpperCase();
    const users = await getUsers(c.env);
    if (!users[code]) return json({ ok:false, message:"User tidak ditemukan." });
    ["pin","name","active","expired","maxDevice","devices"].forEach(k=>{ if(k in b) users[code][k]=b[k]; });
    await putUsers(c.env, users);
    return json({ ok:true, user: users[code] });
  } catch(e){ return json({ ok:false, message:e.message }, 500); }
}
export async function onRequestDelete(c) {
  try {
    if (!(await admin(c))) return json({ ok:false, message:"Unauthorized" }, 401);
    const code = String(new URL(c.request.url).searchParams.get("code") || "").trim().toUpperCase();
    const users = await getUsers(c.env);
    delete users[code];
    await putUsers(c.env, users);
    return json({ ok:true });
  } catch(e){ return json({ ok:false, message:e.message }, 500); }
}
