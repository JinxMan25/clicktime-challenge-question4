var app = angular.module("clicktime", ['ngResource', 'ui.router']);

app.run(function($rootScope){
  //show ui-view error. It is disabled by default
  $rootScope.$on("$stateChangeError", console.log.bind(console));

  //show loading indicator when state starts to change
  $rootScope.$on("$stateChangeStart", function(){
    $rootScope.loading = true;
  });

  //hide loading indicator when state loads
  $rootScope.$on("$stateChangeSuccess", function(){
    $rootScope.loading = false;
  });
});

app.config(['$httpProvider', function($httpProvider){
  $httpProvider.defaults.useXDomain = true;
  delete $httpProvider.defaults.headers.common['X-Requested-With'];
}]);

//Constants
app.constant("app", {
  "BASE_URL": "https://clicktime.herokuapp.com/api/1.0"
});

app.controller("home", function($rootScope, $scope, User, $http, $resource, app, TasksFactory, JobsFactory, ClientsFactory, local) {

  $rootScope.user = User.user;

  TasksFactory.getTasks(User.user.CompanyID, User.user.UserID).then(function(data) {
    $scope.tasks = data;
  });

  JobsFactory.getJobs().then(function(data) {
    $scope.jobs = JobsFactory.jobs;
  });

  ClientsFactory.getClients().then(function(data) {
    $scope.clients = data;
  });
});

//controller for /tasks route
app.controller("tasks", function($rootScope, $scope, User, TasksFactory, $location, local) {
  //Show all the tasks at first
  $scope.tasks = TasksFactory.tasks; 

  //set up options for fuzzy searching. Initially have it search by the 'Name' key. 
  var options = {
    keys: ['Name']
  }
  var f = new Fuse(TasksFactory.tasks, options)

  //Show all tasks if input search bar is empty (when user backspaces until search bar is empty), otherwise it'll show no results
  $scope.keyUp = function(e) {
    if (e == 8 && $scope.search == "") {
      $scope.tasks = TasksFactory.tasks; 
    }
    
    //If search result narrows down to one result, user has the option to hit the enter button on the keyboard to be directed to the particular tasks page
    if (e == 13 && $scope.tasks.length == 1) {
      $scope.goToTask();
    }
  }

  $scope.goToTask = function(){
    $location.url("/tasks/" + $scope.tasks[0].TaskID);
  }

  //Fuzzy search through the tasks for every key stroke on the search model
  $scope.$watch("search", function() {
    $scope.tasks = f.search($scope.search);
    if ($scope.tasks.length == 1){
      $scope.enter = true;
    } else {
      $scope.enter = false;
    }
  });

});

//Controller for /tasks/:task_id route
//Shows all the jobs and clients pertaning to task_id
app.controller("task", function($scope, $stateParams, User, TasksFactory, ClientsFactory, JobsFactory, local){
  $scope.task = TasksFactory.task;
  $scope.jobs = JobsFactory.job;
  $scope.clients = ClientsFactory.client;
});

app.controller("jobs", function($scope, JobsFactory){
  $scope.jobs = JobsFactory.jobs;
});

//Tasks factory that stores all tasks for the user and one more task for the /tasks/:task_id route
//The additional task is actually unecessary but is present for testing purposes
app.factory("TasksFactory", function($http, $q, app, User, local) {
  var o = {
    tasks: {},
    task: {}
  }

  o.getTasks = function() {
    var deferred = $q.defer();

    $.ajax(app.BASE_URL + "/Companies/" + User.user.CompanyID + "/Users/" + User.user.UserID + '/Tasks', {
        dataType:'jsonp',
        timeout: 100,
        success: function(response) { 
          o.tasks = response;
          deferred.resolve(response);
        },
        error: function(xhr, stat, error) {
          local.resource("tasks").then(function(data){
            o.tasks = data;
            deferred.resolve(data);
          });
        }
    });

    return deferred.promise;
  }
  return o;
});

//Clients factory that stores all clients or client pertaining to a job
app.factory("ClientsFactory", function($http, $q, app, User, local) {
  var o = {
    clients: {},
    client: {}
  }

  o.getClients = function() {
    var deferred = $q.defer();

    $.ajax(app.BASE_URL + "/Companies/" + User.user.CompanyID + "/Users/" + User.user.UserID + '/Clients', {
        dataType:'jsonp',
        timeout: 100,
        success: function(response) { 
          o.clients = response;
          deferred.resolve(response);
        },
        error: function(xhr, stat, err) {
          local.resource("clients").then(function(data){
            o.clients = data;
            deferred.resolve(data);
          });
        }
    });
    return deferred.promise;
  }
  return o;
});

