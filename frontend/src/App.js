
    import React, { useState, useEffect } from "react";
    import { useDispatch } from "react-redux";
    import { Route, Switch } from "react-router-dom";
    import LoginFormPage from "./components/LoginFormPage";
    import SignupFormPage from "./components/SignupFormPage";
    import * as sessionActions from "./store/session";
    import Navigation from "./components/Navigation";
    import Controller from "./components/Controller";
    import Streaming from "./components/Streaming";
    import {io} from 'socket.io-client'

const SOCKET_SERVER_URL = process.env.NODE_ENV === "production" ? "https://rodel.onrender.com" : "http://localhost:8000";

    function App() {
      const dispatch = useDispatch();
      const [isLoaded, setIsLoaded] = useState(false);
        const [newSocket, setNewSocket] = useState(null)
      useEffect(() => {
        dispatch(sessionActions.restoreUser()).then(() => setIsLoaded(true));
          const socket =io(SOCKET_SERVER_URL)
          setNewSocket(socket)
      }, [dispatch]);

      return (
        <>
          <Navigation isLoaded={isLoaded} />
          <Controller newSocket={newSocket}/>
          <Streaming socket={newSocket}/>
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
