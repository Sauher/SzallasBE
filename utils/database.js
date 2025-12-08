require('dotenv').config()
const nodemon = require('nodemon');
const logger = require('./logger')

console.log(process.env)
var mysql = require('mysql');


var pool  = mysql.createPool({
    multipleStatements: true,
    connectionLimit : 10,
    host            : process.env.DBHOST,
    user            : process.env.DBUSER,
    password        : process.env.DBPASS,
    database        : process.env.DBNAME
});


function query(sql, params = [], callback, req = ''){
    const start = Date.now()
    const ontext = req? `${req.method}/${req.originalUrl}` : "NO CONTEXT"
    const txt = req.method == "GET"? "sent":"affected"
    pool.query(sql, params, (error,results)=>{
      if(process.env.DEBUG_MODE == 1){
      const duration = Date.now() - start
      if(error){
        logger.error(`[DATABASE ERROR] -> ${error.message}`)
   
      }else{
        const count = Array.isArray(results) ? results.length : results.affectedRows;
        logger.verbose(`[${ontext}] - ${count} record(s) ${txt}. | ${duration} ms`)
      }}
      if(callback) callback(error, results);
    });
  }

module.exports = { query };
