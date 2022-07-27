// finite state machine

const machine = {
    state: "SOBER", // initial state (start)
    
    // list potensial state 
    transitions: {
        SOBER: { 
            // jika sober maka actionnya drink (one method one action)
            drink: function(beverage, second) {
                
            }
        },
        DRUNK: {

        },
        REALLYDRUNK: {

        },
        ASLEEP: {

        },
        HUNGOVERR: {

        }
    }

}