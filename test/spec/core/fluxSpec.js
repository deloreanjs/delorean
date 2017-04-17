describe('Flux', function () {

  var initializeSpy = jasmine.createSpy('construction');
  var listenerSpy = jasmine.createSpy('change');
  var listenerSpy2 = jasmine.createSpy('change');
  var calculateSpy = jasmine.createSpy('calculate');

  var myStore = DeLorean.Flux.createStore({
    state: {
      list: [],
      text: ''
    },
    initialize: initializeSpy,
    actions: {
      // Remember the `dispatch('addItem')`
      addItem: 'addItemMethod',
      noChange: 'noChangeEvent'
    },
    addItemMethod: function (data) {
      this.state.list.push('ITEM: ' + data.random);

      // You need to say your store is changed.
      this.emit('change');
    },
    noChangeEvent: function (data) {
      this.state.text = data;
    }
  });

  var myStore2 = DeLorean.Flux.createStore({
    state: {
      list: []
    },
    initialize: initializeSpy,
    actions: {
      // Remember the `dispatch('addItem')`
      addItem: 'addItemMethod'
    },
    addItemMethod: function (data) {
      this.state.list.push('ANOTHER: ' + data.random);

      // You need to say your store is changed.
      this.emit('change');
    }
  });

  var MyAppDispatcher = DeLorean.Flux.createDispatcher({
    addItem: function (data) {
      this.dispatch('addItem', data);
    },

    getStores: function () {
      return {
        myStore: myStore,
        myStore2: myStore2
      };
    }
  });

  var ActionCreator = {
    addItem: function () {
      // We'll going to call dispatcher methods.
      MyAppDispatcher.addItem({random: 'hello world'});
    }
  };

  myStore.onChange(listenerSpy);
  myStore2.onChange(listenerSpy2);
  ActionCreator.addItem();

  it('store should be initialized', function () {
    expect(initializeSpy).toHaveBeenCalled();
  });

  it('should call run action creator', function () {
    expect(listenerSpy).toHaveBeenCalled();
    expect(listenerSpy2).toHaveBeenCalled();
  });

  it('should change data', function () {
    expect(myStore.getState().list.length).toBe(1);
    expect(myStore2.getState().list.length).toBe(1);

    ActionCreator.addItem();
    expect(myStore.getState().list.length).toBe(2);
    expect(myStore2.getState().list.length).toBe(2);

    expect(myStore.getState().list[0]).toBe('ITEM: hello world');
    expect(myStore2.getState().list[0]).toBe('ANOTHER: hello world');
  });

  it('should clear data', function () {
    myStore.clearState();
    expect(myStore.getState()).toEqual({});
  });

  it('should cleanup unused events after firing an action handler', function () {
    MyAppDispatcher.dispatch('noChange', 'someText');
    MyAppDispatcher.dispatch('noChange', 'someText');
    MyAppDispatcher.dispatch('noChange', 'someText');
    MyAppDispatcher.dispatch('noChange', 'someText');
    changeListenerCount = myStore.listener.listeners('change').length;
    rollbackListenerCount = myStore.listener.listeners('rollback').length;
    // Note that the 'cleanup_{actionName}' event has not fired yet and removed the last 2 events (change & rolback), so there will be one remaining of each event at this point.
    // however, without the cleanup, there would be 4 of each after 4 calls
    expect(changeListenerCount).toEqual(1);
    expect(rollbackListenerCount).toEqual(1);
  });

  it('dispatcher can listen events', function () {
    var spy = jasmine.createSpy('dispatcher listener');
    MyAppDispatcher.on('hello', spy);
    MyAppDispatcher.listener.emit('hello');
    expect(spy).toHaveBeenCalled();
  });

  it('dispatcher can listen events', function () {
    var spy = jasmine.createSpy('dispatcher listener');
    MyAppDispatcher.on('hello', spy);
    MyAppDispatcher.off('hello', spy);
    MyAppDispatcher.listener.emit('hello');

    expect(spy).not.toHaveBeenCalled();
  });

  // The storeConfig is declared without the 'default' values set in
  // order to declare them with ['square bracket'] notation -
  // which will enable this test to be run in IE8. (IE8 considers 'default'
  // to be a reserved keyword)
  var storeConfig = {
    actions: {},
    scheme: {
      greeting: 'hello',
      place: {},
      otherPlace: 'outerspace',
      greetPlace: {
        deps: ['greeting', 'place'],
        calculate: function (value) {
          return value.toUpperCase() + ' ' + this.state.greeting + ', ' + this.state.place;
        }
      },
      parsedValue: function (value) {
        return {
          a: value.b,
          b: value.a
        };
      },
      randomProp: 'random',
      anotherCalculated: {
        deps: ['randomProp'],
        calculate: calculateSpy
      },
      dependentOnCalculated: {
        deps: ['greetPlace'],
        calculate: function () {
          return this.state.greetPlace;
        }
      },
      objectDefault: {}
    }
  };

  storeConfig.scheme.place['default'] = 'world';
  storeConfig.scheme.greetPlace['default'] = 'hey';
  storeConfig.scheme.anotherCalculated['default'] = null;
  storeConfig.scheme.objectDefault['default'] = { name: 'Test default objects get cloned'};

  var myStoreWithScheme = DeLorean.Flux.createStore(storeConfig);

  describe('scheme', function () {
    it('should cause default and calculated scheme properties to be created on instantiation', function () {
      expect(myStoreWithScheme.getState().greeting).toBe('hello');
      expect(myStoreWithScheme.getState().place).toBe('world');
      expect(myStoreWithScheme.getState().greetPlace).toBe('HEY hello, world');
    });

    it('should clone defaults that are objects, rather than applying them directly', function () {
      expect(myStoreWithScheme.scheme.objectDefault['default']).not.toBe(myStoreWithScheme.getState().objectDefault);
    });

    it('should re-calculate scheme properties with #calculate and deps defined', function () {
      myStoreWithScheme.set('greeting', 'goodbye');
      expect(myStoreWithScheme.getState().greetPlace).toBe('HEY goodbye, world');
    });

    it('should set scheme set scheme properties that are functions to the return value', function () {
      var input = {
        a: 'a',
        b: 'b'
      };
      myStoreWithScheme.set('parsedValue', input);
      expect(myStoreWithScheme.getState().parsedValue.a).toBe(input.b);
    });

    it('should be able to accept an object when setting scheme', function () {
      myStoreWithScheme.set({
        greeting: 'aloha',
        place: 'Hawaii'
      });
      expect(myStoreWithScheme.getState().greeting).toBe('aloha');
      expect(myStoreWithScheme.getState().place).toBe('Hawaii');
      expect(myStoreWithScheme.getState().greetPlace).toBe('HEY aloha, Hawaii');
    });

    it('should call calculate only in instantiation and when a dependency is set', function () {
      expect(calculateSpy.calls.length).toBe(1); // should have been called once on intantiation
      myStoreWithScheme.set('otherPlace', 'hey');
      expect(calculateSpy.calls.length).toBe(1); // should not have been called again, because otherPlace is not a dep
    });

    it('should allow setting calculated properties directly', function () {
      myStoreWithScheme.set('greetPlace', 'Ahoy');
      expect(myStoreWithScheme.getState().greetPlace).toBe('AHOY aloha, Hawaii');
    });

    it('should allow a calculated property to be dependent on another calculated property', function () {
      myStoreWithScheme.set({
        greeting: 'hola',
        place: 'Spain'
      });
      expect(myStoreWithScheme.getState().dependentOnCalculated).toBe('AHOY hola, Spain');
    });
  });
});
