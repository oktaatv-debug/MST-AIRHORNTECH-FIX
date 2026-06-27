function json(d, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { "Content-Type": "application/json" }
  });
}

function isAdmin(c) {
  const token = c.request.headers.get("X-Admin-Token");
  return token && c.env.ADMIN_PASSWORD && token === c.env.ADMIN_PASSWORD;
}

async function getUsers(env) {
  const raw = await env.MON_USERS.get("users");
  return raw ? JSON.parse(raw) : {};
}

async function saveUsers(env, users) {
  await env.MON_USERS.put("users", JSON.stringify(users));
}

export async function onRequest(c) {
  try {
    if (!c.env.MON_USERS) {
      return json({ ok:false, message:"MON_USERS belum terhubung." }, 500);
    }

    if (!isAdmin(c)) {
      return json({ ok:false, message:"Unauthorized" }, 401);
    }

    const method = c.request.method;

    if (method === "GET") {
      const users = await getUsers(c.env);
      return json({ ok:true, users });
    }

    if (method === "POST") {
      const b = await c.request.json();
      const code = String(b.code || "").trim().toUpperCase();

      if (!code) {
        return json({ ok:false, message:"Kode wajib diisi." });
      }

      const users = await getUsers(c.env);

      users[code] = {
        pin: String(b.pin || ""),
        name: String(b.name || code),
        active: b.active !== false,
        expired: String(b.expired || ""),
        maxDevice: Number(b.maxDevice || 2),
        devices: users[code]?.devices || {},
        createdAt: users[code]?.createdAt || new Date().toISOString()
      };

      await saveUsers(c.env, users);

      return json({ ok:true, message:"User berhasil disimpan.", user:users[code] });
    }

    if (method === "PATCH") {
      const b = await c.request.json();
      const code = String(b.code || "").trim().toUpperCase();

      const users = await getUsers(c.env);

      if (!users[code]) {
        return json({ ok:false, message:"User tidak ditemukan." });
      }

      ["pin","name","active","expired","maxDevice","devices"].forEach(k => {
        if (k in b) users[code][k] = b[k];
      });

      await saveUsers(c.env, users);

      return json({ ok:true, user:users[code] });
    }

    if (method === "DELETE") {
      const url = new URL(c.request.url);
      const code = String(url.searchParams.get("code") || "").trim().toUpperCase();

      const users = await getUsers(c.env);
      delete users[code];

      await saveUsers(c.env, users);

      return json({ ok:true });
    }

    return json({ ok:false, message:"Method tidak didukung." }, 405);

  } catch(e) {
    return json({ ok:false, message:e.message }, 500);
  }
}
