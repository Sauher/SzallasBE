const express = require('express')
var cors = require('cors')

const app = express()

const tables = require('./modules/tables')
const logger = require('./utils/logger')

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/*app.get('/', (_req, res) => {
    res.send('Backend API by Bajai SZC Türr István Technikum - 13.A Szoftverfejlesztő')
})

app.get('/kategories', (req,res) =>{
  pool.query('SELECT * FROM kategoria', (error, results) =>{
    if (error) throw error;
    res.send(results)
  });
})

app.get('/trafic',(req,res) =>{
    pool.query('SELECT * FROM forgalom', (error,results) =>{
        if (error) throw error;
        res.send(results)
    })
})
*/

app.use('/uploads', express.static('uploads'))
app.use('/',tables)



app.listen(process.env.PORT, () => {
    logger.info(`Server is listening on http://localhost:${process.env.PORT}`)
});