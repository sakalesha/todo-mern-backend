// Import Express
const express = require('express');
const app = express();

require('dotenv').config();

// CORS
const cors = require('cors');
app.use(cors());

// MongoDB
const mongoose = require('mongoose');

console.log('Connecting to MongoDB with URI:', process.env.MONGODB_URI);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Authentication
const authRouter = require('./routes/auth');
const jwt = require('jsonwebtoken');

// Use JSON middleware
app.use(express.json());

// Use auth routes (register/login)
app.use('/auth', authRouter);

// Middleware to authenticate JWT token for protected routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']; // Bearer token
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const Todo = require('./models/Todo.js');

// Protect all todo routes with authentication and associate todos with logged-in user

// Get todos for logged-in user
app.get('/todos', authenticateToken, async (req, res) => {
  const todos = await Todo.find({ user: req.user.userId });
  res.json(todos);
});

// Create a new todo for logged-in user
app.post('/todos', authenticateToken, async (req, res) => {
  const { text } = req.body;
  try {
    const newTodo = new Todo({ text, user: req.user.userId });
    const savedTodo = await newTodo.save();
    res.status(201).json(savedTodo);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add todo' });
  }
});

// Toggle completed status of a todo owned by logged-in user
app.patch('/todos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const todo = await Todo.findOne({ _id: id, user: req.user.userId });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    todo.completed = !todo.completed;
    await todo.save();
    res.json(todo);
  } catch (error) {
    res.status(400).json({ error: 'Error toggling todo' });
  }
});

// Delete a todo owned by logged-in user
app.delete('/todos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Todo.findOneAndDelete({ _id: id, user: req.user.userId });
    if (!deleted) return res.status(404).json({ error: 'Todo not found' });

    res.json({ message: 'Todo deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Error deleting todo' });
  }
});

// Update todo text of a todo owned by logged-in user
app.put('/todos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: id, user: req.user.userId },
      { text: text },
      { new: true, runValidators: true }
    );
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json(todo);
  } catch (error) {
    res.status(400).json({ error: 'Error updating todo' });
  }
});

// Start the server, using environment PORT if available
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
