"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = function(target, all) {
    for(var name in all)__defProp(target, name, {
        get: all[name],
        enumerable: true
    });
};
var __copyProps = function(to, from, except, desc) {
    if (from && typeof from === "object" || typeof from === "function") {
        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
        try {
            var _loop = function() {
                var key = _step.value;
                if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
                    get: function() {
                        return from[key];
                    },
                    enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
                });
            };
            for(var _iterator = __getOwnPropNames(from)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true)_loop();
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally{
            try {
                if (!_iteratorNormalCompletion && _iterator.return != null) {
                    _iterator.return();
                }
            } finally{
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }
    }
    return to;
};
var __toCommonJS = function(mod) {
    return __copyProps(__defProp({}, "__esModule", {
        value: true
    }), mod);
};
// src/hooks/src/lib.ts
var lib_exports = {};
__export(lib_exports, {
    _getRecord: function() {
        return _getRecord;
    },
    _unsafe_assert: function() {
        return assert;
    },
    endOfMonth: function() {
        return endOfMonth;
    },
    forEach: function() {
        return forEach;
    },
    getInstance: function() {
        return getInstance;
    },
    getUser: function() {
        return getUser;
    },
    newModel: function() {
        return newModel;
    },
    queryOne: function() {
        return queryOne;
    },
    startOfMonth: function() {
        return startOfMonth;
    },
    updateInstance: function() {
        return updateInstance;
    },
    updateUser: function() {
        return updateUser;
    }
});
module.exports = __toCommonJS(lib_exports);
// src/util/assert.ts
function assert(v, msg) {
    if (!v) {
        throw new Error(msg || "Assertion failure");
    }
}
// ../../node_modules/@s-libs/micro-dash/fesm2015/micro-dash.mjs
function forEach(collection, iteratee) {
    if (Array.isArray(collection)) {
        forEachOfArray(collection, iteratee);
    } else {
        forOwnOfNonArray(collection, iteratee);
    }
    return collection;
}
function forEachOfArray(array, iteratee) {
    for(var i = 0, len = array.length; i < len; ++i){
        if (iteratee(array[i], i) === false) {
            break;
        }
    }
}
function keysOfNonArray(object) {
    return object ? Object.getOwnPropertyNames(object) : [];
}
function forOwnOfNonArray(object, iteratee) {
    forEachOfArray(keysOfNonArray(object), function(key) {
        return iteratee(object[key], key);
    });
    return object;
}
// src/hooks/src/lib.ts
var newModel = function(schema) {
    return new DynamicModel(schema);
};
function endOfMonth(now) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
}
function startOfMonth(now) {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}
var dao = function() {
    var _dao = $app.dao();
    assert(_dao);
    return _dao;
};
var queryOne = function(sql, bindings, defaultResult) {
    var _dao_db_newQuery_bind, _dao_db_newQuery;
    var result = newModel(defaultResult);
    (_dao_db_newQuery = dao().db().newQuery(sql)) === null || _dao_db_newQuery === void 0 ? void 0 : (_dao_db_newQuery_bind = _dao_db_newQuery.bind(bindings)) === null || _dao_db_newQuery_bind === void 0 ? void 0 : _dao_db_newQuery_bind.one(result);
    return result;
};
var _getRecord = function(name, id) {
    var record = dao().findRecordById(name, id);
    return record;
};
var getInstance = function(instanceId) {
    return _getRecord("instances", instanceId);
};
var getUser = function(userId) {
    return _getRecord("users", userId);
};
function _updateRecord(record, fields) {
    forEach(fields, function(v, k) {
        record.set(k, v);
    });
    dao().saveRecord(record);
}
function _getRecordByIdOrRecord(recordOrInstanceId, name) {
    var record = function() {
        if (typeof recordOrInstanceId === "string") return _getRecord(name, recordOrInstanceId);
        return recordOrInstanceId;
    }();
    assert(record);
    return record;
}
function updateInstance(recordOrInstanceId, fields) {
    var record = _getRecordByIdOrRecord(recordOrInstanceId, "instances");
    _updateRecord(record, fields);
}
function updateUser(recordOrUserId, fields) {
    var record = _getRecordByIdOrRecord(recordOrUserId, "users");
    _updateRecord(record, fields);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
    _getRecord: _getRecord,
    _unsafe_assert: _unsafe_assert,
    endOfMonth: endOfMonth,
    forEach: forEach,
    getInstance: getInstance,
    getUser: getUser,
    newModel: newModel,
    queryOne: queryOne,
    startOfMonth: startOfMonth,
    updateInstance: updateInstance,
    updateUser: updateUser
});
