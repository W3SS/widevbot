var splunkjs = require('splunk-sdk');
module.exports = {

runSearch: function(searchQuery,searchParams,callback){
  var service = new splunkjs.Service({host:'172.16.39.16',port:'8089',username: "admin", password: "P4ssword!"});

  service.login(function(err, success) {
      if (err) {
          throw err;
      }

      service.search(
        searchQuery,
        searchParams,
        function(err, job) {
          console.log("Job SID: ", job.sid);
             job.track({period: 200}, {
            done: function(job) {
              console.log("Done!");


              job.results({
                count: 10
              }, function(err, results, job) {
                console.log(JSON.stringify(results));
                callback(results);
              });
            },
            failed: function(job) {
              console.log("Job failed")
            },
            error: function(err) {
              done(err);
            }
          });
        });

      });
},

makeQuery : function(callback){
    var service = new splunkjs.Service({host:'172.16.39.16',port:'8089',username: "admin", password: "P4ssword!"});

    service.login(function(err, success) {
        if (err) {
            throw err;
        }

          console.log("Login was successful: " + success);

              // The saved search created earlier
          var searchName = "attivazioni";

          // Retrieve the saved search collection
          var mySavedSearches = service.savedSearches();

          mySavedSearches.fetch(function(err, mySavedSearches) {

            // Retrieve the saved search that was created earlier
            var mySavedSearch = mySavedSearches.item(searchName);

            // Run the saved search and poll for completion
            mySavedSearch.dispatch(function(err, job) {

              // Display the job's search ID
              console.log("Job SID: ", job.sid);

              // Poll the status of the search job
              job.track({
                period: 200
              }, {
                done: function(job) {
                  console.log("Done!");


                  job.results({
                    count: 10
                  }, function(err, results, job) {
                    console.log(JSON.stringify(results));
                    callback(results);
                  });
                },
                failed: function(job) {
                  console.log("Job failed")
                },
                error: function(err) {
                  done(err);
                }
              });
            });
          });
    });
}
}
