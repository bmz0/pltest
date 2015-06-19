var pulitestctrl = angular.module('pulitestctrl', ['firebase']);

pulitestctrl.controller('ptCtrl', ['$scope', '$timeout', '$firebaseArray', '$firebaseObject',

    function ($scope, $timeout, $firebaseArray, $firebaseObject) {

        var contentref = new Firebase('/listContents/');
        var cardref = new Firebase('/cards/');
        var listref = new Firebase('/lists/');

        var _cardtext = "";
        var _fromcard = false;

        $scope.contents = $firebaseObject(contentref);
        $scope.cards = $firebaseArray(cardref);
        $scope.lists = $firebaseArray(listref);

        $scope.activelist = null;
        $scope.activecard = null;

        $scope.lists.$loaded(function (l) { if (l.length > 0) $scope.activelist = l[0].$id; });

// ---> gui helpers
        $scope.renameShow = false;
        $scope.deleteType = "";

        $scope.deleteQ = function () {
            if ($scope.deleteType=="list") { return $scope.contents[$scope.activelist] ? "Delete list and " + $scope.contents[$scope.activelist].length + " item(s)?" : "Delete this list?"; }
            else if ($scope.deleteType=="card") return "Delete selected item?";
        }

        $scope.deleteShow = function (e, type) {
            if (arguments.length < 2) {
                $scope.deleteType = "";
            } else {
                if ($scope.renameShow) $scope.renameShow = false;
                if (type == 'list') $scope.activecard = null;
                $scope.deleteType = type;
                e.stopPropagation();
            }
        }

        $scope.kdDelbtn = function (e) {
            if (e.which == 27) {
                $scope.deleteType = "";
                e.target.blur();
            }
        }

        $scope.deleteAction = function () {
            if ($scope.deleteType == "card") $scope.deleteCard()
            else if ($scope.deleteType == "list") $scope.deleteList();
            $scope.deleteType = "";
        }

        $scope.renameShowFn = function (e) {
            if ($scope.deleteType) $scope.deleteType = "";
            if ($scope.lists.$getRecord($scope.activelist)) // should never be null here though
                $scope.renameListText = $scope.lists.$getRecord($scope.activelist).name
            $scope.renameShow = true;
            e.stopPropagation();
            e.target.blur();
            $timeout($scope.focusRl, 0, false);
        }

        $scope.focusRl = function () { document.querySelector('#rlinput').focus(); }

        $scope.renameClickCheck = function (e) { if ($scope.renameShow) e.stopPropagation(); }

        $scope.confirmCheck = function (e) {
            if ($scope.deleteType) $scope.deleteType = "";
            if ($scope.renameShow) $scope.renameShow = false;
            if (!_fromcard) {
                $scope.activecard = null;
                $scope.cardText("");
                _fromcard = false;
            } else { _fromcard = false; };
        }

        $scope.inputKey = function (e, action) {
            var _inputkeyconfig = { uc: { "model": $scope.cardText, "fn": $scope.updateCard }, nc: { "model": $scope.cardText, "fn": $scope.addCard }, rl: { "model": $scope.renameListText, "fn": $scope.renameList }, nl: { "model": $scope.newListName, "fn": $scope.newList } };
            if (e.which == 27) {
                if (_inputkeyconfig[action].model.call) {
                    _inputkeyconfig[action].model("")
                    $scope.activecard = null;
                } else {
                    if ($scope.renameShow) $scope.renameShow = false;
                    _inputkeyconfig[action].model = "";
                }
                e.target.blur();
            } else if (e.which == 13) {
                e.preventDefault();
                _inputkeyconfig[action].fn();
            }

        }

// ---> card functions
        $scope.cardText = function (value) { return (arguments.length ? (_cardtext = value.toString()) : _cardtext); }

        $scope.addCard = function (e) {
            if ($scope.cardText().length < 1) return;
            $scope.cards.$add({body: $scope.cardText()}).
                then(function (ref) {
                    if ($scope.contents[$scope.activelist])
                        $scope.contents[$scope.activelist].push(ref.key())
                    else
                        $scope.contents[$scope.activelist] = [ref.key()];
                    $scope.contents.$save();
                });
            $scope.cardText("");
            if (e) {
                e.stopPropagation();
                document.activeElement.blur();
            }
        }

        $scope.selectCard = function (id) {
            $scope.activecard = id;
            $scope.cardText($scope.getCard(id) || "");
            _fromcard = true;
        }

        $scope.getCard = function (id) {
            var card = $scope.cards.$getRecord(id);
            return card ? card.body : ('Card not found: ' + id);
        }

        $scope.deleteCard = function () {
            var ind = $scope.contents[$scope.activelist].indexOf($scope.activecard);
            if (ind > -1) {
                $scope.contents[$scope.activelist].splice(ind, 1);
                $scope.contents.$save();
                $scope.cards.$remove($scope.cards.$indexFor($scope.activecard));
                $scope.activecard = null;
            }
        }

        $scope.updateCard = function (e) {
            var card = $scope.cards.$getRecord($scope.activecard);
            if ($scope.cardText().length < 1) return;
            if (card) {
                $scope.cards.$getRecord($scope.activecard).body = $scope.cardText();
                $scope.cards.$save($scope.cards.$indexFor($scope.activecard));
                if (e) {
                    e.stopPropagation();
                    document.activeElement.blur();
                }
            }
        }

        $scope.moveCard = function (list) {
            var ind = $scope.contents[$scope.activelist].indexOf($scope.activecard);
            if (ind > -1) {
                if ($scope.contents[list.$id])
                    $scope.contents[list.$id].push($scope.contents[$scope.activelist][ind])
                else
                    $scope.contents[list.$id] = [$scope.contents[$scope.activelist][ind]];
                $scope.contents[$scope.activelist].splice(ind, 1);
                $scope.contents.$save().then(function (ref) {
                    $scope.selectCard($scope.contents[list.$id][$scope.contents[list.$id].length - 1]);
                    _fromcard = false;
                });
            }
        }

        $scope.swap = function (id, offset) {
            var ind, tmpval,
                list = $scope.contents[$scope.activelist];
            ind = list.indexOf(id);
            if ((ind + offset < 0) || (ind + offset > list.length))
                return;
            tmpval = list[ind + offset];
            list[ind + offset] = list[ind];
            list[ind] = tmpval;
            $scope.contents.$save();
            document.activeElement.blur();
        }

// ---> list functions
        $scope.reorder = function (event, offset) {
            var op, np, ind,
                list = $scope.lists;
            ind = list.$indexFor($scope.activelist);
            if ((ind + offset < 0) || (ind + offset > list.length))
                return;
            op = list[ind].$priority;
            np = list[ind + offset].$priority;
            list.$ref().child(list.$keyAt(ind)).setPriority(np);
            list.$ref().child(list.$keyAt(ind + offset)).setPriority(op);
            event.stopPropagation();
            if ($scope.deleteType) $scope.deleteType = "";
            document.activeElement.blur();
        }

        $scope.newList = function () {
            if ($scope.newListName) {
                $scope.lists.$add({name: $scope.newListName})
                    .then(function (ref) {
                        ref.setPriority($scope.lists.length);
                        $scope.activelist = ref.key();
                    });
                $scope.newListName = "";
                document.activeElement.blur();
            }
        }

        $scope.getListName = function (id) {
            var list = $scope.lists.$getRecord(id);
            return list ? list.name : ('<' + id + '>');
        }

        $scope.selectList = function (list) {
            $scope.activelist = list.$id;
            if (!$scope.contents[list.$id] || $scope.contents[list.$id].indexOf($scope.activecard) < 0) $scope.activecard = null;
        }

        $scope.renameList = function () {
            if ($scope.renameListText) {
                $scope.lists.$getRecord($scope.activelist).name = $scope.renameListText;
                $scope.lists.$save($scope.lists.$indexFor($scope.activelist));
                $scope.renameShow = false;
            }
        }

        $scope.deleteList = function () {
            var ind,
                list = $scope.lists,
                contents = $scope.contents[$scope.activelist];

            if (contents) {
                for (var i = 0; i < contents.length; i++)
                    $scope.cards.$remove($scope.cards.$indexFor(contents[i]));
                delete $scope.contents[$scope.activelist];
                $scope.contents.$save();
            }

            ind = list.$indexFor($scope.activelist);
            list.$remove(ind).then(function (ref) {
                for (var j = ind; j < list.length; j++)
                    list.$ref().child(list.$keyAt(j)).setPriority(j+1);
                if (list[ind])
                    $scope.activelist = list[ind].$id
                else if (list[ind - 1])
                    $scope.activelist = list[ind - 1].$id
                else $scope.activelist = null;
            });
        }

}]);
