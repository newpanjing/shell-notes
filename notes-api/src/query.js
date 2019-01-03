var mysql = require('mysql');

var pool = mysql.createPool({
    host: "mysql.oracle.com",
    port: 3306,
    database: "blog_dev",
    user: "myblog",
    password: "5rWEu98A"
});


exports.exec = function (sql, values, callback) {
    if (typeof (values) == 'function') {
        callback = values;
    }
    pool.getConnection(function (err, con) {
        if (err) {
            return callback(err, null);
        }
        con.query(sql, values, callback);
        con.release();
    });
}


// this.exec('select * from article_article',(err,rs)=>{
//     console.log(rs.length)
// })