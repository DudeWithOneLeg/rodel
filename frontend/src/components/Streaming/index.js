import React, { useRef, useEffect, useState } from "react";

const Streaming = ({ socket }) => {
    const localVideoRef = useRef(null);
    const peerConnection = useRef(null);

  useEffect(() => {
    socket.on('offer', async (offer) => {
        peerConnection.current = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', {
                  candidate: event.candidate.candidate,
                  sdpMid: event.candidate.sdpMid,
                  sdpMLineIndex: event.candidate.sdpMLineIndex,
              });
            }
        };

        peerConnection.current.ontrack = (event) => {
            localVideoRef.current.srcObject = event.streams[0];
        };

        peerConnection.current.addTransceiver('video', { direction: 'recvonly' });

        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit('answer', peerConnection.current.localDescription);
    });

    socket.on('candidate', async (candidate) => {
        try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    });

    return () => {
      peerConnection.current.close()
      socket.close();
    };
  }, [socket]);

  return (
    <div>
      <div>
        <video ref={localVideoRef} autoPlay muted style={{ width: "300px" }}></video>
      </div>
    </div>
  );
};

export default Streaming;
