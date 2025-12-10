const express = require('express')
const router = express.Router();
const {query}  = require('../utils/database'    )
const logger = require('../utils/logger')
var SHA1 = require("crypto-js/sha1");
const passwdRegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const path = require('path')
const fs = require('fs');
const { error } = require('console');
const nodemailer = require('nodemailer')
const ejs = require('ejs')


var transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
});




const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const ext = path.extname(file.originalname)
      cb(null, file.fieldname + '-' + uniqueSuffix + ext) 
      
    }
  })
  
const updload = multer({
    storage:storage
    
});

// Select all from: table
router.get('/:table',(req,res)=>{
    const table = req.params.table;
    query(`SELECT * FROM ${table}`, [], (error, results) =>{
        if (error) throw res.status(500).json({error:error.message});
        res.status(200).json(results)
    }, req);
})

// Select one record from table by : id
router.get('/:table/:id',(req,res)=>{
    const table = req.params.table;
    const id = req.params.id
    query(`SELECT * FROM ${table} WHERE id=?`, [id], (error, results) =>{
        if (error) throw res.status(500).json({error:error.message});
        res.status(200).json(results)
    }, req);
})

// Select one pizza with user_Id
router.get('/:table/:column/:id',(req,res)=>{
    const table = req.params.table;
    const column = req.params.column
    const order_id = req.params.id
    //SELECT pizza_id FROM `order_items` WHERE  order_id = 4
    query(`SELECT ${column} FROM ${table} WHERE order_id=?`, [order_id], (error, results) =>{
        if (error) throw res.status(500).json({error:error.message});
        res.status(200).json(results)
    }, req);
})

//SELECT RECORDS FROM TABLE by field
router.get('/:table/:field/:op/:value', (req, res) => {
    let table = req.params.table;
    let field = req.params.field;
    let op = getOP(req.params.op);
    let value = req.params.value;
 
    if (req.params.op == 'lk') {
        value = `%${value}%`;
    }
 
    query(`SELECT * FROM ${table} WHERE ${field}${op}?`, [value], (error, results) => {
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(results);
    }, req);
 
});


//SEND EMAIL
router.post('/sendmail',async (req,res)=>{
    const {to,subject,template, data} = req.body;
    if(!to || !subject || !template){
        return res.status(400).send({error: "Hiányzó adatok!"})
    }
    try{
        await transporter.sendMail({
            from: process.env.ADMINMAIL,
            to: to,
            subject: subject,
            html: await renderTemplate(template,data || {})
        })

        return res.status(200).send({message: 'Az email küldése sikeres!'});
    }
    catch(err)
    {
        console.log(err)
        return res.status(500).send({error: "Hiba az email küldéssel! "})
    }
})
//SEND EMAIL TO ADMIN
router.post('/contact',async (req,res)=>{
    const {name, email, message, subject} = req.body;
    if(!name || !email || !message || !subject){
        return res.status(400).send({error: "Hiányzó adatok!"})
    }
    try{
        await transporter.sendMail({
            from: email,
            to: SMTP_USER,
            subject: `${subject}`,
            html: `
                <h2>Szállás</h2>
                <p><strong>Feladó:</strong> ${name}</p>
                <p><strong>Üzenet:</strong></p>
                <p>${message}</p>
            `
        })

        return res.status(200).send({message: 'Az email küldése sikeres!'});
    }
    catch(err)
    {
        console.log(err)
        return res.status(500).send({error: "Hiba az email küldéssel! "})
    }
})

//FILE UPLOAD
router.post('/upload', upload.single('image'),(req,res) => {
    if(!req.file){
        return res.status(200).json({error:'Nincs fájl feltöltve!'})
    }
    res.status(200).json({
        message:'Fájl feltöltve! - ',
        filename: req.file.filename,
        path:'/uploads'
    })
})

//LOGIN
router.post('/:table/login',(req,res)=>{
    let { email, password } = req.body;
    let table = req.params.table

    if(!email || !password){
        res.status(404).send({error:'Hiányzó adatok!'})
        return;
    }

    query(`SELECT * FROM ${table} WHERE email=? AND password = ?`, [email,SHA1(password).toString()], (error, results) =>{
        if (error) throw res.status(500).json({error:error.message});
        if(results.length == 0){
            res.status(400).send({error: 'Hibás belépési adatok!'})
            return;
        }
        if(results[0].status == 1){
            res.status(400).send({error: 'Inaktív felhasználó!'})
            return
        }
        res.status(200).json(results)
    }, req);
})

