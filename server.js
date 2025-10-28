// local-agent.js - ultra stable version
const express = require("express");
const bodyParser = require("body-parser");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = 3000;
const SCRIPT_NAME = "softctrl.ps1";

app.get("/", (req, res) => {
  res.send(`
<html>
<head><meta charset="utf-8"><title>SoftControl</title></head>
<body style="background:#111;color:#eee;font-family:sans-serif;padding:20px">
  <h2>SoftControl Local Agent</h2>
  <label>Action:</label><input id="action" value="create_doc"><br><br>
  <label>Name:</label><input id="name" value="Kira Doe"><br><br>
  <label>Title:</label><input id="title" value="To-Do – Semaine"><br><br>
  <label>Content:</label><br>
  <textarea id="content" rows="5" cols="50">- Revoir planning
- Poster 2 publications
- Répondre aux fans</textarea><br><br>
  <button onclick="run()">Run</button>
  <pre id="output" style="background:#000;color:#0f0;padding:10px;margin-top:20px"></pre>
<script>
async function run(){
  const data = {
    action: document.getElementById('action').value,
    name: document.getElementById('name').value,
    title: document.getElementById('title').value,
    content: document.getElementById('content').value
  };
  const res = await fetch('/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  document.getElementById('output').textContent = await res.text();
}
</script>
</body>
</html>
  `);
});

app.post("/run", (req, res) => {
  const { action, name, title, content } = req.body || {};
  if (!action) return res.status(400).send("Missing action");
  const scriptPath = path.join(__dirname, SCRIPT_NAME);

  const args = ["-ExecutionPolicy","Bypass","-NoProfile","-File",scriptPath,"-action",action];
  if (name) args.push("-name", name);
  if (title) args.push("-title", title);
  if (content) args.push("-content", content);

  const ps = spawn("powershell.exe", args, { windowsHide: true });
  let output = "";

  ps.stdout.on("data", d => output += d.toString());
  ps.stderr.on("data", d => output += d.toString());
  ps.on("close", code => {
    res.set("Content-Type","text/plain");
    res.send("Exit code: " + code + "\\n\\n" + output);
  });
});

app.listen(PORT, () => {
  console.log("SoftControl local agent running at http://localhost:" + PORT);
});
