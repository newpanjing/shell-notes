const {ipcRenderer} = require('electron');
(function () {

    var app = new Vue({
        el: '#app',
        data: {},
        methods: {
            login: function () {
                ipcRenderer.send('pass');
                console.log('send')
            }
        }
    })
})();