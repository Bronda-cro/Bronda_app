// Conexión con Supabase: datos (tabla "items") y archivos (bucket "assets").
(function () {
  const cfg = window.BRONDA_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const TABLE = "items";
  const BUCKET = "assets";

  function collection(name) {
    return {
      doc(id) {
        return {
          set: async (data) => {
            const { error } = await sb.from(TABLE).upsert({ collection: name, id: String(id), data, updated_at: new Date().toISOString() });
            if (error) throw error;
          },
          delete: async () => {
            const { error } = await sb.from(TABLE).delete().eq("collection", name).eq("id", String(id));
            if (error) throw error;
          },
        };
      },
      onSnapshot(cb, errCb) {
        let stopped = false;
        const load = async () => {
          const { data, error } = await sb.from(TABLE).select("id,data").eq("collection", name);
          if (stopped) return;
          if (error) { errCb && errCb(error); return; }
          cb({ docs: data.map((r) => ({ id: r.id, data: () => r.data })) });
        };
        load();
        const ch = sb.channel("rt-" + name + "-" + Math.random().toString(36).slice(2))
          .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: "collection=eq." + name }, () => load())
          .subscribe();
        const vis = () => { if (document.visibilityState === "visible") load(); };
        document.addEventListener("visibilitychange", vis);
        return () => { stopped = true; sb.removeChannel(ch); document.removeEventListener("visibilitychange", vis); };
      },
    };
  }

  window.BRONDA_BACKEND = {
    sb,
    getSession: async () => (await sb.auth.getSession()).data.session,
    onAuth: (cb) => sb.auth.onAuthStateChange((_e, s) => cb(s)),
    signIn: async (email, password) => { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; },
    signOut: async () => { await sb.auth.signOut(); },
    db: async () => ({ collection }),
    assets: async () => ({
      upload: async (blob, opts) => {
        const id = crypto.randomUUID().replace(/-/g, "");
        const type = (opts && opts.type) || blob.type || "application/octet-stream";
        const { error } = await sb.storage.from(BUCKET).upload(id, blob, { contentType: type, upsert: false });
        if (error) throw error;
        return { id };
      },
    }),
    uploadWithId: async (id, blob, type) => {
      const { error } = await sb.storage.from(BUCKET).upload(id, blob, { contentType: type, upsert: true });
      if (error) throw error;
    },
    assetUrl: (id) => cfg.SUPABASE_URL + "/storage/v1/object/public/" + BUCKET + "/" + id,
  };
})();
