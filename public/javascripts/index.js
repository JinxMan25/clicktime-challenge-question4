var app = angular.module("clicktime", ['ngResource', 'ui.router']);

app.constant("app", {
  "BASE_URL": "https://clicktime.herokuapp.com/api/1.0"
});

app.controller("home", function($scope, User) {
});


app.factory("User", function($http, $q, $timeout ) {
  var o = {
    user: {}
  }

  return o;
});


app.factory("UserResource", function($resource, app) {
  return $resource(app.BASE_URL + "/Companies/:company_id/Users/:user_id")
});
