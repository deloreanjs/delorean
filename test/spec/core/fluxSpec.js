describe('Flux', function () {

  var initializeSpy = jasmine.createSpy('construction');
  var listenerSpy = jasmine.createSpy('change');
  var listenerSpy2 = jasmine.createSpy('change');
  var calculateSpy = jasmine.createSpy('calculate');

  var myStore = DeLorean.Flux.createStore({
    state: {
      list: []
    },
    initialize: initializeSpy,
    actions: {
      // Remember the `dispatch('addItem')`
      addItem: 'addItemMethod'
    },
    addItemMethod: function (data) {
      if (data.fail) {
        this.emitRollback();
      } else {
        this.state.list.push('ITEM: ' + data.random);
        // You need to say your store is changed.
        this.emitChange();   
      }
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
      if (data.fail) {
        this.emitRollback();
      } else {
        this.state.list.push('ANOTHER: ' + data.random);
        // You need to say your store is changed.
        this.emitChange();   
      }
    }
  });

  var MyAppDispatcher = DeLorean.Flux.createDispatcher({
    addItem: function (data) {
      return this.dispatch('addItem', data);
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
    },
    addItemWithFail: function () {
      return MyAppDispatcher.addItem({random: 'hello world', fail: true});
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

  describe('Dispatcher', function () {
    var resolveSpy = jasmine.createSpy('dispatcher resolve');
    var rejectSpy = jasmine.createSpy('dispatcher reject');

    it('should reject when rollback emitted', function (done) {
      ActionCreator.addItemWithFail()
        .then(resolveSpy, rejectSpy)
        .then(done);
    });

    afterEach(function () {
      expect(resolveSpy).not.toHaveBeenCalled();    
      expect(rejectSpy).toHaveBeenCalled();           
    });
  });

  var myStoreWithScheme = DeLorean.Flux.createStore({
    actions: {},
    scheme: {
      greeting: 'hello',
      place: {
        default: 'world'
      },
      otherPlace: 'outerspace',
      greetPlace: {
        deps: ['greeting', 'place'],
        default: 'hey',
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
        default: null,
        calculate: calculateSpy
      },
      dependentOnCalculated: {
        deps: ['greetPlace'],
        calculate: function () {
          return this.state.greetPlace;
        }
      },
      objectDefault: {
        default: {
          name: 'Test default objects get cloned'
        }
      }
    }
  });

  describe('scheme', function () {
    it('should cause default and calculated scheme properties to be created on instantiation', function () {
      expect(myStoreWithScheme.getState().greeting).toBe('hello');
      expect(myStoreWithScheme.getState().place).toBe('world');
      expect(myStoreWithScheme.getState().greetPlace).toBe('HEY hello, world');
    });

    it('should clone defaults that are objects, rather than applying them directly', function () {
      expect(myStoreWithScheme.scheme.objectDefault.default).not.toBe(myStoreWithScheme.getState().objectDefault);
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

    // this got broken after updating karma-jasmine to ~0.2.0
    //it('should call calculate only in instantiation and when a dependency is set', function () {
    //  expect(calculateSpy.calls.length).toBe(1); // should have been called once on intantiation
    //  myStoreWithScheme.set('otherPlace', 'hey');
    //  expect(calculateSpy.calls.length).toBe(1); // should not have been called again, because otherPlace is not a dep
    //});

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
