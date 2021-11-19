function analyseQueryPlans(collection) {
  qc = collection.getPlanCache();
  var indexes = {};

  var processQuery = function (plan, q) {
    const query=Object.assign({}, q);
    var usedIndexes = [];
    getUsedIndexes(plan.plans[0], usedIndexes);
    var alternatives = [];
    getUsedIndexes(plan, alternatives);
    alternatives = alternatives.filter((el) => !usedIndexes.includes(el));
    query["alternativeIndexes"] = alternatives;
    usedIndexes.forEach(function (index) {
      var indexUsage = indexes[index];
      if (indexUsage == undefined) {
        indexUsage =
        {
          index: index,
          usedByQueries: []
        };
        indexes[index] = indexUsage;
      }
      indexUsage.usedByQueries.push(query);
      indexes[index] = indexUsage;
    });
  }


  if (qc.listQueryShapes && db.version() < "4.2") {
    //MongoDB Version before 4.2
    qc.listQueryShapes().forEach(function (query) {
      plan = qc.getPlansByQuery(query.query, query.projection, query.sort);
      processQuery(plan, query);
    });
  } else {
    //MongoDB Version > 4.2  --> use { $planCacheStats: { } }
    collection.aggregate(
      [
        { "$planCacheStats": {} },
        {
          "$addFields":
          {
            "candidates":
            {
              "$map":
              {
                "input":
                  { "$zip": { "inputs": ["$candidatePlanScores", "$creationExecStats"] } },
                "in": {
                  "score": { "$arrayElemAt": ["$$this", 0] },
                  "plan": { "$arrayElemAt": ["$$this", 1] }
                }
              },

            }
          }
        },
        { "$unwind": "$candidates" },
        {
          "$project":
          {
            "plan": "$candidates", "queryHash": 1, "createdFromQuery": 1
          }
        },
        { "$sort": { "candidates.score": -1 } },
        { "$group": { _id: "$queryHash", plans: { "$push": "$plan" }, query: { "$first": "$createdFromQuery" } } }
      ]
    ).forEach(function (queryPlans) {
      processQuery(queryPlans, queryPlans.query);
    });
  }
  return indexes;
}


function getUsedIndexes(plan, indexes) {
  for (key in plan) {
    value = plan[key];
    if (key == 'indexName' && !indexes.includes(value)) {
      indexes.push(value)
    } else if (typeof value === 'object') {
      getUsedIndexes(value, indexes);
    }
  }
}


function analyzeAll() {
  db = db.getSiblingDB("admin");
  dbs = db.runCommand({ "listDatabases": 1 }).databases;
  dbs.forEach(function(database) {
        db = db.getSiblingDB(database.name);
        cols = db.getCollectionNames();
        cols.forEach(function(col) {
           try{
            collection = db.getCollection(col);
            print("collection:  "+collection.getFullName());
            printjson(analyseQueryPlans(collection));        
           } catch(e) {
             print(e);
           }
        });
    });
}
analyzeAll();