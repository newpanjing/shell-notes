const {app, BrowserWindow, TouchBar, ipcMain, Menu, Tray, globalShortcut} = require('electron');
const {TouchBarLabel, TouchBarButton, TouchBarSpacer} = TouchBar
var path = require('path');
var os = require('os');
app.on('ready', () => {


    initLogin(() => initMain());

});

function initLogin(callback) {

    ipcMain.on('pass', (event, args) => {
        callback();
        loginWin.close();
    });

    var options = {
        width: 350,
        height: 500,
        frame: false,
        titleBarStyle: 'hiddenInset',
        resizable: false,
        maximizable: false,
        alwaysOnTop: true
    };

    let loginWin = new BrowserWindow(options);

    loginWin.loadFile('login.html')
    loginWin.setTouchBar(new TouchBar([
        new TouchBarButton({
            label: '退出',
            // backgroundColor: '#77ee36',
            click: () => {

            }
        }),
        new TouchBarButton({
            label: '登录',
            // backgroundColor: '#77ee36',
            click: () => {

            }
        })
    ]));
    loginWin.show();


}

function initMain() {

    var options = {
        width: 1200,
        height: 700,
        minHeight: 500,
        minWidth: 500,
        fullscreenWindowTitle: 'my-notes'
    };

    let platform = os.platform();

    //mac
    if (platform == 'darwin') {
        options.titleBarStyle = 'hiddenInset';
    } else {
        options.frame = false;

        //其他系统使用模拟的按钮
        //最小化
        ipcMain.on('minimize', (event, args) => {
            win.minimize();
        });

        //关闭
        ipcMain.on('close', (event, args) => {
            win.close()
        });

        //关闭
        ipcMain.on('maximize', (event, args) => {
            win.setFullScreen(!win.isFullScreen());
        });
    }
    let win = new BrowserWindow(options);

    win.loadFile('index.html')
    win.setTouchBar(createTouchBar());
    win.show();

    app.on('close', function () {
        win.close();
        win = null;
    });

    //最后一个窗口被关闭时退出应用
    app.on('window-all-closed', () => {
        app.quit()
    })


    ipcMain.on('registerKeyboard', (event, arg) => {
        //监听快捷键
        sender = event.sender;
        globalShortcut.register('CommandOrControl+S', () => event.sender.send('saveArticle'));
    });
}

var sender;


function createTouchBar() {

    ipcMain.on('setLabelBar', function (obj, text) {
        labelBar.label = text.toString();
    });

    const saveBtn = new TouchBarButton({
        label: '保存',
        // backgroundColor: '#77ee36',
        click: () => {
            sender.send('saveNote');
        }
    });

    const newBtn = new TouchBarButton({
        label: '新建',
        backgroundColor: '#417fee',
        click: () => {
            sender.send('newNote');
        }
    });

    const delBtn = new TouchBarButton({
        label: '删除',
        backgroundColor: '#dd4936',
        click: () => {
            sender.send('delNote');
        }
    });

    const labelBar = new TouchBarLabel({
        label: ''
    });

    const touchBar = new TouchBar([
        saveBtn,
        newBtn,
        delBtn,
        labelBar
    ])

    return touchBar;
}