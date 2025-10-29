import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT   = process.env.PORT || 3000;
const SECRET = process.env.SOFTCTRL_SECRET;
const WEBAPP = process.env.WEBAPP_URL;

// Blocage sans clé côté API /run
app.use((req,res,next)=>{
  if (req.method==="POST" && req.path==="/run") {
    const k = req.headers["x-softctrl-key"];
    if (!k || k !== SECRET) return res.status(403).send("Forbidden: invalid key");
  }
  next();
});

// UI simple
app.get("/", (_req, res) => {
  res.send(`<!doctype html><html><head><meta charset="utf-8"/><title>SoftControl — Cloud Agent</title>
<style>
body{font-family:system-ui,Arial;background:#0b0d10;color:#e6edf3;margin:0}
.wrap{max-width:900px;margin:0 auto;padding:24px}
.card{background:#14181d;border:1px solid #22303a;padding:16px;border-radius:14px;margin-bottom:16px}
label{display:block;color:#9aa5b1;font-size:12px;margin-bottom:6px}
input,textarea{width:100%;background:#0f1318;color:#e6edf3;border:1px solid #22303a;border-radius:10px;padding:10px}
textarea{min-height:120px;white-space:pre-wrap}
button{padding:10px 14px;border-radius:10px;border:1px solid #00d4ff;background:#0f1318;color:#e6edf3;cursor:pointer}
pre{background:#0f1318;border:1px solid #22303a;border-radius:12px;padding:12px;white-space:pre-wrap}
</style></head>
<body>
<div class="wrap">
  <h2>SoftControl — Cloud Agent</h2>
  <div class="card">
    <label>Action (create_root | create_model | create_doc | cleanup_and_create)</label>
    <input id="action" value="create_doc">
    <label>Model name</label>
    <input id="name" value="Kira Doe">
    <label>Title</label>
    <input id="title" placeholder="To-Do – semaine">
    <label>Content</label>
    <textarea id="content" placeholder="- Tâches …"></textarea>
    <button id="run">Run</button>
  </div>
  <pre id="out">No output yet.</pre>
</div>

<script>
function el(id){ return document.getElementById(id); }

async function call(){
  // feedback immédiat
  el('out').textContent = "Running…";

  const body = {
    action:  el('action').value.trim(),
    name:    el('name').value.trim(),
    title:   el('title').value.trim(),
    content: el('content').value.trim()
  };

  try {
    const r = await fetch('/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-softctrl-key': '${SECRET}'
      },
      body: JSON.stringify(body)
    });
    const txt = await r.text();
    el('out').textContent = txt || '(empty response)';
  } catch (e) {
    el('out').textContent = 'Network error: ' + (e && e.message ? e.message : e);
  }
}

el('run').onclick = call;
</script>
</body></html>`);
});

// Proxy → Google Apps Script
app.post("/run", async (req, res) => {
  try {
    const { action, name, title, content } = req.body || {};
    const payload = { secret: SECRET, cmd: (action||"").toLowerCase() };
    if (name)    payload.name = name;
    if (title)   payload.title = title;
    if (content) payload.content = content;

    const rr = await fetch(WEBAPP, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const txt = await rr.text();
    res.type("text/plain").send(txt);
  } catch (e) {
    res.status(500).type("text/plain").send("Error: " + (e?.message||e));
  }
});

// New route for ChatGPT access
app.post("/chatgpt", async (req, res) => {
  const key = req.headers["x-chatgpt-key"];
  if (key !== process.env.CHATGPT_KEY) {
    return res.status(403).send("Forbidden: invalid chatgpt key");
  }

  const { action, name, title, content } = req.body || {};
  const payload = {
    secret: process.env.SOFTCTRL_SECRET,
    cmd: (action || "").toLowerCase(),
    name,
    title,
    content
  };

  try {
    const response = await fetch(process.env.WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    res.type("text/plain").send(text);
  } catch (e) {
    res.status(500).send("Error: " + (e.message || e));
  }
});

app.listen(PORT, () => console.log("SoftControl cloud agent running on port " + PORT));

