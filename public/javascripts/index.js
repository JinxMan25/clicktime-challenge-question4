var app = angular.module("clicktime", ['ngResource', 'ui.router']);

app.run(function($rootScope){
  //show ui-view error
  $rootScope.$on("$stateChangeError", console.log.bind(console));

  //show loading indicator
  $rootScope.$on("$stateChangeStart", function() {
    $rootScope.loading = true;
  });

  //hide loading indicator
  $rootScope.$on("$stateChangeSuccess", function( ){
    $rootScope.loading = false;
  });
});

app.config(['$httpProvider', function($httpProvider) {
  $httpProvider.defaults.useXDomain = true;
  delete $httpProvider.defaults.headers.common['X-Requested-With'];

}]);


app.constant("app", {
  "BASE_URL": "https://clicktime.herokuapp.com/api/1.0"
});


app.controller("home", function($rootScope, $scope, User, $http, $resource, app, TasksFactory, JobsFactory, ClientsFactory) {

  $rootScope.user = User.user;

  TasksFactory.getTasks(User.user.CompanyID, User.user.UserID).then(function(data) {
    $scope.tasks = data;
  });

  JobsFactory.getJobs().then(function(data) {
    $scope.jobs = JobsFactory.jobs;
  });

  ClientsFactory.getClients().then(function(data){
    $scope.clients = data;
  });
});

app.controller("tasks", function($rootScope, $scope, User, TasksFactory) {
  $scope.tasks = TasksFactory.tasks; 
  console.log($scope.tasks);

  var options = {
    keys: ['Name']
  }
  var f = new Fuse(TasksFactory.tasks, options)

  $scope.keyUp = function(e){
    if (e == 8 && $scope.search == ""){
      $scope.tasks = TasksFactory.tasks; 
    }
    if (e == 13 && $scope.tasks.length == 1){
      alert("YELLO");
    }
  }

  $scope.$watch("search", function() {
    $scope.tasks = f.search($scope.search);
  });

  $scope.getJobs = function(id) {
    
  }

});

app.factory("TasksFactory", function($http, $q, app, User) {
  var o = {
    tasks: {},
    task: {}
  }

  o.getTasks = function() {
    var deferred = $q.defer();

    $.ajax(app.BASE_URL + "/Companies/" + User.user.CompanyID + "/Users/" + User.user.UserID + '/Tasks', {
        dataType:'jsonp',
        success: function(response) { 
          o.tasks = response;
          deferred.resolve(response);
        }
    });

    return deferred.promise;
  }

  return o;
});

app.factory("ClientsFactory", function($http, $q, app, User) {
  var o = {
    clients: {},
    client: {}
  }

  o.getClients = function() {
    var deferred = $q.defer();

    $.ajax(app.BASE_URL + "/Companies/" + User.user.CompanyID + "/Users/" + User.user.UserID + '/Clients', {
        dataType:'jsonp',
        success: function(response) { 
          o.clients = response;
          deferred.resolve(response);
        }
    });

    return deferred.promise;
  }

  return o;
});

app.factory("JobsFactory", function($http, $q, app, User) {
  var o = {
    jobs: {},
    job: {}
  }

  o.getJobs = function() {
    var deferred = $q.defer();

    $.ajax(app.BASE_URL + "/Companies/" + User.user.CompanyID + "/Users/" + User.user.UserID + '/Jobs/?withChildIDs=true&callback=JSON_CALLBACK', {
        dataType:'jsonp',
        success: function(response) { 

          o.jobs = response.map(function(job) {
            job["PermittedTasks"] = job["PermittedTasks"].split(",");
            return job;
          });

          deferred.resolve(response);
        }
    });

    return deferred.promise;
  }

  return o;
})

app.factory("User", function($http, $q, $timeout, app) {
  var o = {
    user: {}
  }

  o.getUser = function() {
    var deferred = $q.defer();

    //Promise not working with $http.jsonp(...), so resorting to $.ajax
    $.ajax(app.BASE_URL + '/session', {
        dataType:'jsonp',
        success: function(response) { 
          o.user = response;
          deferred.resolve(response);
        }
    });
    return deferred.promise;
  }

  return o;
});


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
    .state('tasks', {
      url: '/tasks',
      controller: 'tasks',
      templateUrl: 'tasks.html',
      resolve: {
        getUser: ['User','TasksFactory', function(User, TasksFactory) {
          return User.getUser().then(function(data) {
            return TasksFactory.getTasks();
          });
        }]
      }
    })
    .state('task', {
      url: '/tasks/{task_id}',
      controller: 'task',
      templateUrl: 'task.html',
      resolve: {
        getUser: ['User','TasksFactory',"ClientsFactory","JobsFactory","stateParams", function(User, TasksFactory, ClientsFactory, JobsFactory, $stateParams) {
          return User.getUser().then(function(data) {
            return TasksFactory.getTasks().then(function(data) {

                TasksFactory.task = _.findWhere(data, {TaskID: $stateParams.task_id });
                return JobsFactory.getJobs().then(function(data) {

                  JobsFactory.job = _.find(data, function(job){
                    return _.contains(job.PermittedTasks, $stateParams.task_id);
                  });
                  return ClientsFactory.getClients();
              });
            });
          });
        }]
      }
    });
});
