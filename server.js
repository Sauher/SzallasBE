const express = require('express')
var cors = require('cors')

const app = express()

const tables = require('./modules/tables')
const logger = require('./utils/logger')

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


app.use('/uploads', express.static('uploads'))
app.use('/',tables)



app.listen(process.env.PORT, () => {
    logger.info(`Server is listening on http://localhost:${process.env.PORT}`)
});