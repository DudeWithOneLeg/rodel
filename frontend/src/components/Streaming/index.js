import React, { useRef, useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as sessionActions from '../../store/session.js';

const Streaming = ({ socket }) => {
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [iceServers, setIceServers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [roomId, setRoomId] = useState("");
  const dispatch = useDispatch();
  const user = useSelector(state => state.session.user);
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then((deviceInfos) => {
        const videoDevices = deviceInfos.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      })
      .catch((error) => {
        console.error('Error fetching media devices.', error);
      });
  }, []);
  useEffect(() => {
    if (user) {
      console.log('Getting token');
      dispatch(sessionActions.getAuthToken(user.id))
        .then(token => {
          token = JSON.parse(token)
          console.log(token.iceServers)
          if (token && token.iceServers) {
            console.log('Received ICE servers:', token.iceServers);
            setIceServers(token.iceServers);
          } else {
            console.error('No ICE servers received in the token');
          }
        })
        .catch(error => console.error('Error getting token:', error));
    }
  }, [dispatch, user]);

  const initializePeerConnection = useCallback(() => {
    if (!peerConnectionRef.current) {
      console.log('Initializing PeerConnection with ICE servers:', iceServers);
      const configuration = {
        iceServers: iceServers,
        iceCandidatePoolSize: 10,
      };
      console.log(configuration)
      peerConnectionRef.current = new RTCPeerConnection(configuration);
      console.log('PeerConnection created:', peerConnectionRef.current);

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate, roomId });
          // console.log('ICE candidate sent:', event.candidate);
        }
      };

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteStreamRef.current) {
          remoteStreamRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnectionRef.current.iceConnectionState);
      };
    }
  }, [roomId, socket, iceServers]);

  const createOffer = useCallback(async () => {
    console.log('Creating offer...');
    if (peerConnectionRef.current) {
      try {
        const offer = await peerConnectionRef.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit('offer', { offer: peerConnectionRef.current.localDescription, roomId });
        console.log('Offer created and sent:', peerConnectionRef.current.localDescription);
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    } else {
      console.error('PeerConnection not initialized');
    }
  }, [roomId, socket]);

  const handleOffer = useCallback(async (offer) => {
    console.log('Received offer:', offer);
    if (!peerConnectionRef.current) {
      console.error('PeerConnection not initialized when receiving offer');
      return;
    }
    try {
      const offerDescription = new RTCSessionDescription(offer);
      await peerConnectionRef.current.setRemoteDescription(offerDescription);

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      // Add buffered ICE candidates
      while (iceCandidatesBuffer.current.length > 0) {
        const candidate = iceCandidatesBuffer.current.shift();
        await peerConnectionRef.current.addIceCandidate(candidate);
      }

      socket.emit('answer', { answer: peerConnectionRef.current.localDescription, roomId });
      console.log('Answer created and sent:', peerConnectionRef.current.localDescription);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [roomId, socket]);

  const handleAnswer = useCallback(async (answer) => {
    console.log('Received answer:', answer);
    if (!peerConnectionRef.current) {
      console.error('PeerConnection not initialized when receiving answer');
      return;
    }
    try {
      const answerDescription = new RTCSessionDescription(answer);
      await peerConnectionRef.current.setRemoteDescription(answerDescription);
    } catch (error) {
      console.error('Error setting remote description:', error);
    }
  }, []);

  const iceCandidatesBuffer = useRef([]);

const handleIceCandidate = useCallback(async (candidate) => {
  if (!peerConnectionRef.current) {
    console.error('PeerConnection not initialized when receiving ICE candidate');
    return;
  }

  if (!peerConnectionRef.current.remoteDescription || !peerConnectionRef.current.remoteDescription.type) {
    iceCandidatesBuffer.current.push(candidate);
    console.log('Buffering ICE candidate:', candidate);
  } else {
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('ICE candidate added:', candidate);
    } catch (e) {
      console.error('Error adding received ICE candidate', e);
    }
  }
}, []);

  useEffect(() => {
    if (!selectedDeviceId || !roomId || iceServers.length === 0) return;

    socket.emit('join-room', roomId);
    console.log(`Joined room: ${roomId}`);

    initializePeerConnection();

    navigator.mediaDevices.getUserMedia({ video: { deviceId: selectedDeviceId }, audio: true })
      .then((stream) => {
        localStreamRef.current.srcObject = stream;

        stream.getTracks().forEach(track => {
          peerConnectionRef.current.addTrack(track, stream);
        });
      })
      .catch((error) => {
        console.error('Error accessing media devices.', error);
      });

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('create-offer', createOffer);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('create-offer', createOffer);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [selectedDeviceId, roomId, socket, createOffer, initializePeerConnection, handleOffer, handleAnswer, handleIceCandidate, iceServers]);

  return (
    <div>
      <h1>WebRTC Client</h1>
      <div>
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <select onChange={(e) => setSelectedDeviceId(e.target.value)} value={selectedDeviceId}>
          {devices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId}`}
            </option>
          ))}
        </select>
        <video ref={localStreamRef} autoPlay playsInline muted />
        <video ref={remoteStreamRef} autoPlay playsInline />
      </div>
    </div>
  );
};

export default Streaming;
