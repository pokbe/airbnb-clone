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
const multer = require('multer')
const fs = require('fs')

const app = express()
const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'haidenairbnbresult12123';

app.use(express.json());
app.use(cookieParser());
app.use('/api/uploads', express.static(__dirname + '/uploads'))
app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173',
}));
db.connect()

app.get('/api/test', (req, res) => {
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
    res.cookie('token', '').json(true);
});


app.post('/api/upload-by-link', async (req, res) => {
    const { link } = req.body
    const newName = 'photo' + Date.now() + '.jpg'
    await imageDownloader.image({
        url: link,
        dest: __dirname + '/uploads/' + newName
    })
    res.json(newName)
})

//这里创建了一个 multer 实例，配置了一个上传目录 dest 为 'uploads'。这意味着上传的文件将被暂时存放在服务器上名为 uploads 的文件夹中。
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

app.post('/api/places', (req, res) => {
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
    const { token } = req.cookies
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const { id } = userData
        res.json(await Place.find({ owner: id }))
    });
})

app.get('/api/places', async (req, res) => {
    res.json(await Place.find())
})

app.get('/api/places/:id', async (req, res) => {
    const { id } = req.params
    res.json(await Place.findById(id));
})

app.put('/api/places/', async (req, res) => {
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
    const userData = await getUserDataFromReq(req);
    res.json(await Booking.find({ user: userData.id }).populate('place'));
});




app.listen(4000);