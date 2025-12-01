require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, initDb } = require('./db');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const eventsRoutes = require('./routes/events');
const ridesRoutes = require('./routes/rides');
const moneyRoutes = require('./routes/money');
const messagesRoutes = require('./routes/messages');
const photosRoutes = require('./routes/photos');
const notificationsRoutes = require('./routes/notifications');
const conflictsRoutes = require('./routes/conflicts');
const locationRoutes = require('./routes/location');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/money', moneyRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/conflicts', conflictsRoutes);
app.use('/api/location', locationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const startServer = async () => {
  try {
    await initDb();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
