import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./index.css";

export default function Controller() {
//   const socket = io("http://localhost:8000");
const socket = io("http://rodel.onrender.com");
  const [gamepad, setGamepad] = useState(null);
  const [status, setStatus] = useState(null);

  // const [leftStick, setLeftStick] = useState(null)

  function handleButtons(buttons) {
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const buttonElement = window.document.getElementById(`controller-b${i}`);
      const selectedButtonClass = "selected-button";

      if (buttonElement) {
        console.log(buttonElement);
        if (button.value > 0) {
          buttonElement.classList.add(selectedButtonClass);
          buttonElement.style.filter = `contrast(${button.value * 150}%)`;
        } else {
          buttonElement.classList.remove(selectedButtonClass);
          buttonElement.style.filter = `contrast(100%)`;
        }
      }
    }
  }

  function updateStick(elementId, leftRightAxis, upDownAxis) {
    const multiplier = 25;
    const stickLeftRight = leftRightAxis * multiplier;
    const stickUpDown = upDownAxis * multiplier;

    const stick = window.document.getElementById(elementId);
    const x = Number(stick.dataset.originalXPosition);
    const y = Number(stick.dataset.originalYPosition);

    stick.setAttribute("cx", x + stickLeftRight);
    stick.setAttribute("cy", y + stickUpDown);
  }

  function handleSticks(axes) {
    console.log("axes");
    updateStick("controller-b10", axes[0], axes[1]);
    updateStick("controller-b11", axes[2], axes[3]);
  }

  const sendButtonPress = () => {
    const currentGamepad = window.navigator.getGamepads()[0];
    const state = {
      id: currentGamepad.id,
      buttons: currentGamepad.buttons.map((button) => {
        return {
          pressed: button.pressed,
          touched: button.touched,
          value: button.value,
        };
      }),
      axes: currentGamepad.axes,
    };
    //   console.log('Emitting gamepad state:', state);
    //   socket.emit('gamepadState', state);

    // if (currentGamepad) {
    socket.emit("send button press", state);

    // }
    window.requestAnimationFrame(sendButtonPress);
  };

  const receiveButtonPress = (currentGamepad) => {
    // console.log(currentGamepad);
    handleButtons(currentGamepad.buttons);
    handleSticks(currentGamepad.axes);
  };
    useEffect(() => {

      socket.on("recieve button press", (currentGamepad) => {
          //   console.log(currentGamepad);
        //   if (!gamepad) {
            setStatus("Recieving");
            receiveButtonPress(currentGamepad);
        //   }
        });
    }, []);

  useEffect(() => {
    if (gamepad) {
      setStatus("Sending");
      window.requestAnimationFrame(sendButtonPress);
      setGamepad(window.navigator.getGamepads()[0]);
    }
    else {
    }
  }, [gamepad]);

  window.addEventListener("gamepadconnected", (e) => {
    console.log(
      "Gamepad connected at index %d: %s. %d buttons, %d axes.",
      e.gamepad.index,
      e.gamepad.id,
      e.gamepad.buttons.length,
      e.gamepad.axes.length
    );
    setGamepad(window.navigator.getGamepads()[0]);
    // console.log(window.navigator.getGamepads()[0])
  });

  return <>{status}</>;
}