app.factory("local", function($q){
  var o = {};

  o.resource = function(route){
    var deferred = $q.defer();
    $.ajax({
      type: 'GET',
      dataType: 'json',
      async: false,
      url: route + ".json"
    }).done(function(data){
      deferred.resolve(data);
    });
    return deferred.promise;
  }
  return o;
});


//Jobs factory that stores all jobs and another subset of the jobs pertaining to a corresponding Task
//For example there is a request for /tasks/1ksj9. '1ksj9' is the :task_id in the router below.
//We then query for all jobs and then filter the jobs based on whether :task_id is in the PermittedTasks set
app.factory("JobsFactory", function($http, $q, app, User, local) {
  var o = {
    jobs: {},
    job: {}
  }

  o.getJobs = function() {
    var deferred = $q.defer();

    $.ajax(app.BASE_URL + "/Companies/" + User.user.CompanyID + "/Users/" + User.user.UserID + '/Jobs/?withChildIDs=true&callback=JSON_CALLBACK', {
        dataType:'jsonp',
        timeout: 100,
        success: function(response) { 
          o.jobs = response.map(function(job) {
            job["PermittedTasks"] = job["PermittedTasks"].split(",");
            return job;
          });
          deferred.resolve(response);
        },
        error: function(req, stat, err) {
          local.resource("jobs").then(function(data){
            o.jobs = data.map(function(job) {
              job["PermittedTasks"] = job["PermittedTasks"].split(",");
              return job;
            });
            deferred.resolve(data);
          });
        }
    });
    return deferred.promise;
  }
  return o;
})

//User factory that retrieves all the information about the authorized user
app.factory("User", function($http, $q, $timeout, app, local) {
  var o = {
    user: {}
  }

  o.getUser = function() {
    var deferred = $q.defer();

    //Promise not working with $http.jsonp(...), so resorting to $.ajax
    $.ajax({
        url: app.BASE_URL + '/session',
        dataType:'jsonp',
        timeout: 100,
        success: function(response) { 
          o.user = response;
          deferred.resolve(response);
        },
        error: function(xhr, status, error) {
          local.resource("user").then(function(data){
            o.user = data;
            deferred.resolve(data);
          });
        }
    });
    return deferred.promise;
  }
  return o;
});

//Router configuration for this Single Page App
app.config(function($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.otherwise('/');

  $stateProvider
    .state('home', {
      url: '/',
      templateUrl: 'home.html',
      controller: 'home',
      resolve: {
        getPromise: ['User', function(User) {
          return User.getUser();
        }]
      }
    })
  .state('tasks', {     //This view shows all the tasks pertaining to the User. The User can click on tasks to be directed to another view that shows all jobs and clients pertaining to the task
      url: '/tasks',
      controller: 'tasks',
      templateUrl: 'tasks.html',
      resolve: {
        getUser: ['User','TasksFactory', function(User, TasksFactory) {   //Chained promises. Always get User first in order to get company and user id
          return User.getUser().then(function(data) {
            return TasksFactory.getTasks();
          });
        }]
      }
    })
  .state('task', {   //This view shows jobs and clients pertaning to a specific view
      url: '/tasks/{task_id}',
      controller: 'task',
      templateUrl: 'task.html',
      resolve: {
        getUser: ['User','TasksFactory',"ClientsFactory","JobsFactory","$stateParams", function(User, TasksFactory, ClientsFactory, JobsFactory, $stateParams) {
          return User.getUser().then(function(data) {              //These are chained promises. Top level requests are resolved in order to use use those resolved data to get the next set of data
            return TasksFactory.getTasks().then(function(data) {

              //retreive task by task_id  in the router
                TasksFactory.task = _.findWhere(data, {TaskID: $stateParams.task_id });
                return JobsFactory.getJobs().then(function(data) {

                  //For all the jobs, check if the task_id is in the set of PermittedTasks 
                  JobsFactory.job = _.filter(data, function(job) {
                    return _.contains(job.PermittedTasks, $stateParams.task_id);
                  });

                  var jobs = _.pluck(JobsFactory.job, "ClientID");
                  return ClientsFactory.getClients().then(function(clients){
                    ClientsFactory.client = _.filter(clients, function(client){
                      return _.contains(jobs, client.ClientID);
                    });

                    JobsFactory.job.forEach(function(elem, idx, arr){
                      var client = _.findWhere(clients, { ClientID: elem.ClientID});
                      JobsFactory.job[idx]["Client"] = client.Name;
                    });
                    return data;
                  });
              });
            });
          });
        }]
      }
    })
  .state('jobs', {    
      url: '/jobs',
      controller: 'jobs',
      templateUrl: 'jobs.html',
      resolve: {
        getUser: ['User','JobsFactory', function(User, JobsFactory) {   
          return User.getUser().then(function(data) {
            return JobsFactory.getJobs();
          });
        }]
      }
    });
});
