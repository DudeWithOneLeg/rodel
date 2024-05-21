
    import React, { useState, useEffect } from "react";
    import { useDispatch } from "react-redux";
    import { Route, Switch } from "react-router-dom";
    import LoginFormPage from "./components/LoginFormPage";
    import SignupFormPage from "./components/SignupFormPage";
    import * as sessionActions from "./store/session";
    import Navigation from "./components/Navigation";
    import Controller from "./components/Controller";
    import Streaming from "./components/Streaming";

    function App() {
      const dispatch = useDispatch();
      const [isLoaded, setIsLoaded] = useState(false);
      useEffect(() => {
        dispatch(sessionActions.restoreUser()).then(() => setIsLoaded(true));
      }, [dispatch]);

      return (
        <>
          <Navigation isLoaded={isLoaded} />
          <Controller />
          <Streaming />
          {isLoaded && (
            <Switch>
              <Route path="/login">
                <LoginFormPage />
              </Route>
              <Route path="/signup">
                <SignupFormPage />
              </Route>
            </Switch>
          )}
        </>
      );
    }

    export default App;