//REGISTTRATION
router.post('/:table/registration',(req,res)=>{
    let table = req.params.table;
    let { name, email,password, confirm,phone, address} = req.body;
    console.log(req.body)

    if(!name || !email || !password || !confirm){
        res.status(400).send({error:'Hiányzó adatok!'});
        return;
    }

    if(password != confirm){
        res.status(400).send({error: 'A két jelszó nem egyezik!'});
        return
    }

    if(!password.match(passwdRegExp)){
        res.status(400).send({error: 'A jelszó nem elég biztonságos'});
        return
    }

    query(`SELECT id FROM ${table} WHERE email=?`,[email],(error,results)=>{
        if(error) return res.status(500).json({error:error.message});
        if(results.length != 0){
            res.status(400).send({error: 'A megadott email cím már regisztrálva van'});
            return
        }
        
        query(`INSERT INTO ${table} (name, email, password,role,phone,address) VALUES (?,?,?,'user',?,?)`, [name,email,SHA1(password).toString(),phone,address], (error, results) =>{
            if (error) return res.status(500).json({error:error.message});
            res.status(200).json(results)
        }, req);

    },req)
})

// Add new record to table
router.post('/:table',(req,res)=>{
    let table = req.params.table;
    let fields = Object.keys(req.body).join(',');
    let values = "'" + Object.values(req.body).join("','") + "'";
    query(`INSERT INTO ${table} (${fields}) VALUES (${values})`, [], (error, results) =>{
        if (error) throw res.status(500).json({error:error.message});
        res.status(200).json(results)
    }, req);
})


// Update records in table
router.patch('/:table/:id',(req,res)=>{
    let table = req.params.table;
    let id = req.params.id;
    let fields = Object.keys(req.body);
    let values = Object.values(req.body)
    
    let updates = [];
    for(let i = 0 ; i < fields.length; i++){
        updates.push(`${fields[i]} = '${values[i]}'`)
    }
    let str = updates.join(',');

    query(`UPDATE ${table} SET ${str} WHERE id=?`, [id], (error, results) =>{
        if (error) throw res.status(500).json({error:error.message});
        res.status(200).json(results)
    }, req);
})

//DELETE UPLOADED FILE
router.delete('/image/:filename',(req,res) => {
    let filename = req.params.filename;
    let path = path.join(__dirname,'/uploads/');

    fs.unlink(path + filename, (err) => {
        if(err){
            return res.status(500).json({error: 'A fájl törlése sikertelen!'})
        }
        return res.status(200).json({message:'A kép törölve!'})
    })
})



// DELETE one record from table by : id
router.delete('/:table/:id',(req,res)=>{
    const table = req.params.table;
    const id = req.params.id
    query(`DELETE FROM ${table} WHERE id=?`, [id], (error, results) =>{
        if (error) throw res.status(500).json({error:error.message});
        res.status(200).json(results)
    }, req);
})
router.delete('/:table/:field/:op/:value', (req, res) => {
    let table = req.params.table;
    let field = req.params.field;
    let op = getOP(req.params.op);
    let value = req.params.value;
 
    if (req.params.op == 'lk') {
        value = `%${value}%`;
    }
 
    query(`DELETE FROM ${table} WHERE ${field}${op}?`, [value], (error, results) => {
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(results);
    }, req);
 
});




function getOP(op){
    switch(op){
        case 'eq': {
            op = '=';
            break;
        }
        case 'lt': {
            op = '<';
            break;
        }
        case 'lte': {
            op = '<=';
            break;
        }
        case 'gt': {
            op = '>';
            break;
        }
        case 'gte': {
            op = '>=';
            break;
        }
        case 'not': {
            op = '<>';
            break;
        }
        case 'lk': {
            op = ' like ';
            break;
        }
    }
    return op;
}


async function renderTemplate(templateName, data){
    const tmpfile = path.join(__dirname,"..","templates",templateName + ".ejs")
    return await ejs.renderFile(tmpfile,data)
}
module.exports = router;