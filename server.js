const express = require("express");
const bcrypt = require("bcrypt-nodejs");
const cors = require("cors");
const knex = require('knex');
const { createClient } = require('@supabase/supabase-js');
const serverless = require('serverless-http')



const db = createClient(
    'https://ijwibeepqrexuempwbyr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqd2liZWVwcXJleHVlbXB3YnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzU0MTQxOTgsImV4cCI6MTk5MDk5MDE5OH0.ISSxRrDg7wrf5402JXDyXJd7A9YpGtvXYMfqtAVksZo'
  )

// db.from('users').select('*')
// .then(data => console.log(data));


const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());
app.use(express.static(process.cwd()+"/facerecognition/build/"));
// --> res = this is working
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.get("/", (req, res) => {
    res.json('it is working')
})

app.get('/message', (req, res) => {
    res.json({ message: "Hello from server!" });

});



app.post("/signin", (req, res) => {

    const {email, password} = req.body;
    db.from ('login').select('*').eq("email", email)
    //.then(data => res.json(data))
    .then(data => {
        const isValid = bcrypt.compareSync(password, data.data[0].hash)
        if (isValid) {
            return db.from ('users').select('*')
                .eq ("email", email)
                .then(resp => res.json(resp.data[0]))
                //.then(resp => console.log(resp.data[0]))
                .catch(err => res.status(400).json("failed to get user"))
        } else {
            res.status(400).json("wrong credentials")
        }
    })
    .catch(err=>res.status(400).json({
        message: err.message,
        error: err
    }))
})

//register --> POST = user object
app.post("/register", (req, res) => {
    const {email, name, password} = req.body;
    const hash = bcrypt.hashSync(password);

    db.from('login')
    .insert({email: email, hash: hash })
    .select()
    .then(resp => {
        // console.log(resp)
        // const new_user = resp.data[0]
        // console.log(new_user)
        db.from('users')
         .insert({email: email, name: name, joined: new Date()})
         .select()
         .then(resp => res.json(resp.data[0]))
    })
    .catch(err => res.status(400).json("failed to register"))
 })

//profile/:userId --> GET = user
app.get("/profile/:id", (req,res) => {
    const {id} = req.params;
    db.select('*').from ('users').where ({id:id})
        .then(user => {
            if(user.length){
                res.json(user[0])
            } else {
                res.status(400).json("no such user")
             }
            })
        .catch(err => res.status(400).json("error getting user"))
    })


//image --> POST = updated user object

app.put("/image", (req, res) => {
    const {id} = req.body;
    db.from ('users').select('*').eq("id", id)
    .then(data => {
        const new_entries = data.data[0].entries + 1;   //increment
        if(new_entries > 0){
            db.from('users').update({entries: new_entries}).eq("id", id).select()
                .then(resp => res.json(resp.data[0]))
                .catch(err => res.status(400).json("failed to increment"))
        }else{
            res.status(400).json("failed to get entries")
        }
    })
    .catch(err => res.status(400).json("failed to get entries"))
})

app.listen(process.env.PORT || 2002, () => {
    console.log("app is running on port " + process.env.PORT)
})

app.use('/.netlify/functions/server', router)

module.exports.handler = serverless(app);
