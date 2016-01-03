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

  TasksFactory.getTasks().then(function(data) {
    $scope.tasks = data;
  });

  JobsFactory.getJobs().then(function(data) {
    $scope.jobs = data;
  });

  ClientsFactory.getClients().then(function(data){
    $scope.clients = data;
  });

  
});

app.factory("TasksFactory", function($http, $q, app, User) {
  var o = {
    tasks: {}
  }

  o.getTasks = function() {
    var deferred = $q.defer();

    $http.jsonp(app.BASE_URL + "/Companies/" + User.user.CompanyID + "/Users/" + User.user.UserID + '/Tasks/?callback=JSON_CALLBACK')
      .success(function(data) {
        o.tasks = data;
        deferred.resolve(data);
      }).error(function(err) {
        deferred.reject(err);
      });
    return deferred.promise;
  }

  return o;
});

app.factory("ClientsFactory", function($http, $q, app, User) {
  var o = {
    clients: {}
  }

  o.getClients = function() {
    var deferred = $q.defer();

    $http.jsonp(app.BASE_URL + "/Companies/" + User.user.CompanyID + "/Users/" + User.user.UserID + '/Clients/?callback=JSON_CALLBACK')
      .success(function(data) {
        o.clients = data;
        deferred.resolve(data);
      }).error(function(err) {
        deferred.reject(err);
      });
    return deferred.promise;
  }

  return o;
});

app.factory("JobsFactory", function($http, $q, app, User) {
  var o = {
    jobs: {}
  }

  o.getJobs = function() {
    var deferred = $q.defer();

    $http.jsonp(app.BASE_URL + "/Companies/" + User.user.CompanyID + "/Users/" + User.user.UserID + '/Jobs/?withChildIDs=true&callback=JSON_CALLBACK')
      .success(function(data) {
        o.jobs = data;
        deferred.resolve(data);
      }).error(function(err) {
        debugger;
        deferred.reject(err);
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
          console.log(response);
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
        getPromise: ['TasksFactory', 'User', function(TasksFactory, User) {
        }]
      }
    });
});
