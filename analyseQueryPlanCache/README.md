
# Analyse Query Plan Cache for Index usage

This script makes show which index is currently being used
by which kind of query based on the content of the queryPlanCache.
It also shows the alternative indexes considered indexes for each query.

The intent of this script is to be used for index clean ups and optimisations.

## Usage
Start a mongo shell with the script.

```
mongo analysePlanCache.js
```

And then call analyseQueryPlans for the collection for which you want to analyse the Index Usage.

```javascript
 analyseQueryPlans(db.myCollectionName).
```


The result will look like this:

```javascript
analyseQueryPlans(db.test)
{
	"i_1" : {
		"index" : "i_1",
		"usedByQueries" : [
			{
				"query" : {
					"i" : 24
				},
				"sort" : {
					"i" : 1
				},
				"projection" : {

				},
				"alternativeIndexes" : [
					"i_1_x_1"
				]
			}
		]
	}
}
```
