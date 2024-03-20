const express = require('express')
const {open} = require('sqlite3')
const sqlite3 = require('sqlite3')
const path = require('path')
const {format} = require('date-fns')

const databasePath = path.join(__dirname, 'todoApplication.db')
const app = express()
app.use(express.json())
let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    console.log('Database Initialized')
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}
initializeDbAndServer()

// Middleware to handle invalid due dates
const validateDueDate = (req, res, next) => {
  const {dueDate} = req.body
  if (dueDate && !isValidDate(dueDate)) {
    return res.status(400).send('Invalid Due Date')
  }
  next()
}

// Function to validate if a date string is in yyyy-MM-dd format
const isValidDate = dateString => {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  return regex.test(dateString)
}

app.get('/todos/', async (req, res) => {
  try {
    const {status, priority, search_q, category} = req.query
    let query = 'SELECT * FROM todo WHERE 1=1'
    if (status) query += ` AND status='${status}'`
    if (priority) query += ` AND priority='${priority}'`
    if (search_q) query += ` AND todo LIKE '%${search_q}%'`
    if (category) query += ` AND category='${category}'`
    const todos = await database.all(query)
    res.json(todos)
  } catch (error) {
    res.status(500).send('Internal Server Error')
  }
})

app.get('/todos/:todoId/', async (req, res) => {
  try {
    const {todoId} = req.params
    const todo = await database.get(`SELECT * FROM todo WHERE id=${todoId}`)
    if (!todo) {
      res.status(404).send('Todo not found')
    } else {
      res.json(todo)
    }
  } catch (error) {
    res.status(500).send('Internal Server Error')
  }
})

app.get('/agenda/', async (req, res) => {
  try {
    const {date} = req.query
    const formattedDate = format(new Date(date), 'yyyy-MM-dd')
    const todos = await database.all(
      `SELECT * FROM todo WHERE due_date='${formattedDate}'`,
    )
    res.json(todos)
  } catch (error) {
    res.status(500).send('Internal Server Error')
  }
})

app.post('/todos/', validateDueDate, async (req, res) => {
  try {
    const {id, todo, priority, status, category, dueDate} = req.body
    await database.run(
      `INSERT INTO todo (id, todo, priority, status, category, due_date) VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}')`,
    )
    res.send('Todo Successfully Added')
  } catch (error) {
    res.status(500).send('Internal Server Error')
  }
})

app.put('/todos/:todoId/', validateDueDate, async (req, res) => {
  try {
    const {todoId} = req.params
    const {status, priority, todo, category, dueDate} = req.body
    if (status) {
      await database.run(
        `UPDATE todo SET status='${status}' WHERE id=${todoId}`,
      )
    }
    if (priority) {
      await database.run(
        `UPDATE todo SET priority='${priority}' WHERE id=${todoId}`,
      )
    }
    if (todo) {
      await database.run(`UPDATE todo SET todo='${todo}' WHERE id=${todoId}`)
    }
    if (category) {
      await database.run(
        `UPDATE todo SET category='${category}' WHERE id=${todoId}`,
      )
    }
    if (dueDate) {
      await database.run(
        `UPDATE todo SET due_date='${dueDate}' WHERE id=${todoId}`,
      )
    }
    res.send('Todo Details Updated')
  } catch (error) {
    res.status(500).send('Internal Server Error')
  }
})

app.delete('/todos/:todoId/', async (req, res) => {
  try {
    const {todoId} = req.params
    await database.run(`DELETE FROM todo WHERE id=${todoId}`)
    res.send('Todo Deleted')
  } catch (error) {
    res.status(500).send('Internal Server Error')
  }
})

module.exports = app
