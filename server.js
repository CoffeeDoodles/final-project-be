import express from "express"
import cors from "cors"
import mongoose from "mongoose"
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import listEndpoints from "express-list-endpoints"
import cloudinaryFramework from 'cloudinary'
import multer from 'multer'
import cloudinaryStorage from 'multer-storage-cloudinary'

import petData from "./data/pet-card-data.json"

dotenv.config()


const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/petspotter";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
mongoose.Promise = Promise;

const petSchema = new mongoose.Schema({
  petCard: {
    status: String,  
    petName: String,
    species: String,
    sex: String,
    breed: String,
    location: String,
    description: String,
    email: String,
  },
  createdAt: {
    type: Date,
    default: Date.now
    },
  petImages: {
    imageUrl: String
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
  }
);

const Pet = mongoose.model("Pet", petSchema);

if (process.env.RESET_DB) {
  const seedDB = async () => {
    await Pet.deleteMany();

    await petData.forEach((pet) => {
      const newPet = new Pet(pet)
      newPet.save();
    })
  }
  seedDB();
};

const User = mongoose.model('User', {
  username: {
    type: String,
    required: [true, 'Message is required!'],
    unique: true 
  }, 
  password: {
    type: String,
    required: [true, 'Message is required!'],
    minlength: [8, 'Password must be a minimum of 8 characters!'],
  }, 
  accessToken: {
    type: String, 
    default: () => crypto.randomBytes(128).toString('hex')
  }
})

const authenticateUser = async (req, res, next) => {
  const accessToken = req.header('Authorization')

  try {
    const user = await User.findOne({ accessToken })
    if (user) {
      req.user = user
      next()
    } else {
      res.status(401).json({ success: false, message: 'Not authenticated' })
    }
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid request', error })
  }
}

//Model for Cloudinary
const PetImages = mongoose.model('PetImages', {
  name: String,
  imageUrl: String
})

const cloudinary = cloudinaryFramework.v2; 
cloudinary.config({
  cloud_name: 'petspotter', // this needs to be whatever you get from cloudinary
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = cloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pet-images',
    allowedFormats: ['jpg', 'png'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
})
const parser = multer({ storage })

const port = process.env.PORT || 8080;
const app = express();

app.use(cors());
app.use(express.json());

//if no server issue, it will jump to next endpoint, but if there is it will return 503 status (server issue)
// the _ replaces req since we are not use it. Prevents error message from eslint
app.use((_, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next();
  } else {
    res.status(503).json({ error: "Service not available" });
  }
});

// Routes
app.get("/", (_, res) => {
  res.send(listEndpoints(app));
});

app.get("/welcome", authenticateUser, async (_, res) => {
  const testMessage = 'THIS IS THE WELCOME PAGE!'
  res.json({ success: true, testMessage })
})


app.get("/petposts", async (req, res) => {
  const { status, species } = req.query;
  //add newest & oldest queries when frontend started
  if (status) {
    if (status == "lost") {
      const lostPets = await Pet.find({ status: "lost" });
      res.json(lostPets);
    } else if (status == "found") {
      const foundPets = await Pet.find({ status: "found" });
      res.json(foundPets);
    } else {
      res.sendStatus(400);
    }
  } else if (species) {
    if (species === "cat") {
      const speciesCat = await Pet.find({ species: "cat" });
      res.json(speciesCat);
    } else if (species === "dog") {
      const speciesDog = await Pet.find({ species: "dog" });
      res.json(speciesDog);
    } else {
      res.sendStatus(400);
    }
  } else {
    const allPetPosts = await Pet.find();
    res.json(allPetPosts);
  }
});

app.get("/posts/:postId", async (req, res) => {
  const { postId } = req.params;

  try {
    const singlePost = await Pet.findById(postId);
    if (singlePost) {
      res.json(singlePost);
    } else {
      res.status(404).json({ error: "Post not found" });
    }
  } catch {
    res.status(400).json({ error: "Invalid request" });
  }
});
// get for imageurl untested
app.get("/upload-images/:imageUrl", async (req, res) => {
  const { imageUrl } = req.file.path

  try {
    const singlePetImage = await PetImages.findOne(imageUrl);
    if (singlePetImage) {
      res.json(singlePetImage);
    } else {
      res.status(404).json({ error: "Image not found" });
    }
  } catch {
    res.status(400).json({ error: "Invalid request" });
  }
});

//Post Requests Here
app.post("/register-user", async (req, res) => {
  const { username, password } = req.body

  try {
    const salt = bcrypt.genSaltSync()
    const newUser = await new User({
      username,
      password: bcrypt.hashSync(password, salt)
    }).save()
    res.json({
      success: true,
      userId: newUser._id,
      username: newUser.username,
      accessToken:newUser.accessToken
    })
  } catch(error) {
    res.status(400).json({ success: false, message: 'Invalid request', error })
  }
})

// Endpoint to login for users that have already registered 
app.post('/authenticate-user', async (req, res) => {
  const { username, password } = req.body

  try {
    const user = await User.findOne({ username })

    if (user && bcrypt.compareSync(password, user.password)) {
      res.json({
        success: true, 
        userID: user._id,
        username: user.username,
        accessToken: user.accessToken
      })
    } else {
      res.status(404).json({ success: false, message: 'User not found' })
    }
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid request', error })
  }
})

app.post ('/petposts', authenticateUser, async (req, res) => {
  const { 
    status, 
    petName,
    species, 
    sex, 
    breed, 
    location, 
    description, 
    email,
    imageUrl
  } = req.body
  
  try { 
    const newPetPost = await new Pet({ 
      petCard: {
        status,
        petName,
        species, 
        sex, 
        breed, 
        location, 
        description, 
        email,
        imageUrl
      },
      user: req.user      
    }).save()
    res.json(newPetPost);
  } catch (error) {
    if (error.code === 11000) {
      res
        .status(400)
        .json({ error: "Duplicated value", fields: error.keyValue });
    }
      res.status(400).json(error);
  }
});

app.post('/upload-images', parser.single('image'), async (req, res) => {
	res.json({ imageUrl: req.file.path, imageId: req.file.filename})
})

app.post('/upload-images', parser.single('image'), async (req, res) => {
  try {
    const petImages = await new PetImages({ name: req.body.filename, imageUrl: req.file.path }).save()
    res.json(petImages)
  } catch (err) {
    res.status(400).json({ errors: err.errors })
  }
})

app.delete ('/petposts/:id', authenticateUser)
app.delete('/petposts/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPetPost = await PetPost.findOneAndDelete({ _id: id });
    if (deletedPetPost) {
      res.json(deletedPetPost);
    } else {
      res.status(404).json({ message: "Not found" });
    }
  } catch (error) {
    res.status(400).json({ message: "Invalid request", error });
  }
});

// Start the server
app.listen(port, () => {
  // eslint-disable-next-line
  console.log(`Server running on http://localhost:${port}`);
});
