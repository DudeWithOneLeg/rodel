import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./index.css";

const SOCKET_SERVER_URL = process.env.NODE_ENV === "production" ? "https://rodel.onrender.com" : "http://localhost:8000";

export default function Controller() {
  const [socket, setSocket] = useState(null);
  const [gamepad, setGamepad] = useState(null);
  const [status, setStatus] = useState(null);
  const [sentTimestamp, setSentTimestamp] = useState(null);
  const previousButtonState = useRef(null); // Ref to store the previous button state
  const [lapsed, setLapsed] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server:", newSocket.id);
      newSocket.emit("join room", {room: 1});
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    newSocket.on("receive button press", (data) => {
      const receiveTimestamp = performance.now();
      const timeElapsed = (receiveTimestamp - sentTimestamp) /1000;

    //   console.log(`Received: ${receiveTimestamp} ms`);
    //   console.log("Sent:", sentTimestamp);

      setStatus(`Received: ${timeElapsed} ms`);
      setSentTimestamp(performance.now())
      handleButtons(data.buttons);
      handleSticks(data.axes);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (gamepad) {
      window.requestAnimationFrame(checkGamepadState);
    }
  }, [gamepad]);

  useEffect(() => {
    const handleGamepadConnected = (e) => {
      console.log("Gamepad connected:", e.gamepad);
      setGamepad(e.gamepad);
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
    };
  }, []);

  const checkGamepadState = () => {
    const currentGamepad = window.navigator.getGamepads()[0];
    if (currentGamepad) {
      const currentState = {
        id: currentGamepad.id,
        buttons: currentGamepad.buttons.map((button) => ({
          pressed: button.pressed,
          touched: button.touched,
          value: button.value,
        })),
        axes: currentGamepad.axes,
      };

      if (hasButtonStateChanged(currentState.buttons, currentState.axes)) {
        setSentTimestamp(performance.now())
        // console.log('state changed', (performance.now() - sentTimestamp) / 1000)

    }
    socket.emit("send button press", currentState);

      previousButtonState.current = currentState;
      window.requestAnimationFrame(checkGamepadState);
    }
  };

  const hasButtonStateChanged = (currentButtons, currentAxes) => {
    if (!previousButtonState.current) {
      return true; // Initial state
    }

    for (let i = 0; i < currentButtons.length; i++) {
      if (
        currentButtons[i].pressed !== previousButtonState.current[i].pressed ||
        currentButtons[i].touched !== previousButtonState.current[i].touched ||
        currentButtons[i].value !== previousButtonState.current[i].value
      ) {
        return true;
      }
    }
    for (let i = 0; i < currentAxes.length; i++) {
      if (
        currentAxes[i] !== previousButtonState.current.axes[i]
      ) {
        return true;
      }
    }

    return false;
  };

  const handleButtons = (buttons) => {
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const buttonElement = document.getElementById(`controller-b${i}`);
      const selectedButtonClass = "selected-button";

      if (buttonElement) {
        if (button.value > 0) {
          buttonElement.classList.add(selectedButtonClass);
          buttonElement.style.filter = `contrast(${button.value * 150}%)`;
        } else {
          buttonElement.classList.remove(selectedButtonClass);
          buttonElement.style.filter = `contrast(100%)`;
        }
      }
    }
  };

  const updateStick = (elementId, leftRightAxis, upDownAxis) => {
    const multiplier = 25;
    const stickLeftRight = leftRightAxis * multiplier;
    const stickUpDown = upDownAxis * multiplier;
    const stick = document.getElementById(elementId);

    if (stick) {
      const x = Number(stick.dataset.originalXPosition);
      const y = Number(stick.dataset.originalYPosition);
      stick.setAttribute("cx", x + stickLeftRight);
      stick.setAttribute("cy", y + stickUpDown);
    }
  };

  const handleSticks = (axes) => {
    updateStick("controller-b10", axes[0], axes[1]);
    updateStick("controller-b11", axes[2], axes[3]);
  };
  useEffect(() => {setLapsed((performance.now() - sentTimestamp) / 1000)},[sentTimestamp])

  return (
    <div>
      <h1>{lapsed && lapsed.toFixed(3)}</h1>
      {/* {lapsed} */}
    </div>
  );
}
