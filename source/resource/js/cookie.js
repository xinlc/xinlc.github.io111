// JS 写Cookie
function setCookie(name, value, expires, path, domain) {
    if (!expires) 
    expires = -1;
    if (!path) 
    path = "/";
    var d = "" + name + "=" + value;
    var e;
    if (expires < 0) {
        e = "";
    }else if (expires == 0) {
        var f = new Date(1970, 1, 1);
        e = ";expires=" + f.toUTCString();
    }else {
        var now = new Date();
        var f = new Date(now.getTime() + expires * 1000);
        e = ";expires=" + f.toUTCString();
    }
    var dm;
    if (!domain) {
        dm = "";
    }else {
        dm = ";domain=" + domain;
    }
    document.cookie = name + "=" + value + ";path=" + path + e + dm;
};

// JS 读Cookie
function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) {
            return decodeURIComponent(c.substring(nameEQ.length, c.length))
        }
    } 
    return null
}