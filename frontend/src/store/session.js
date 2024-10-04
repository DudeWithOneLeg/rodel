
  import { csrfFetch } from "./csrf";

  const SET_USER = "session/setUser";
  const REMOVE_USER = "session/removeUser";
  const GET_AUTH_TOKEN = "session/getAuthToken";

  const setUser = (user) => {
    return {
      type: SET_USER,
      payload: user,
    };
  };

  const setAuthToken = () => {
    return {
      type: GET_AUTH_TOKEN,
    };
  };

  const removeUser = () => {
    return {
      type: REMOVE_USER,
    };
  };

  export const login = (user) => async (dispatch) => {
    const { credential, password } = user;
    const response = await csrfFetch("/api/session", {
      method: "POST",
      body: JSON.stringify({
        credential,
        password,
      }),
    });
    const data = await response.json();
    dispatch(setUser(data.user));
    return response;
  };

  export const restoreUser = () => async (dispatch) => {
    const response = await csrfFetch("/api/session");
    const data = await response.json();
    dispatch(setUser(data.user));
    return response;
  };

  export const getAuthToken = (id) => async (dispatch) => {
    const body = {
      identity: id,
      room: 'command'
    };
    try {
      const response = await csrfFetch('/api/twilio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const data = await response.text();
        console.log('Received token:', data);
        dispatch(setAuthToken(data));
        return data;
      }
    } catch (error) {
      console.error('Error fetching auth token:', error);
    }
  };

  export const signup = (user) => async (dispatch) => {
    const { username, firstName, lastName, email, password } = user;
    const response = await csrfFetch("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username,
        firstName,
        lastName,
        email,
        password,
      }),
    });
    const data = await response.json();
    dispatch(setUser(data.user));
    return response;
  };

  export const logout = () => async (dispatch) => {
    const response = await csrfFetch('/api/session', {
      method: 'DELETE',
    });
    dispatch(removeUser());
    return response;
  };

  const initialState = { user: null };

  const sessionReducer = (state = initialState, action) => {
    let newState;
    switch (action.type) {
      case SET_USER:
        newState = Object.assign({}, state);
        newState.user = action.payload;
        return newState;
      case REMOVE_USER:
        newState = Object.assign({}, state);
        newState.user = null;
        return newState;
      default:
        return state;
    }
  };

  export default sessionReducer;
