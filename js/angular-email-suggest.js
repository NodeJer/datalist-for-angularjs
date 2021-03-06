
angular.module('datalist', []).

run(function($rootScope){

	$rootScope.datalistScopes = {};

}).

filter('emailFilter', function(){
    return function(obj){
            
        if(!obj) return obj;

        var index = obj.indexOf('@');

        if(index != -1){
            var str = obj.substr(0, index);

            return str;
        }

        return obj;
    }
}).

factory('offset', function(){
	return function(element, parentWin){
		if(parentWin === window || parentWin === document){
			parentWin = document.body;
		}

		var offsetTop = element.offsetTop;
		var offsetLeft = element.offsetLeft;

		var offset = {
			top: offsetTop,
			left: offsetLeft
		};
		while(element.offsetParent && element.offsetParent !== parentWin){
			offset.top+=element.offsetParent.offsetTop;
			offset.left+=element.offsetParent.offsetLeft;
		}

		return offset;
		
	}
}).


directive('datalist', function($rootScope, $document){
	
	return {
		scope:{
			id: '@'
		},
		controller: function($scope, $element, $attrs, $transclude) {

    		$scope.options = [];

    		$scope.$elements = $element;

    		this.$scope = $scope;

    		$rootScope.datalistScopes[$scope.id] = $scope;
		},
		restrict: 'AE',
		template: '<div class="datalist" ng-show="display" ng-transclude></div>',
		replace: true,
		transclude: true,
		link: function($scope, $elements, $attrs, controller) {
		}
	};
}).

directive('option', function(){
	return {
		scope: {
			value: '@'
		},
		controller: function($scope, $element, $attrs, $transclude) {
		},
		require: '^datalist',
		restrict: 'AE',
		template: '<div class="option" ng-show="display" ng-class="{selected: selected}">{{value}}</div>',
		replace: true,
		link: function($scope, $element, iAttrs, datalist) {

			$element.on('click', function(){
				datalist.$scope.$emit('update', $scope);
			});

			datalist.$scope.options.push($scope);
		}
	};
}).

directive('list', function($interval, $timeout, $rootScope, offset){
	
	return {
		scope: {
			list: '@'
		},
		require: 'ngModel',
		controller: function($scope, $element, $attrs, $transclude) {

		},
		link: function($scope, $elements, $attrs, ngModel) {
			if($attrs.nextfocus){
				$scope.oNextFocus = document.getElementById($attrs.nextfocus);
			}
			
			var index = -1;
			var datalistScope;
			var timer = $interval(function(){
				//输入框对应的datalist scope
				datalistScope = $scope.datalistScopes = $rootScope.datalistScopes[$scope.list];

				if(datalistScope){
					$interval.cancel(timer);

					datalistScope.$on('update', function(ev, scope){
						ev.preventDefault();
						selectCurrentScope(scope);
						update();
					});

					

					$elements.on('keydown', function(ev){
						
						if(ev.keyCode === 13){
							update();
						}

						if(ev.keyCode != 38 && ev.keyCode != 40)return;

						//上
						if( ev.keyCode === 38){
							index = (index-1+$scope.result.selected.length) % $scope.result.selected.length;
						}
						//下
						else if(ev.keyCode === 40){
							index = (index+1) % $scope.result.selected.length;
						}
						
						if(index > -1){
							selectCurrentScope($scope.result.selected[index]);
						}
					});

					$elements.on('blur', function(){
						$timeout(function(){
							datalistScope.display = false;
						}, 100);
					});

					$elements.on('keyup change', function(ev){

						if(ev.keyCode === 13)return;

						//找到与输入框值匹配的option scope 以及没有匹配到的
						var result = $scope.result = find(this.value, datalistScope.options);
						
						setPosition();

						//没有匹配到隐藏datalist
						datalistScope.$apply(function(){
							if(!result.selected.length){
								datalistScope.display = false;
							}
							else{
								datalistScope.display = true;
							}
						});

						//匹配的显示
						angular.forEach(result.selected, function(scope){
							scope.$apply(function(){
								scope.display = true;
							});
						});
						//没有匹配的隐藏
						angular.forEach(result.noSelected, function(scope){
							scope.$apply(function(){
								scope.display = false;
							});
						});
					});
				}
			}, 30);

			angular.element(window).on('resize', function(){
				setPosition();
			});

			function setPosition(){
				//获取输入框的在窗口的位置
				var offsetPos = offset($elements[0], window);


				//设置datalist的position和minwidth
				datalistScope.$elements.css({
					minWidth: $elements[0].offsetWidth+'px',
					left: offsetPos.left+'px',
					top: offsetPos.top+$elements[0].offsetHeight+'px'
				});
			}

			function selectCurrentScope(selectedScope){
				$scope.selectedScope = selectedScope;

				//设置所有option为隐藏状态
				angular.forEach($scope.datalistScopes.options, function(scope){
					scope.$apply(function(){
						scope.selected = false;
					});
				});
				//设置当前选中option为显示状态
				selectedScope.$apply(function(){
					selectedScope.selected = true;
				});
			}

			function update(){
				ngModel.$setViewValue($scope.selectedScope.value);
				ngModel.$render();

				$scope.datalistScopes.$apply(function(){
					$scope.datalistScopes.display = false;
					
				});
				$scope.selectedScope.$apply(function(){
					$scope.selectedScope.selected = false;
				});
				
				index = -1;
				if($scope.oNextFocus)
					$scope.oNextFocus.focus();
			}

			function find(model, scopes){
				var result = {
					selected: [],
					noSelected: []
				};

				model = model.toLowerCase();

				if(!model){
					return result;
				}

				angular.forEach(scopes, function(scope){
					
					var counter = 0;
					var str = scope.value.toLowerCase();

					for(var i=0; i<model.length; i++){
						
						if( str[i] == model[i] ){
							++counter;
						}
					}

					if(counter === model.length){
						result.selected.push(scope);
					}
					else{
						result.noSelected.push(scope);
					}
				});

				return result;
			}
		}
	};
});