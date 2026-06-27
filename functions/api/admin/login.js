export async function onRequestPost({ request, env }) {
  try {
    const b = await request.json();
    if (!env.ADMIN_PASSWORD) return json({ ok:false, message:"ADMIN_PASSWORD belum diset di Cloudflare." });
    if (String(b.password || "") !== env.ADMIN_PASSWORD) return json({ ok:false, message:"Password admin salah." });
    if (!env.MON_USERS) return json({ ok:false, message:"MON_USERS belum terhubung. Cek wrangler.toml dan deploy ulang." });
    return json({ ok:true, token: env.ADMIN_PASSWORD, version:"ADMIN_LOGIN_FIX_TOTAL" });
  } catch(e) { return json({ ok:false, message:e.message }, 500); }
}
function json(d, s=200) { return new Response(JSON.stringify(d), { status:s, headers:{ "Content-Type":"application/json" }}); }
