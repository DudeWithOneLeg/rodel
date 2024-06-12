import React, { useRef, useEffect, useState } from "react";
import Peer from "peerjs";

const Streaming = ({ socket }) => {
  const [peerId, setPeerId] = useState(null);
  const [conn, setConn] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const peer = new Peer("react-receiver");

    peer.on("open", (id) => {
      setPeerId(id);
      console.log("My peer ID is:", id);
      socket.emit("register", id);
    });

    peer.on("connection", (connection) => {
      setConn(connection);
      connection.on("data", (data) => {
        console.log("Received:", data);
      });
    });

    peer.on("call", (call) => {
      call.answer();
      call.on("stream", (remoteStream) => {
        videoRef.current.srcObject = remoteStream;
      });
    });

    if (socket) {
      socket.on("signal", async ({ peerId: senderId, payload }) => {
        if (payload.type === "offer") {
          const call = peer.call(senderId, new MediaStream());
          call.on("stream", (remoteStream) => {
            videoRef.current.srcObject = remoteStream;
          });
          console.log(peer._connections)
          if (peer._connections) {
            await peer.peerConnection.setRemoteDescription(payload);
            console.log('this hit')
        }

        } else if (payload.type === "ice") {

          await peer.peerConnection[senderId][0].addIceCandidate(
            payload
          );
        }
      });
    }

    return () => {
      peer.destroy();
      socket.close();
    };
  }, [socket]);

  return (
    <div>
      <div>
        <video ref={videoRef} autoPlay muted style={{ width: "300px" }}></video>
      </div>
    </div>
  );
};

export default Streaming;
