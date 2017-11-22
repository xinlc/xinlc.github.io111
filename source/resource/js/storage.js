/* eslint-disable */

/**
 * Storage Util
 * Created by lichao on 16/11/30.
 */
import BaseConfig from 'config/baseConfig';

var storage = {};

storage.storeObject2Local = function(key, object) {
  var data = JSON.stringify(object);
  localStorage.setItem(key, data);
};

storage.getObjectInLocal = function(key) {
  var data = localStorage.getItem(key);
  if (data == null) {
    return {};
  }
  return JSON.parse(data);
};

storage.storeValue2Local = function (key, object) {
  localStorage.setItem(key, object);
};

storage.getValueInLocal = function (key) {
  return localStorage.getItem(key);
};

storage.removeLocalObject = function (key) {
  localStorage.removeItem(key);
};

storage.storeObject2Session = function (key, object) {
  var data = JSON.stringify(object);
  sessionStorage.setItem(key, data);
};

storage.getObjectInSession = function (key) {
  var data = sessionStorage.getItem(key);
  if (data == null) {
    return {};
  }
  return JSON.parse(data);
};

storage.storeValue2Session = function (key, object) {
  sessionStorage.setItem(key, object);
};

storage.getValueInSession = function (key) {
  return sessionStorage.getItem(key);
};

storage.removeSessionObject = function (key) {
  sessionStorage.removeItem(key);
};

storage.clearLocalStorage = function () {
  localStorage.clear();
};

storage.clearSessionStorage = function () {
  sessionStorage.clear();
};


// ======== user =============

storage.getUser = function () {
  if (this.getObjectInLocal('cyb.user').Token !== undefined) {
    return this.getObjectInLocal('cyb.user');
  }
  return BaseConfig.defaultUser;
};
storage.setUser = function(obj) {
  this.storeObject2Local('cyb.user', obj);
};

// ======== key =============
storage.SHOP = 'cyb.shop.index';

export default storage;
