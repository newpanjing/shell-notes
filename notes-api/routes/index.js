var express = require('express');
var router = express.Router();
var query = require('../src/query');


const oss = require('ali-oss');
/**
 *
 *  path('v1/api/category', api_views.query_category),
 path('v1/api/article/save', api_views.save_article),
 path('v1/api/article/detail/<sid>', api_views.get_article_detial),
 path('v1/api/article/<alias>', api_views.get_article),

 */
var uuid = require('uuid');

var shortArray = ["a", "b", "c", "d", "e", "f",
    "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s",
    "t", "u", "v", "w", "x", "y", "z", "0", "1", "2", "3", "4", "5",
    "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I",
    "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V",
    "W", "X", "Y", "Z"]

function getShortId() {

    var uid = uuid.v4();
    uid = uid.replace(/-/g, "");
    var buffer = [];

    for (var i = 0; i < 8; i++) {
        let start = i * 4
        let end = i * 4 + 4
        var str = uid.substring(start, end);
        buffer.push(shortArray[parseInt(str, 16) % 62])
    }
    return buffer.join("");
}

function update(obj, callback) {

    let sql = `update article_article set `;

    var strs = [];
    var values = [];
    for (var i in obj) {
        if (i == 'id') {
            continue;
        }
        strs.push(`${i}=?`);
        values.push(obj[i]);
    }
    sql += strs.join(',');
    sql += ` where id=?`;
    values.push(obj.id);
    query.exec(sql, values, callback);
}


function save(obj, callback) {

    var strs = [];
    var strs2 = [];
    var values = [];
    for (var i in obj) {
        if (i == 'id') {
            continue;
        }
        strs.push(`${i}`);
        strs2.push('?');
        values.push(obj[i]);
    }


    query.exec(`insert into article_article(${strs.join(",")})values(${strs2.join(",")})`, values, function (err, rs) {
        if (!err) {
            query.exec('SELECT LAST_INSERT_ID() as id;', callback)
        } else {
            callback(err, rs);
        }
    });
}

/**
 * 分类
 */
router.post('/category', function (req, res, next) {
    query.exec('select id,name,alias from article_category order by sort asc', (err, rs) => {
        console.error(err);
        return res.json(rs);
    });
});


function getArticleList(req, res, next) {
    var alias = req.params.alias;

    var values = [];
    let sql = `select id,category_id,title,createDate,image,sid from article_article`;

    if (alias) {

        query.exec('select id from article_category where alias=?', [alias], (err, rs) => {

            if (!err && rs && rs.length != 0) {

                sql += ` where category_id=?`
                values.push(rs[0].id);
                sql += ` order by id desc`;
                exec();
            } else {
                res.json({success: false, msg: err})
            }
        });

    } else {

        sql += ` order by id desc`;
        exec();
    }

    function exec() {

        query.exec(sql, values, (err, rs) => {
            console.error(err);
            return res.json(rs);
        });
    }
}

function getArticleDetail(req, res, next) {
    var id = req.params.id;
    let sql = `select id,title,content,createDate,image,sid from article_article where id='${id}'`;

    query.exec(sql, (err, rs) => {

        if (err) {
            res.json({
                success: false,
                msg: err
            })
        } else {
            rs[0].success = true;
            res.json(rs[0]);
        }
    });
}

function saveArticle(req, res, next) {

    console.log(req.body)
    if (req.body.id) {
        update(req.body, function (err, rs) {

            var rs = {
                success: true
            };

            if (err) {
                rs.msg = err;
                rs.success = false;
            }

            res.json(rs);

        });
    } else {
        var body = req.body;
        body.sid = getShortId();
        body.hits = 0;
        body.createDate = new Date();
        body.subject = body.content;
        body.top = 0;

        var temp = body.content.replace(/\r|\n|\t/g, "");

        if (temp > 200) {
            body.subject = temp.substring(0, 200);
        }
        save(body, function (err, result) {
            var rs = {
                success: true
            };
            if (result && result.length != 0) {
                rs.id = result[0].id;
            }


            if (err) {
                rs.msg = err;
                rs.success = false;
            }

            res.json(rs);

        });
    }
}

function deleteArticle(req, res, next) {
    var id = req.params.id;
    var sql = `delete from article_article where id=?`;
    query.exec(sql, [id], function (err, rs) {

        var rs = {
            success: true
        };

        if (err) {
            rs.msg = err;
            rs.success = false;
        }

        res.json(rs);
    });
}

function getConfig(callback) {
    query.exec(`select \`key\`,\`value\` from models_config where \`group\`='oss'`, function (err, rs) {

        var config = {};
        if (rs && rs.length != 0) {
            rs.forEach(i => {
                config[i.key] = i.value;
            });
        }
        callback(err, config);
    });
}

function uploadFile(req, res, next) {

    console.log(req.files)

    //查询相关配置

    var result = {
        success: 0,           // 0 表示上传失败，1 表示上传成功
        message: "",
        url: "https://f12.baidu.com/it/u=838507082,4275241509&fm=76"        // 上传成功时才返回
    };

    var name = req.body.name;
    var buffer = Buffer.from(req.body.data, 'base64');

    var suffix = ".png";

    var index = name.lastIndexOf(".");
    if (index != -1) {
        suffix = name.substring(index);
    }

    var filename = getShortId() + suffix;



    //调用sdk上传
    getConfig(function (err, config) {
            if (err) {
                result.message = '服务器读取配置报错请稍后再试。'
                res.json(result);
            } else {
                //准备上传
                const store = oss({
                    accessKeyId: config.key,
                    accessKeySecret: config.secret,
                    bucket: config.bucket,
                    endpoint: config.endpoint,
                    // region: ''
                });
                var url = config.cname + "/" + filename+"?webp";

                store.put(filename, buffer).then((result) => {
                    if (result.res.statusCode == 200) {
                        result.url = url;
                        res.json(result);
                    }
                });

            }

        }
    );


}

//保存
router.post('/article/save', saveArticle);
router.post('/article/delete/:id', deleteArticle);

/**
 * 获取文章
 */
router.post('/article/', getArticleList);
router.post('/article/:alias', getArticleList);

//详情
router.post('/article/detail/:id', getArticleDetail);

//upload file
router.post('/upload', uploadFile);


module.exports = router;
