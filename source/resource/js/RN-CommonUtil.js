/**
 * 通用工具类
 * Created by tomyli on 16/5/6.
 */


import { Alert } from 'react-native';
import { Actions } from 'react-native-router-flux';
import BaseConfig from '../Config/BaseConfig';
import CssUtil from './CssUtil';
import { realm } from '../Model/Schema';
import Utils from './Utils';
import RNRongIM from '../native/RNRongIM';  // eslint-disable-line

const filterUnauthorizedPage = ['login', 'register', 'forgetpassword'];

const CommonUtil = {
  // post请求
  post(url, data, onSuccess, onError) {
    const users = realm.objects('User');

    const fetchOptions = {
      method: 'POST',
      headers: {
        Accept: 'application/json,text/plain',
        'Content-Type': 'application/json',
        Token: users.length ? users[0].Token : ''
      },
      body: JSON.stringify(data)
    };

    return this.request(url, fetchOptions, onSuccess, onError);
  },

  // get请求
  get(url, onSuccess, onError) {
    const users = realm.objects('User');

    const fetchOptions = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Token: users.length ? users[0].Token : ''
      }
    };
    // console.info('Components.CommonUtil.get.onError',onError);
    return this.request(url, fetchOptions, onSuccess, onError);
  },

  // put请求
  put(url, data, onSuccess, onError) {
    const users = realm.objects('User');

    const fetchOptions = {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Token: users.length ? users[0].Token : ''
      },
      body: JSON.stringify(data)
    };

    return this.request(url, fetchOptions, onSuccess, onError);
  },

  delete(url, onSuccess, onError) {
    const users = realm.objects('User');

    const fetchOptions = {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Token: users.length ? users[0].Token : ''
      }
    };

    // XLC：没明白为什么没有body
    if (arguments.length == 4) {
      const data = arguments[1];
      onSuccess = arguments[2];
      onError = arguments[3];
      fetchOptions.body = JSON.stringify(data);
    }

    return this.request(url, fetchOptions, onSuccess, onError);
  },

  request(url, fetchOptions, onSuccess = Function, onError) {
    console.info('CommonUtil.request.fetchOptions', url, fetchOptions);
    let status = null;
    let defaultOnError = null;
    if (!onError) {
      defaultOnError = function () {
      };
      onError = defaultOnError;
    }
    return new Promise(function (resolve, reject) {
      this.timeout(BaseConfig.timeoutMS, fetch(url, fetchOptions))
      .then((response) => {
        status = response.status;
        return response.text();
      })
      .then((responseText) => {
        // console.info('Components.CommonUtil.responseText', responseText);
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.info('Components.CommonUtil.request', responseText);
          // status = 202;
          data = {
            code: status,
            msg: BaseConfig.serverMessage
          };
        }
        if ([200, 201, 301, 304].includes(status)) {
          resolve(data);
          onSuccess(data);
        } else if (data.code == BaseConfig.HttpCode.unauthorized) {  // 未经授权访问
          if (!filterUnauthorizedPage.includes(Utils.Scene.getCurrentSceneName())) {
            console.log('您的登录状态已失效或在别处登录，请重新登录。', data, url, fetchOptions);

            RNRongIM.disconnect();   // token失效断开融云链接
            CommonUtil.showMsg('提示', '您的登录状态已失效或在别处登录，请重新登录。');
            Actions.login({ isUnauthorized: true });
          }
        } else {
          console.info('Components.CommonUtil.request.error', data);
          reject(data);
          onError(data);
        }
      }).catch((error) => {
        if (error.message == 'timeout' || error.message == 'Network request failed') {
          const clientData = {
            code: 408,
            msg: BaseConfig.timeoutMessage
          };
          reject(error);
          if (onError === defaultOnError) {
            Utils.toast(clientData.msg);
          } else {
            onError(clientData);
          }
        }
      }
    );
    }.bind(this));
  },

  timeout(ms, promise) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('timeout'));
      }, ms);
      promise.then(resolve, reject);
    });
  },

  showMsg(title, msg) {
    Alert.alert(title, msg);
  },

  showAlertMsg(msg) {
    this.showMsg('提示', msg);
  },

  log(data) {
    console.log(data);
  },

  logObj(obj) {
    for (const i in obj) {
      if (obj.hasOwnProperty(i)) {  // eslint-disable-line
        console.log(i);
        console.log(obj[i]);
      }
    }
  },
  /* eslint-disable */
  add(arg1, arg2) {
    arg1 = arg1.toString(), arg2 = arg2.toString();
    let arg1Arr = arg1.split('.'),
      arg2Arr = arg2.split('.'),
      d1 = arg1Arr.length == 2 ? arg1Arr[1] : '',
      d2 = arg2Arr.length == 2 ? arg2Arr[1] : '';
    const maxLen = Math.max(d1.length, d2.length);
    const m = Math.pow(10, maxLen);
    const result = Number(((arg1 * m + arg2 * m) / m).toFixed(maxLen));
    const d = arguments[2];
    return typeof d === 'number' ? Number((result).toFixed(d)) : result;
  },
  /*
   函数：减法函数，用来得到精确的减法结果
   说明：函数返回较为精确的减法结果。
   参数：arg1：第一个加数；arg2第二个加数；d要保留的小数位数（可以不传此参数，如果不传则不处理小数位数
   返回值：两数相减的结果
   */
  sub(arg1, arg2) {
    return Calc.Add(arg1, -Number(arg2), arguments[2]);
  },
  /*
   函数：乘法函数，用来得到精确的乘法结果
   说明：函数返回较为精确的乘法结果。
   参数：arg1：第一个乘数；arg2第二个乘数；d要保留的小数位数（可以不传此参数，如果不传则不处理小数位数)
   返回值：两数相乘的结果
   */
  mul(arg1, arg2) {
    let r1 = arg1.toString(),
      r2 = arg2.toString(),
      m,
      resultVal,
      d = arguments[2];
    m = (r1.split('.')[1] ? r1.split('.')[1].length : 0) + (r2.split('.')[1] ? r2.split('.')[1].length : 0);
    resultVal = Number(r1.replace('.', '')) * Number(r2.replace('.', '')) / Math.pow(10, m);
    return typeof d !== 'number' ? Number(resultVal) : Number(resultVal.toFixed(parseInt(d)));
  },
  /*
   函数：除法函数，用来得到精确的除法结果
   说明：函数返回较为精确的除法结果。
   参数：arg1：除数；arg2被除数；d要保留的小数位数（可以不传此参数，如果不传则不处理小数位数)
   返回值：arg1除于arg2的结果
   */
  div(arg1, arg2) {
    let r1 = arg1.toString(),
      r2 = arg2.toString(),
      m,
      resultVal,
      d = arguments[2];
    m = (r2.split('.')[1] ? r2.split('.')[1].length : 0) - (r1.split('.')[1] ? r1.split('.')[1].length : 0);
    resultVal = Number(r1.replace('.', '')) / Number(r2.replace('.', '')) * Math.pow(10, m);
    return typeof d !== 'number' ? Number(resultVal) : Number(resultVal.toFixed(parseInt(d)));
  },

  getCountByWidth(width) {
    return Math.floor(CssUtil.size.width / width);
  },

  getByteLen(str) {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      // 单字节加1
      if ((c >= 0x0001 && c <= 0x007e) || (c >= 0xff60 && c <= 0xff9f)) {
        len++;
      } else {
        len += 2;
      }
    }
    return len;
  },

  /**
   * 校验手机
   * @param value 手机号
   * @returns {boolean}
   */
  checkTel(value) {
    if (value == '' || value.trim() == '') {
      return false;
    }

    const isPhone = /^([0-9]{3,4}-)?[0-9]{7,8}$/;
    const isMob = /^((\+?86)|(\+86))?(13[012356789][0-9]{8}|15[012356789][0-9]{8}|18[02356789][0-9]{8}|147[0-9]{8}|1349[0-9]{7})$/;
    return !!(isMob.test(value) || isPhone.test(value));
  },

  /**
   * 校验手机
   * @param value 手机号
   * @returns {boolean}
   */
  isMobileNumber(value) {
    const reg = /^1[3|4|5|7|8][0-9]\d{8}$/;
    return reg.test(value);
  },

  /**
    * 判断非空
    * @param value
    * @returns {boolean}
    */
  isEmpty(value) {
    if (value == null || !(/.?[^\s　]+/.test(value))) {
      return true;
    } else {
      return false;
    }
  },

  /**
    * 判断数字
    * @param value
    * @returns {boolean}
    */
  isNumeric(value) {
    return toString.call(value) === '[object Number]';
  },

  /**
    * 非零整数
    * @param value
    * @returns {boolean}
    */
  isInteger(value) {
    return /^[1-9]\d*$/.test(value);
  },

};

/**
 * 兼容数组includes (includes属于es7)
 * android中Babel不支持includes？？？好像是这样的！！！
 */
(() => {
  if (!Array.prototype.includes) {
    Array.prototype.includes = function (value) {
      return this.some(el => el === value);
    };
  }
})();

export default CommonUtil;
