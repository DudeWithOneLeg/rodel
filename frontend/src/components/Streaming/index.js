import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const Streaming = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    const SOCKET_SERVER_URL = process.env.NODE_ENV === "production" ? "https://rodel.onrender.com" : "http://localhost:8000";
    socketRef.current = io(SOCKET_SERVER_URL);

    socketRef.current.on('offer', handleReceiveOffer);
    socketRef.current.on('answer', handleReceiveAnswer);
    socketRef.current.on('ice-candidate', handleReceiveIceCandidate);

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const handleReceiveOffer = async (offer) => {
    peerConnectionRef.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', event.candidate);
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);
    socketRef.current.emit('answer', answer);
  };

  const handleReceiveAnswer = async (answer) => {
    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleReceiveIceCandidate = async (candidate) => {
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('Error adding received ice candidate', e);
    }
  };

  const startStreaming = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    localVideoRef.current.srcObject = stream;

    peerConnectionRef.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    stream.getTracks().forEach((track) => {
      peerConnectionRef.current.addTrack(track, stream);
    });

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', event.candidate);
      }
    };

    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    socketRef.current.emit('offer', offer);

    setIsStreaming(true);
  };

  return (
    <div>
      <h1>One-Way Video Streaming</h1>
      <video ref={localVideoRef} autoPlay muted style={{ width: '300px' }}></video>
      <video ref={remoteVideoRef} autoPlay style={{ width: '300px' }}></video>
      {!isStreaming && (
        <button onClick={startStreaming}>Start Streaming</button>
      )}
    </div>
  );
};

export default Streaming;
