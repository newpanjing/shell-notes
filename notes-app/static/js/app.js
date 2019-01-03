const {ipcRenderer} = require('electron');
var os = require('os');
(function () {

    Date.prototype.format = function (fmt) { //author: meizz
        var o = {
            "M+": this.getMonth() + 1,                 //月份
            "d+": this.getDate(),                    //日
            "h+": this.getHours(),                   //小时
            "m+": this.getMinutes(),                 //分
            "s+": this.getSeconds(),                 //秒
            "q+": Math.floor((this.getMonth() + 3) / 3), //季度
            "S": this.getMilliseconds()             //毫秒
        };
        if (/(y+)/.test(fmt))
            fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt))
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    }

    var basePath = 'http://127.0.0.1:3000/v1/api';

    function uploadFile(file, callback) {
        var fr = new FileReader();
        fr.onload=function (e) {
            var base64 = e.target.result.replace("data:image/jpeg;base64,","");
            var params = {
                name: file.name,
                data: base64
            };

            post('/upload', params, callback);
        }
        fr.readAsDataURL(file);


    }

    var isFullScreen = false;

    //保存快捷键
    ipcRenderer.send('registerKeyboard');
    ipcRenderer.on('saveArticle', () => app.saveArticle());
    ipcRenderer.on('newNote', () => app.newNote());
    ipcRenderer.on('delNote', () => app.delNote());
    ipcRenderer.on('saveNote', () => app.saveArticle());

    var app = new Vue({
        el: '#main',
        created: function () {

            post('/category', (err, data) => {

                if (err) {
                    alert('无法连接到服务器，请检查网络连接或稍后再试。');
                    return;
                }

                data.forEach(d => {
                    d.active = false;
                    d.loading = false;
                    d.error = false;
                    d.msg = '';
                });
                app.categorys = data;

                app.categorys.unshift({
                    name: '全部',
                    alias: ''
                });

                app.selectedMenu = app.categorys[0];
                if (app.categorys.length > 0) {
                    app.categorys[0].active = true;
                    loadArticles(app.categorys[0]);
                }
            });
            setTimeout(function () {
                var editor = editormd("editor", {
                    id: 'editor',
                    syncScrolling: "single",
                    path: "./lib/editor.md-1.5.0/lib/",
                    disabledKeyMaps: [
                        "Ctrl-B", "F11", "F10"  // disable some default keyboard shortcuts handle
                    ],
                    imageUpload: true,
                    imageFormats: ["jpg", "jpeg", "gif", "png", "bmp", "webp"],
                    imageUploadURL: basePath + "/upload",
                    emoji: true,
                    toolbarIcons: function () {
                        return ['input', 'code-block', 'hr', '|', 'link', 'upload', '|', 'watch', 'preview', 'save']
                    },
                    toolbarIconsClass: {
                        upload: 'fa-picture-o'
                    },
                    toolbarCustomIcons: {
                        input: '<div class="input-box"><div class="title-input" placeholder="标题" contenteditable="true" max-length="10"></div></div>',
                        save: '<a href="javascript:;" class="btn save-btn" onclick="app.saveArticle(this)"><span style="display: none" class="fas fa-spinner rotating"></span>保存</a>',
                    },
                    lang: {
                        toolbar: {
                            save: "保存",
                            upload: '上传图片'
                        }
                    },
                    toolbarHandlers: {
                        upload: function (cm, icon, cursor, selection) {
                            $("#file").trigger('click');

                            $("#file").off('change').on('change', function () {
                                var file = this.files[0];
                                uploadFile(file, function (err, rs) {

                                    editor.insertValue(`![](${rs.url})`);
                                });
                            });
                        }
                    },
                    onload: function () {

                        //ipcRenderer.send('setLabelBar', item.title);
                        $(".title-input").keyup(function () {
                            var val = $(this).text();
                            app.selectedItem.title = val;
                            ipcRenderer.send('setLabelBar', val);
                        });
                        change();

                    }
                });
                window.editor = editor;


            }, 100);

        },
        data: {
            height: 100,
            width: 100,
            menuWidth: 100,
            listWidth: 300,
            headTitleWidth: 43,
            version: 'v.1.0.0',
            noDarwin: os.platform() != 'darwin',
            menus: [{
                name: '文章',
                icon: 'fa-newspaper',
                active: true
            }, {
                name: '通知',
                icon: 'fa-bell',
                active: false
            }, {
                name: '帮助',
                icon: 'fa-question',
                active: false
            }],
            categorys: [],
            articles: [],
            value: '123',
            title: '',
            selectedItem: null,
            selectedMenu: {},
            popup: {
                x: 0,
                y: 0,
                show: false,
                items: []
            },
            searchInput: '',
            saveing: false,
            articleLoading: false
        },
        methods: {
            btnMin: function () {
                ipcRenderer.send('minimize');
            },
            btnClose: function () {
                ipcRenderer.send('close');
            },
            btnFull: function () {
                ipcRenderer.send('maximize');

            },
            menuHandler: function (menu) {
                app.menus.forEach(item => {
                    item.active = false;
                });
                menu.active = true;
            },
            selectCategory: function (item) {
                app.categorys.forEach(node => {
                    node.active = false;
                });
                item.active = true;
                app.selectedMenu = item;
                loadArticles(item);
            }, selectArticle: function (item) {
                ipcRenderer.send('setLabelBar', item.title);

                app.articles.forEach(node => node.active = false);
                item.active = true;
                app.selectedItem = item;

                item.error = false;
                item.loading = true;
                if (item.id) {
                    post(`/article/detail/${item.id}`, (err, data) => {
                        item.loading = false;
                        if (err) {
                            item.error = true;
                            item.msg = err;
                        }
                        $(".title-input").text(item.title);
                        //加载详情
                        editor.setValue(data.content);
                    });
                } else {
                    $(".title-input").text(item.title);
                    editor.setValue('');
                    item.loading = false;
                }
            }, showCategoryMenu: function (event, item) {
                showMenu(event.clientX, event.clientY, [{
                    text: '重命名',
                    handler: function () {

                    }
                }]);
            }, showArticleMenu: function (event, item) {
                app.selectArticle(item);

                var items = [{
                    text: '删除',
                    handler: function () {
                        app.delNote(item);
                    }
                }, {
                    split: true
                }
                    // , {
                    //     text: '置顶',
                    //     handler: function () {
                    //         console.log(item)
                    //     }
                    // }
                    , {
                        text: '刷新',
                        handler: function () {
                            loadArticles(app.selectedMenu);
                        }
                    }];
                showMenu(event.clientX, event.clientY, items);

            },
            searchHandler: function (e) {
                var val = app.searchInput;
                if (val.replace(/ /g, "").length == 0) {
                    app.articles.forEach(item => item.show = true);
                    return;
                }

                var keywords = val.split(" ");
                app.articles.forEach(item => {

                    var successful = false;
                    for (var i = 0; i < keywords.length; i++) {
                        var k = keywords[i];
                        if (item.title.toLowerCase().indexOf(k.toLowerCase()) != -1) {
                            successful = true;
                            break;
                        }
                    }
                    item.show = successful;

                });

            },
            delNote: function (item) {
                if (!item) {
                    app.articles.forEach(note => {
                        if (note.active) {
                            item = note;
                        }
                    });
                }

                if (!item) {
                    return showToast('请选择要删除的文章');
                }

                if (confirm('确定删除吗？')) {
                    item.show = false;
                    if (item.id) {
                        post('/article/delete/' + item.id, function (err, rs) {
                            if (!err && rs.success) {
                                showToast('删除成功。');
                            } else {
                                showToast('删除失败，请稍后再试。');
                            }
                        });
                    } else {
                        showToast('删除成功。');
                    }
                }
            },
            newNote: function () {
                app.articles.unshift({
                    active: true,
                    category_id: app.selectedMenu.id,
                    error: false,
                    image: "",
                    loading: false,
                    msg: "",
                    show: true,
                    title: "新文章"
                });
                app.selectArticle(app.articles[0]);
            },
            saveArticle: function (obj) {
                //保存文章
                //条件判断
                if (!app.selectedItem) {
                    return;
                }
                //请求
                if (!obj) {
                    obj = $(".save-btn");
                }

                $(obj).find('.rotating').fadeIn();
                app.selectedItem.content = editor.getValue();
                var item = app.selectedItem;
                var data = {
                    id: item.id,
                    content: item.content,
                    title: item.title
                }
                item.loading = true;
                post('/article/save', data, function (err, data) {
                    item.loading = false;
                    $(obj).find('.rotating').fadeOut();
                    if (err || !data.success) {
                        item.error = true;
                        item.msg = err || data.msg;
                        showToast('保存出错请稍后再试！');
                    } else {
                        if (data.id) {
                            item.id = data.id;
                        }
                        showToast('保存成功！');
                    }

                });
            }
        }

    });

    function showMenu(x, y, items) {
        app.popup.x = x;
        app.popup.y = y;
        app.popup.items = items;
        app.popup.show = true;
    }

    function loadArticles(item) {
        //加载文章列表
        item.loading = true;
        item.error = false;
        post(`/article/${item.alias}`, (err, data) => {
            if (data) {
                data.forEach(item => {
                    item.active = false;
                    if (item.createDate) {
                        item.createDate = new Date(item.createDate).format('MM-dd hh:mm');
                    }
                    item.show = true;
                    item.loading = false;
                    item.error = false;
                    item.msg = '';
                })


                // app.selectArticle(data[0]);
                app.articles = data;
            } else {
                app.articles = []
                item.error = true;
                item.msg = err;
            }
            item.loading = false;
            item.active = true;
            //TODO 如果是新文章，不做自动加载

        });
    }

    var change = () => {
        var width = document.documentElement.clientWidth || document.body.clientWidth;
        var height = document.documentElement.clientHeight || document.body.clientHeight;

        app.height = height;
        app.width = width - app.menuWidth - app.listWidth - 2;

        var inputWidth = app.width - 320;
        if (inputWidth < 200) {
            inputWidth = 200;
        }
        $(".input-box").css({width: inputWidth})


    }

    window.onresize = change;
    window.onload = change;


    window.app = app;

    function post(url, data, callback) {
        if (typeof (data) == 'function') {
            callback = data;
            data = null;
        }

        try {
            $.post(basePath + url, data, function (data) {
                callback(null, data);
            }).error(function (error) {
                console.log('error', error)
                callback(error, null)
            });
        } catch (e) {
            console.log(e)
        }
    }


    var t;

    function showToast(msg, timeout) {
        if (t) {
            window.clearTimeout(t);
        }
        if (!timeout) {
            timeout = 2000;
        }
        $(".toast").text(msg).fadeIn();

        t = setTimeout(() => $(".toast").fadeOut(), timeout);

    }
})();
