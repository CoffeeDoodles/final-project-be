import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
// import crypto from 'crypto'
// import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import listEndpoints from 'express-list-endpoints'

import animalCardData from './data/animal-card-data.json';


const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/final-project-be"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const animalSchema = new mongoose.Schema ({
  lost: Boolean,
  found: Boolean,
  photo: String, //change?
  name: String,
  species: String,
  sex: String,
  breed: String,
  location: String,
  description: String,
  contact: String
})

const Animal = mongoose.model('Animal', animalSchema);

if (process.env.RESET_DB) {
  const seedDB = async () => {
    await Animal.deleteMany();
  }   
  seedDB();
}


// const User = mongoose.model('User', {
//   username: {
//     type: String,
//     required: [true, 'Message is required!'],
//     unique: true 
//   }, 
//   password: {
//     type: String,
//     required: [true, 'Message is required!'],
//     minlength: [8, 'Password must be a minimum of 8 characters!'],
//   }, 
//   accessToken: {
//     type: String, 
//     default: () => crypto.randomBytes(128).toString('hex')
//   }
// })

// const authenticateUser = async (req, res, next) => {
//   const accessToken = req.header('Authorization')

//   try {
//     const user = await User.findOne({ accessToken })
//     if (user) {
//       next()
//     } else {
//       res.status(401).json({ success: false, message: 'Not authenticated' })
//     }
//   } catch (error) {
//     res.status(400).json({ success: false, message: 'Invalid request', error })
//   }
// }

const port = process.env.PORT || 8080
const app = express()


app.use(cors())
app.use(express.json())

//if no server issue, it will jump to next endpoint, but if there is it will return 503 status (server issue)
// the _ replaces req since we are not use it. Prevents error message from eslint
app.use((_, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next()
  } else {
    res.status(503).json({ error: 'Service not available' })
  }
})

// Routes
app.get('/', (req, res) => {
  res.send(listEndpoints(app))
})

app.get('/home', (req, res) => {
  res.send('This is the home page')
})

app.get('/animalposts', async (req, res) => {
  const { lost } = req.query; 

  if (lost) {
      const lostAnimals = await Animal.find({
        lost: {
          $regex: new RegExp(lost, "i") //this operator tells mongo to not care about case sensitivity when searching
        }
      }).populate('lost')
      res.json(lostAnimals)
    } else {
      const animals = await Animal.find()
      res.json(animals)
    }
})




// POST request to register new user
// This endpoint expects a name and password in the body from the POST request from the Frontend
// app.post('/register', async (req, res) => {
//   const { username, password } = req.body

//   try {
//     const salt = bcrypt.genSaltSync()
//     const newUser = await new User({
//       username,
//       password: bcrypt.hashSync(password, salt)
//     }).save()
//     res.json({
//       success: true,
//       userId: newUser._id,
//       username: newUser.username,
//       accessToken:newUser.accessToken
//     })
//   } catch(error) {
//     res.status(400).json({ success: false, message: 'Invalid request', error })
//   }
// })

// Endpoint to login for users that have already registered 
// app.post('/login', async (req, res) => {
//   const { username, password } = req.body

//   try {
//     const user = await User.findOne({ username })

//     if (user && bcrypt.compareSync(password, user.password)) {
//       res.json({
//         success: true, 
//         userID: user._id,
//         username: user.username,
//         accessToken: user.accessToken
//       })
//     } else {
//       res.status(404).json({ success: false, message: 'User not found' })
//     }
//   } catch (error) {
//     res.status(400).json({ success: false, message: 'Invalid request', error })
//   }
// })

// Start the server
app.listen(port, () => {
  // eslint-disable-next-line
  console.log(`Server running on http://localhost:${port}`)
})
