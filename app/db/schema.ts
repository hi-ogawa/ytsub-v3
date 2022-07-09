// auto-generated by 'npm run dump-schema'
export default {
  bookmarkEntries: {
    id: {
      Field: "id",
      Type: "bigint",
      Null: "NO",
      Key: "PRI",
      Default: null,
      Extra: "auto_increment",
    },
    text: {
      Field: "text",
      Type: "text",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    side: {
      Field: "side",
      Type: "int",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    offset: {
      Field: "offset",
      Type: "int",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    createdAt: {
      Field: "createdAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED",
    },
    updatedAt: {
      Field: "updatedAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
    },
    userId: {
      Field: "userId",
      Type: "bigint",
      Null: "NO",
      Key: "MUL",
      Default: null,
      Extra: "",
    },
    videoId: {
      Field: "videoId",
      Type: "bigint",
      Null: "NO",
      Key: "MUL",
      Default: null,
      Extra: "",
    },
    captionEntryId: {
      Field: "captionEntryId",
      Type: "bigint",
      Null: "NO",
      Key: "MUL",
      Default: null,
      Extra: "",
    },
  },
  captionEntries: {
    id: {
      Field: "id",
      Type: "bigint",
      Null: "NO",
      Key: "PRI",
      Default: null,
      Extra: "auto_increment",
    },
    index: {
      Field: "index",
      Type: "int",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    begin: {
      Field: "begin",
      Type: "float",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    end: {
      Field: "end",
      Type: "float",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    text1: {
      Field: "text1",
      Type: "text",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    text2: {
      Field: "text2",
      Type: "text",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    createdAt: {
      Field: "createdAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED",
    },
    updatedAt: {
      Field: "updatedAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
    },
    videoId: {
      Field: "videoId",
      Type: "bigint",
      Null: "NO",
      Key: "MUL",
      Default: null,
      Extra: "",
    },
  },
  decks: {
    id: {
      Field: "id",
      Type: "bigint",
      Null: "NO",
      Key: "PRI",
      Default: null,
      Extra: "auto_increment",
    },
    name: {
      Field: "name",
      Type: "text",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    createdAt: {
      Field: "createdAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED",
    },
    updatedAt: {
      Field: "updatedAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
    },
    userId: {
      Field: "userId",
      Type: "bigint",
      Null: "NO",
      Key: "MUL",
      Default: null,
      Extra: "",
    },
    newEntriesPerDay: {
      Field: "newEntriesPerDay",
      Type: "int",
      Null: "NO",
      Key: "",
      Default: "50",
      Extra: "",
    },
    reviewsPerDay: {
      Field: "reviewsPerDay",
      Type: "int",
      Null: "NO",
      Key: "",
      Default: "200",
      Extra: "",
    },
    easeMultiplier: {
      Field: "easeMultiplier",
      Type: "float",
      Null: "NO",
      Key: "",
      Default: "2",
      Extra: "",
    },
    easeBonus: {
      Field: "easeBonus",
      Type: "float",
      Null: "NO",
      Key: "",
      Default: "1.5",
      Extra: "",
    },
    randomMode: {
      Field: "randomMode",
      Type: "tinyint(1)",
      Null: "NO",
      Key: "",
      Default: "0",
      Extra: "",
    },
    practiceEntriesCountByQueueType: {
      Field: "practiceEntriesCountByQueueType",
      Type: "json",
      Null: "NO",
      Key: "",
      Default:
        "json_object(_utf8mb4\\'NEW\\',0,_utf8mb4\\'LEARN\\',0,_utf8mb4\\'REVIEW\\',0)",
      Extra: "DEFAULT_GENERATED",
    },
  },
  practiceActions: {
    id: {
      Field: "id",
      Type: "bigint",
      Null: "NO",
      Key: "PRI",
      Default: null,
      Extra: "auto_increment",
    },
    queueType: {
      Field: "queueType",
      Type: "varchar(32)",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    actionType: {
      Field: "actionType",
      Type: "varchar(32)",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    createdAt: {
      Field: "createdAt",
      Type: "datetime",
      Null: "NO",
      Key: "MUL",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED",
    },
    updatedAt: {
      Field: "updatedAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
    },
    userId: {
      Field: "userId",
      Type: "bigint",
      Null: "NO",
      Key: "MUL",
      Default: null,
      Extra: "",
    },
    deckId: {
      Field: "deckId",
      Type: "bigint",
      Null: "NO",
      Key: "MUL",
      Default: null,
      Extra: "",
    },
    practiceEntryId: {
      Field: "practiceEntryId",
      Type: "bigint",
      Null: "NO",
      Key: "MUL",
      Default: null,
      Extra: "",
    },
  },
  practiceEntries: {
    id: {
      Field: "id",
      Type: "bigint",
      Null: "NO",
      Key: "PRI",
      Default: null,
      Extra: "auto_increment",
    },
    queueType: {
      Field: "queueType",
      Type: "varchar(32)",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    easeFactor: {
      Field: "easeFactor",
      Type: "float",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    scheduledAt: {
      Field: "scheduledAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    createdAt: {
      Field: "createdAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED",
    },
    updatedAt: {
      Field: "updatedAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
    },
    deckId: {
      Field: "deckId",
      Type: "bigint",
      Null: "NO",
      Key: "MUL",
      Default: null,
      Extra: "",
    },
    bookmarkEntryId: {
      Field: "bookmarkEntryId",
      Type: "bigint",
      Null: "NO",
      Key: "MUL",
      Default: null,
      Extra: "",
    },
    practiceActionsCount: {
      Field: "practiceActionsCount",
      Type: "int",
      Null: "NO",
      Key: "",
      Default: "0",
      Extra: "",
    },
  },
  users: {
    id: {
      Field: "id",
      Type: "bigint",
      Null: "NO",
      Key: "PRI",
      Default: null,
      Extra: "auto_increment",
    },
    username: {
      Field: "username",
      Type: "varchar(128)",
      Null: "NO",
      Key: "UNI",
      Default: null,
      Extra: "",
    },
    passwordHash: {
      Field: "passwordHash",
      Type: "varchar(128)",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    createdAt: {
      Field: "createdAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED",
    },
    updatedAt: {
      Field: "updatedAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
    },
    language1: {
      Field: "language1",
      Type: "varchar(32)",
      Null: "YES",
      Key: "",
      Default: null,
      Extra: "",
    },
    language2: {
      Field: "language2",
      Type: "varchar(32)",
      Null: "YES",
      Key: "",
      Default: null,
      Extra: "",
    },
    timezone: {
      Field: "timezone",
      Type: "varchar(32)",
      Null: "NO",
      Key: "",
      Default: "+00:00",
      Extra: "",
    },
  },
  videos: {
    id: {
      Field: "id",
      Type: "bigint",
      Null: "NO",
      Key: "PRI",
      Default: null,
      Extra: "auto_increment",
    },
    videoId: {
      Field: "videoId",
      Type: "varchar(32)",
      Null: "NO",
      Key: "MUL",
      Default: null,
      Extra: "",
    },
    language1_id: {
      Field: "language1_id",
      Type: "varchar(32)",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    language1_translation: {
      Field: "language1_translation",
      Type: "varchar(32)",
      Null: "YES",
      Key: "",
      Default: null,
      Extra: "",
    },
    language2_id: {
      Field: "language2_id",
      Type: "varchar(32)",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    language2_translation: {
      Field: "language2_translation",
      Type: "varchar(32)",
      Null: "YES",
      Key: "",
      Default: null,
      Extra: "",
    },
    title: {
      Field: "title",
      Type: "text",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    author: {
      Field: "author",
      Type: "text",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    channelId: {
      Field: "channelId",
      Type: "varchar(32)",
      Null: "NO",
      Key: "",
      Default: null,
      Extra: "",
    },
    createdAt: {
      Field: "createdAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED",
    },
    updatedAt: {
      Field: "updatedAt",
      Type: "datetime",
      Null: "NO",
      Key: "",
      Default: "CURRENT_TIMESTAMP",
      Extra: "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
    },
    userId: {
      Field: "userId",
      Type: "bigint",
      Null: "YES",
      Key: "MUL",
      Default: null,
      Extra: "",
    },
    bookmarkEntriesCount: {
      Field: "bookmarkEntriesCount",
      Type: "int",
      Null: "NO",
      Key: "",
      Default: "0",
      Extra: "",
    },
  },
} as const;
