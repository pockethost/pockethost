"use strict";
// src/hooks/src/update-usage.pb.ts
console.log("update-usage");
onRecordAfterUpdateRequest(function(e) {
    var _require = require("".concat(__hooks, "/lib.js")), _unsafe_assert = _require._unsafe_assert, startOfMonth = _require.startOfMonth, endOfMonth = _require.endOfMonth, queryOne = _require.queryOne, updateInstance = _require.updateInstance, getInstance = _require.getInstance, updateUser = _require.updateUser;
    var assert = _unsafe_assert;
    var record = e.record;
    assert(record, "Expected record here");
    var instanceId = record.getString("instanceId");
    var instance = getInstance(instanceId);
    assert(instance);
    var uid = instance.getString("uid");
    assert(uid);
    var now = /* @__PURE__ */ new Date();
    var startIso = startOfMonth(now);
    var endIso = endOfMonth(now);
    {
        var result = queryOne("SELECT cast(sum(totalSeconds) as int) as t FROM invocations WHERE instanceId={:instanceId} and startedAt>={:startIso} and startedAt<={:endIso}", {
            instanceId: instanceId,
            startIso: startIso,
            endIso: endIso
        }, {
            t: 0
        });
        var secondsThisMonth = result.t;
        console.log("Instance seconds, ".concat(secondsThisMonth));
        updateInstance(instance, {
            secondsThisMonth: secondsThisMonth
        });
    }
    {
        var result1 = queryOne("SELECT cast(sum(totalSeconds) as int) as t FROM invocations WHERE uid={:uid} and startedAt>={:startIso} and startedAt<={:endIso}", {
            uid: uid,
            startIso: startIso,
            endIso: endIso
        }, {
            t: 0
        });
        var secondsThisMonth1 = result1.t;
        console.log("User seconds, ".concat(secondsThisMonth1));
        updateUser(uid, {
            secondsThisMonth: secondsThisMonth1
        });
    }
}, "invocations");
