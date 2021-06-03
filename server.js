import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
// import crypto from 'crypto'
// import bcrypt from 'bcrypt'
// import dotenv from 'dotenv'
import listEndpoints from 'express-list-endpoints'

import petData from './data/animal-card-data.json'


const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/petspotter"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const petSchema = new mongoose.Schema ({
  status: String,
  photo: String,
  name: String,
  species: String,
  sex: String,
  breed: String,
  location: String,
  description: String,
  contact: String
})

const Pet = mongoose.model('Pet', petSchema);

if (process.env.RESET_DB) { 
  const seedDB = async () => {
    await Pet.deleteMany()

    await petData.forEach(item => {
      const newPet = new Pet(item)
      newPet.save()
      })
  }   
  seedDB()
}

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

app.get('/petposts', async (req, res) => {
  const { status, species} = req.query
  //add newest & oldest queries when frontend started
  if (status) {
    if (status == 'lost') {
      const lostPets = await Pet.find({ status: 'lost' }) 
      res.json(lostPets)
    } else if (status == 'found') {
      const foundPets = await Pet.find({ status: 'found' }) 
      res.json(foundPets)
    } else {
      res.sendStatus(400)
    }
  } else if (species) {
    if (species === 'cat') {
      const speciesCat = await Pet.find({ species: 'cat' }) 
      res.json(speciesCat)
    } else if (species === 'dog') {
        const speciesDog = await Pet.find({ species: 'dog' }) 
        res.json(speciesDog)
    } else {
        res.sendStatus(400)
    }
  } else {
    const allPetPosts = await Pet.find()
    res.json(allPetPosts)
  }
})

app.get('/petposts/:postId', async (req, res) => {
    const { postId } = req.params
  
    try {
      const singlePost = await Pet.findById(postId);
      if (singlePost) {
        res.json(singlePost)
      } else {
        res.status(404).json({ error: 'Post not found' })
      }
    } catch {
      response.status(400).json({ error: 'Invalid request' })
    }
  })

//Post Requests Here

// Start the server
app.listen(port, () => {
  // eslint-disable-next-line
  console.log(`Server running on http://localhost:${port}`)
})
