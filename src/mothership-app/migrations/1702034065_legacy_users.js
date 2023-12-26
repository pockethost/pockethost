/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {

   db.newQuery("UPDATE users SET subscription = 'legacy'")
        .execute()
}, (db) => {
 
})
