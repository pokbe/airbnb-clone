const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const db = require('./config/db')
const bcrypt = require('bcryptjs');
const User = require('./models/User.js')
const Place = require('./models/Place.js')
const Booking = require('./models/Booking.js')
const cookieParser = require('cookie-parser');
const imageDownloader = require('image-downloader');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3')
const multer = require('multer')
const mime = require('mime-types');
require('dotenv').config();

const fs = require('fs')

const app = express()
const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'haidenairbnbresult12123';
const bucket = 'haiden-booking-app';

app.use(express.json());
app.use(cookieParser());
app.use('/api/uploads', express.static(__dirname + '/uploads'))
app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173',
}));

console.log(process.env.MONGO_URL)

async function uploadToS3(path, originalFilename, mimetype) {
    const client = new S3Client({
        region: 'us-east-2',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
      });
      const parts = originalFilename.split('.');
      const ext = parts[parts.length - 1];
      const newFilename = Date.now() + '.' + ext;
      //console.log({path, originalFilename, mimetype, newFilename, S3_ACCESS_KEY, S3_SECRET_ACCESS_KEY})
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Body: fs.readFileSync(path),
        Key: newFilename,
        ContentType: mimetype,
        ACL: 'public-read',
      }));
      return `https://${bucket}.s3.amazonaws.com/${newFilename}`;
}

app.get('/api/test', (req, res) => {
    db.connect(process.env.MONGO_URL)
    res.json('test ok')
})

function getUserDataFromReq(req) {
    return new Promise((resolve, reject) => {
        jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
            if (err) throw err;
            resolve(userData);
        });
    });
}

app.post('/api/register', async (req, res) => {
    db.connect(process.env.MONGO_URL)
    const { name, email, password } = req.body;
    try {
        const userDoc = await User.create({
            name,
            email,
            password: bcrypt.hashSync(password, bcryptSalt),
        })
        res.json(userDoc);
    } catch (error) {
        res.status(422).json(error);
    }
})

app.post('/api/login', async (req, res) => {
    db.connect(process.env.MONGO_URL)
    const { email, password } = req.body;
    const userDoc = await User.findOne({ email })
    if (userDoc) {
        //console.log(userDoc)
        const passOk = bcrypt.compareSync(password, userDoc.password);
        if (passOk) {
            jwt.sign({ email: userDoc.email, id: userDoc._id }, jwtSecret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token).json(userDoc);
            })
        } else {
            res.status(422).json('pass not ok');
        }

    } else {
        res.json("not Found")
    }
})

app.get('/api/profile', (req, res) => {
    db.connect(process.env.MONGO_URL)
    const { token } = req.cookies;
    if (token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if (err) throw err;
            const { name, email, _id } = await User.findById(userData.id);
            res.json({ name, email, _id });
        })
    } else {
        res.json(null)
    }
})

app.post('/api/logout', (req, res) => {
    db.connect(process.env.MONGO_URL)
    res.cookie('token', '').json(true);
});

/*
app.post('/api/upload-by-link', async (req, res) => {
    const { link } = req.body
    const newName = 'photo' + Date.now() + '.jpg'
    await imageDownloader.image({
        url: link,
        dest: __dirname + '/uploads/' + newName
    })
    res.json(newName)
})
*/

app.post('/api/upload-by-link', async (req,res) => {
    const {link} = req.body;
    const newName = 'photo' + Date.now() + '.jpg';
    await imageDownloader.image({
      url: link,
      dest: '/tmp/' + newName,
    });
    const url = await uploadToS3('/tmp/' + newName, newName, mime.lookup('/tmp/' +newName));
    res.json(url);
  });

//这里创建了一个 multer 实例，配置了一个上传目录 dest 为 'uploads'。这意味着上传的文件将被暂时存放在服务器上名为 uploads 的文件夹中。

/*
const photosMiddleware = multer({ dest: 'uploads' })
app.post('/api/upload', photosMiddleware.array('photos', 100), (req, res) => {
    const uploadedFiles = [];
    for (let i = 0; i < req.files.length; i++) {
        const { path, originalname } = req.files[i]
        const parts = originalname.split('.')
        const ext = parts[parts.length - 1]
        const newPath = path + '.' + ext;
        fs.renameSync(path, newPath)
        uploadedFiles.push(newPath.replace('uploads/', ''))
    }
    res.json(uploadedFiles)
})
*/


const photosMiddleware = multer({ dest: '/tmp' })
app.post('/api/upload', photosMiddleware.array('photos', 100), async (req, res) => {
    const uploadedFiles = [];
    for (let i = 0; i < req.files.length; i++) {
        const { path, originalname, mimetype } = req.files[i]
        const url = await uploadToS3(path, originalname, mimetype)
        uploadedFiles.push(url)
    }
    res.json(uploadedFiles)
})

app.post('/api/places', (req, res) => {
    db.connect(process.env.MONGO_URL)
    const { token } = req.cookies
    const {
        title, address, addedPhotos, description,
        perks, extraInfo, checkIn, checkOut, maxGuests, price
    } = req.body;

    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const placeDoc = await Place.create({
            owner: userData.id,
            title, address, photos: addedPhotos, description,
            perks, extraInfo, checkIn, checkOut, maxGuests, price
        })
        res.json(placeDoc)
    });
})

app.get('/api/user-places', async (req, res) => {
    db.connect(process.env.MONGO_URL)
    const { token } = req.cookies
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const { id } = userData
        res.json(await Place.find({ owner: id }))
    });
})

app.get('/api/places', async (req, res) => {
    db.connect(process.env.MONGO_URL)
    res.json(await Place.find())
})

app.get('/api/places/:id', async (req, res) => {
    db.connect(process.env.MONGO_URL)
    const { id } = req.params
    res.json(await Place.findById(id));
})

app.put('/api/places/', async (req, res) => {
    db.connect(process.env.MONGO_URL)
    const { token } = req.cookies
    const {
        id, title, address, addedPhotos, description,
        perks, extraInfo, checkIn, checkOut, maxGuests, price
    } = req.body;

    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const placeDoc = await Place.findById(id)
        if (userData.id == placeDoc.owner.toString()) {
            placeDoc.set({
                title, address, photos: addedPhotos, description,
                perks, extraInfo, checkIn, checkOut, maxGuests, price
            })
            await placeDoc.save()
            res.json('ok')
        }
    })

});


app.post('/api/bookings', async (req, res) => {
    db.connect(process.env.MONGO_URL)
    const { place, checkIn, checkOut, numberOfGuests, name, phone } = req.body
    //console.log({place, checkIn, checkOut, numberOfGuests, name, phone})
    try {
        const userData = await getUserDataFromReq(req);
        const BookDoc = await Booking.create({
            place, checkIn, checkOut, numberOfGuests, name, phone, user: userData.id,
        })
        res.json(BookDoc)
    } catch (error) {
        throw error
    }

})


app.get('/api/bookings', async (req, res) => {
    db.connect(process.env.MONGO_URL)
    const userData = await getUserDataFromReq(req);
    res.json(await Booking.find({ user: userData.id }).populate('place'));
});




app.listen(4000);