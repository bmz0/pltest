var pulitestapp = angular.module('pulitestapp', ['ngRoute', 'pulitestctrl']);

pulitestapp.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.
        when('/', {
            templateUrl: 'listview.html',
            controller: 'ptCtrl'
        }).
 /*       when('/c/:cardId', {
            templateUrl: 'detailview.html',
            controller: 'ptDetail'
        }).*/
        otherwise({ redirectTo: '/'});
}]);
