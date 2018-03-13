/***************原生对象工类方法****************/
/**
 * 判断非空
 * @param obj
 * @returns {boolean}
 */
function isEmpty(obj) {
  if (obj == undefined || obj == null || new String(obj).trim() == '') {
    return true;
  } else {
    return false;
  }
}
/**
 * 判断非空
 * @param obj
 * @returns {boolean}
 */
function isNotEmpty(obj) {
  return isEmpty(obj) ? false : true;
}
/**
 * 获取字符串真实长度 汉字算两位
 * @param str
 * @returns {number}
 */
var getRealLength = function (str) {
  return isEmpty(str) ? 0 : str.replace(/[^\x00-\xff]/g, "**").length;
}
var class2type = {}, toString = Object.prototype.toString;
(function () {
  var typeArr = "Boolean,Number,String,Function,Array,Date,RegExp,Object".split(",");
  for (var i = 0; i < typeArr.length; i++) {
    var name = typeArr[i];
    class2type["[object " + name + "]"] = name.toLowerCase();
  }
})()
/**
 * 判断参数类型
 * @param obj
 * @returns {string}
 */
function type(obj) {
  return obj == null ? String(obj) : class2type[toString.call(obj)] || "object";
}
/**
 * 判断参数是否为布尔类型
 * @param obj
 * @returns {boolean}
 */
function isBoolean(obj) {
  return isEmpty(obj) ? false : type(obj) === 'boolean';
}
/**
 * 判断参数是否为数字类型
 * @param obj
 * @returns {boolean}
 */
function isNumeric(obj) {
  return isEmpty(obj) ? false : type(obj) === 'number';
}
function isString(obj) {
  return isEmpty(obj) ? false : type(obj) === 'string';
}
function isFunction(obj) {
  return isEmpty(obj) ? false : type(obj) === 'function';
}
function isArray(obj) {
  return isEmpty(obj) ? false : type(obj) === 'array';
}
function isDate(obj) {
  return isEmpty(obj) ? false : type(obj) === 'date';
}
function isRegExp(obj) {
  return isEmpty(obj) ? false : type(obj) === 'regexp';
}
function isObject(obj) {
  return isEmpty(obj) ? false : type(obj) === 'object';
}

// 替换全部
String.prototype.replaceAll = function(s1, s2) {
    return this.replace(new RegExp(s1, "gm"), s2)
}

// 清除空格
String.prototype.trim = function() {
    var reExtraSpace = /^\s*(.*?)\s+$/;
    return this.replace(reExtraSpace, "$1")
}

// 清除左空格/右空格
function ltrim(s){ return s.replace( /^(\s*|　*)/, ""); } 
function rtrim(s){ return s.replace( /(\s*|　*)$/, ""); }


//判断是否以某个字符串开头
String.prototype.startWith = function (s) {
    return this.indexOf(s) == 0
}

// 判断是否以某个字符串结束
String.prototype.endWith = function (s) {
    var d = this.length - s.length;
    return (d >= 0 && this.lastIndexOf(s) == d)
}


// 字符串截取方法
String.prototype.getCharactersLen = function (charStr, cutCount) {
    if (charStr == null || charStr == '') 
    return '';        
    var totalCount = 0;        
    var newStr = '';        
    for (var i = 0; i < charStr.length; i++) {            
    var c = charStr.charCodeAt(i);            
    if (c < 255 && c > 0) {
        totalCount++;
    } else {
        totalCount += 2;
    } 
    if (totalCount >= cutCount) {
        newStr += charStr.charAt(i);
        break;
    }else {
        newStr += charStr.charAt(i);
        }
   }        
   return newStr;
}

function StringBuilder() {
    this.strings = new Array;
};
StringBuilder.prototype.append = function (str) {
    this.strings.push(str);
};
StringBuilder.prototype.toString = function () {
    return this.strings.join('');
};

//时间日期格式转换
Date.prototype.Format = function(formatStr) {
    var str = formatStr;
    var Week = ['日', '一', '二', '三', '四', '五', '六'];
    str = str.replace(/yyyy|YYYY/, this.getFullYear());
    str = str.replace(/yy|YY/, (this.getYear() % 100) > 9 ? (this.getYear() % 100).toString() : '0' + (this.getYear() % 100));
    str = str.replace(/MM/, (this.getMonth() + 1) > 9 ? (this.getMonth() + 1).toString() : '0' + (this.getMonth() + 1));
    str = str.replace(/M/g, (this.getMonth() + 1));
    str = str.replace(/w|W/g, Week[this.getDay()]);
    str = str.replace(/dd|DD/, this.getDate() > 9 ? this.getDate().toString() : '0' + this.getDate());
    str = str.replace(/d|D/g, this.getDate());
    str = str.replace(/hh|HH/, this.getHours() > 9 ? this.getHours().toString() : '0' + this.getHours());
    str = str.replace(/h|H/g, this.getHours());
    str = str.replace(/mm/, this.getMinutes() > 9 ? this.getMinutes().toString() : '0' + this.getMinutes());
    str = str.replace(/m/g, this.getMinutes());
    str = str.replace(/ss|SS/, this.getSeconds() > 9 ? this.getSeconds().toString() : '0' + this.getSeconds());
    str = str.replace(/s|S/g, this.getSeconds());
    return str
}