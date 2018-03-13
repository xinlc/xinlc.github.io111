// Ajax 请求

var ajax = function (args) {
    var self = this;
    this.options = {
        type: 'GET',
        async: true,
        contentType: 'application/x-www-form-urlencoded',
        url: 'about:blank',
        data: null,
        success: {},
        error: {}
    };
    this.getXmlHttp = function () {
    var xmlHttp;
    try {
        xmlhttp = new XMLHttpRequest();
    }catch (e) {
        try {
            xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
        }catch (e) {
            xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
    }if (!xmlhttp) {
        alert('您的浏览器不支持AJAX');
        return false;
    }
        return xmlhttp;
    };
    this.send = function () {
    C.each(self.options, function (key, val) {
    self.options[key] = (args[key] == null) ? val : args[key];
    });
    var xmlHttp = new self.getXmlHttp();
    if (self.options.type.toUpperCase() == 'GET') {
        xmlHttp.open(self.options.type, self.options.url + (self.options.data == null ? "" : ((/[?]$/.test(self.options.url) ? '&' : '?') + self.options.data)), self.options.async);
    }else {
        xmlHttp.open(self.options.type, self.options.url, self.options.async);
        xmlHttp.setRequestHeader('Content-Length', self.options.data.length);
    }
        xmlHttp.setRequestHeader('Content-Type', self.options.contentType);
        xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4) {
        if (xmlHttp.status == 200 || xmlHttp.status == 0) {                    if (typeof self.options.success == 'function') self.options.success(xmlHttp.responseText);
            xmlHttp = null;
        }else {
        if (typeof self.options.error == 'function') 
        self.options.error('Server Status: ' + xmlHttp.status);
                }
            }
        };
        xmlHttp.send(self.options.type.toUpperCase() == 'POST' ? self.options.data.toString() : null);
    };
    this.send();
};