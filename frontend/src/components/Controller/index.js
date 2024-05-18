import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./index.css";

const SOCKET_SERVER_URL = process.env.NODE_ENV === "production" ? "https://rodel.onrender.com" : "http://localhost:8000";

export default function Controller() {
  const [socket, setSocket] = useState(null);
  const [gamepad, setGamepad] = useState(null);
  const [status, setStatus] = useState(null);
  const [time, setTime] = useState(null)
  const [lapsed, setLasped] = useState(null)

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server:", newSocket.id);
      newSocket.emit("join room", {room:1});
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    newSocket.on("receive button press", (currentGamepad) => {
    //   console.log("Received button press data:", currentGamepad);
    setLasped(Date.now() - time / 1000)
      setStatus("Receiving");
      handleButtons(currentGamepad.buttons);
      handleSticks(currentGamepad.axes);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (gamepad) {
      setStatus("Sending");
      window.requestAnimationFrame(sendButtonPress);
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

  const sendButtonPress = () => {
    const currentGamepad = window.navigator.getGamepads()[0];
    if (currentGamepad) {
      const state = {
        id: currentGamepad.id,
        buttons: currentGamepad.buttons.map((button) => ({
          pressed: button.pressed,
          touched: button.touched,
          value: button.value,
        })),
        axes: currentGamepad.axes,
      };
      setTime(Date.now())
      socket.emit("send button press", state);
      window.requestAnimationFrame(sendButtonPress);
    }
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

  return (
    <div>
      <h1>{status}</h1>
      {lapsed}
    </div>
  );
}
