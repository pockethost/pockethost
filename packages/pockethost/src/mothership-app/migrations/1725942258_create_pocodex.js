// src/pb/pb_migrations/1725942258_create_pocodex.js
migrate(
  (db) => {
    const collection = new Collection({
      id: "kxhogh0nu8cyokn",
      name: "pocodex",
      type: "base",
      system: false,
      schema: [
        {
          system: false,
          id: "avyam89v",
          name: "owner",
          type: "text",
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: null,
            pattern: ""
          }
        },
        {
          system: false,
          id: "adbqji6s",
          name: "type",
          type: "text",
          required: true,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: null,
            pattern: ""
          }
        },
        {
          system: false,
          id: "ebc7jrha",
          name: "key",
          type: "text",
          required: true,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: null,
            pattern: ""
          }
        },
        {
          system: false,
          id: "w8tqpoan",
          name: "value",
          type: "json",
          required: true,
          presentable: false,
          unique: false,
          options: {
            maxSize: 2e6
          }
        }
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_5XsQQRe` ON `pocodex` (\n  `owner`,\n  `type`,\n  `key`\n)",
        "CREATE INDEX `idx_jRx0x6O` ON `pocodex` (`owner`)",
        "CREATE INDEX `idx_MQTYsG2` ON `pocodex` (\n  `owner`,\n  `type`\n)"
      ],
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      options: {}
    });
    return Dao(db).saveCollection(collection);
  },
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("kxhogh0nu8cyokn");
    return dao.deleteCollection(collection);
  }
);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL3BiL3BiX21pZ3JhdGlvbnMvMTcyNTk0MjI1OF9jcmVhdGVfcG9jb2RleC5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsibWlncmF0ZShcbiAgKGRiKSA9PiB7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IG5ldyBDb2xsZWN0aW9uKHtcbiAgICAgIGlkOiAna3hob2doMG51OGN5b2tuJyxcbiAgICAgIG5hbWU6ICdwb2NvZGV4JyxcbiAgICAgIHR5cGU6ICdiYXNlJyxcbiAgICAgIHN5c3RlbTogZmFsc2UsXG4gICAgICBzY2hlbWE6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN5c3RlbTogZmFsc2UsXG4gICAgICAgICAgaWQ6ICdhdnlhbTg5dicsXG4gICAgICAgICAgbmFtZTogJ293bmVyJyxcbiAgICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHByZXNlbnRhYmxlOiBmYWxzZSxcbiAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIG1pbjogbnVsbCxcbiAgICAgICAgICAgIG1heDogbnVsbCxcbiAgICAgICAgICAgIHBhdHRlcm46ICcnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzeXN0ZW06IGZhbHNlLFxuICAgICAgICAgIGlkOiAnYWRicWppNnMnLFxuICAgICAgICAgIG5hbWU6ICd0eXBlJyxcbiAgICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgcHJlc2VudGFibGU6IGZhbHNlLFxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgbWluOiBudWxsLFxuICAgICAgICAgICAgbWF4OiBudWxsLFxuICAgICAgICAgICAgcGF0dGVybjogJycsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHN5c3RlbTogZmFsc2UsXG4gICAgICAgICAgaWQ6ICdlYmM3anJoYScsXG4gICAgICAgICAgbmFtZTogJ2tleScsXG4gICAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIHByZXNlbnRhYmxlOiBmYWxzZSxcbiAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIG1pbjogbnVsbCxcbiAgICAgICAgICAgIG1heDogbnVsbCxcbiAgICAgICAgICAgIHBhdHRlcm46ICcnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzeXN0ZW06IGZhbHNlLFxuICAgICAgICAgIGlkOiAndzh0cXBvYW4nLFxuICAgICAgICAgIG5hbWU6ICd2YWx1ZScsXG4gICAgICAgICAgdHlwZTogJ2pzb24nLFxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIHByZXNlbnRhYmxlOiBmYWxzZSxcbiAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIG1heFNpemU6IDIwMDAwMDAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBpbmRleGVzOiBbXG4gICAgICAgICdDUkVBVEUgVU5JUVVFIElOREVYIGBpZHhfNVhzUVFSZWAgT04gYHBvY29kZXhgIChcXG4gIGBvd25lcmAsXFxuICBgdHlwZWAsXFxuICBga2V5YFxcbiknLFxuICAgICAgICAnQ1JFQVRFIElOREVYIGBpZHhfalJ4MHg2T2AgT04gYHBvY29kZXhgIChgb3duZXJgKScsXG4gICAgICAgICdDUkVBVEUgSU5ERVggYGlkeF9NUVRZc0cyYCBPTiBgcG9jb2RleGAgKFxcbiAgYG93bmVyYCxcXG4gIGB0eXBlYFxcbiknLFxuICAgICAgXSxcbiAgICAgIGxpc3RSdWxlOiBudWxsLFxuICAgICAgdmlld1J1bGU6IG51bGwsXG4gICAgICBjcmVhdGVSdWxlOiBudWxsLFxuICAgICAgdXBkYXRlUnVsZTogbnVsbCxcbiAgICAgIGRlbGV0ZVJ1bGU6IG51bGwsXG4gICAgICBvcHRpb25zOiB7fSxcbiAgICB9KVxuXG4gICAgcmV0dXJuIERhbyhkYikuc2F2ZUNvbGxlY3Rpb24oY29sbGVjdGlvbilcbiAgfSxcbiAgKGRiKSA9PiB7XG4gICAgY29uc3QgZGFvID0gbmV3IERhbyhkYilcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gZGFvLmZpbmRDb2xsZWN0aW9uQnlOYW1lT3JJZCgna3hob2doMG51OGN5b2tuJylcblxuICAgIHJldHVybiBkYW8uZGVsZXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uKVxuICB9XG4pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQUE7QUFBQSxFQUNFLENBQUMsT0FBTztBQUNOLFVBQU0sYUFBYSxJQUFJLFdBQVc7QUFBQSxNQUNoQyxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsTUFDUixRQUFRO0FBQUEsUUFDTjtBQUFBLFVBQ0UsUUFBUTtBQUFBLFVBQ1IsSUFBSTtBQUFBLFVBQ0osTUFBTTtBQUFBLFVBQ04sTUFBTTtBQUFBLFVBQ04sVUFBVTtBQUFBLFVBQ1YsYUFBYTtBQUFBLFVBQ2IsUUFBUTtBQUFBLFVBQ1IsU0FBUztBQUFBLFlBQ1AsS0FBSztBQUFBLFlBQ0wsS0FBSztBQUFBLFlBQ0wsU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsUUFDQTtBQUFBLFVBQ0UsUUFBUTtBQUFBLFVBQ1IsSUFBSTtBQUFBLFVBQ0osTUFBTTtBQUFBLFVBQ04sTUFBTTtBQUFBLFVBQ04sVUFBVTtBQUFBLFVBQ1YsYUFBYTtBQUFBLFVBQ2IsUUFBUTtBQUFBLFVBQ1IsU0FBUztBQUFBLFlBQ1AsS0FBSztBQUFBLFlBQ0wsS0FBSztBQUFBLFlBQ0wsU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsUUFDQTtBQUFBLFVBQ0UsUUFBUTtBQUFBLFVBQ1IsSUFBSTtBQUFBLFVBQ0osTUFBTTtBQUFBLFVBQ04sTUFBTTtBQUFBLFVBQ04sVUFBVTtBQUFBLFVBQ1YsYUFBYTtBQUFBLFVBQ2IsUUFBUTtBQUFBLFVBQ1IsU0FBUztBQUFBLFlBQ1AsS0FBSztBQUFBLFlBQ0wsS0FBSztBQUFBLFlBQ0wsU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsUUFDQTtBQUFBLFVBQ0UsUUFBUTtBQUFBLFVBQ1IsSUFBSTtBQUFBLFVBQ0osTUFBTTtBQUFBLFVBQ04sTUFBTTtBQUFBLFVBQ04sVUFBVTtBQUFBLFVBQ1YsYUFBYTtBQUFBLFVBQ2IsUUFBUTtBQUFBLFVBQ1IsU0FBUztBQUFBLFlBQ1AsU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBUztBQUFBLFFBQ1A7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFVBQVU7QUFBQSxNQUNWLFVBQVU7QUFBQSxNQUNWLFlBQVk7QUFBQSxNQUNaLFlBQVk7QUFBQSxNQUNaLFlBQVk7QUFBQSxNQUNaLFNBQVMsQ0FBQztBQUFBLElBQ1osQ0FBQztBQUVELFdBQU8sSUFBSSxFQUFFLEVBQUUsZUFBZSxVQUFVO0FBQUEsRUFDMUM7QUFBQSxFQUNBLENBQUMsT0FBTztBQUNOLFVBQU0sTUFBTSxJQUFJLElBQUksRUFBRTtBQUN0QixVQUFNLGFBQWEsSUFBSSx5QkFBeUIsaUJBQWlCO0FBRWpFLFdBQU8sSUFBSSxpQkFBaUIsVUFBVTtBQUFBLEVBQ3hDO0FBQ0Y7IiwKICAibmFtZXMiOiBbXQp9Cg==