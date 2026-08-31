const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.json');

function getDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [{ username: 'owner', password: 'password123' }],
      history: [],
      tokens: 1
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const db = getDB();
  
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'El usuario ya existe.' });
  }

  db.users.push({ username, password });
  saveDB(db);
  res.json({ success: true, username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDB();
  
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (user) {
    res.json({ success: true, username: user.username });
  } else {
    res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
  }
});

app.get('/api/state', (req, res) => {
  const db = getDB();
  res.json({ tokens: db.tokens, history: db.history });
});

app.post('/api/deliver', (req, res) => {
  const { category, fileName } = req.body;
  const db = getDB();
  
  db.tokens += 1;
  const newEntry = {
    file: fileName || 'proyecto.zip',
    category: category || 'Script / Código Fuente',
    date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  db.history.unshift(newEntry);
  saveDB(db);

  res.json({ success: true, tokens: db.tokens, history: db.history });
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
